import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { commands, QuickPickItem, Uri, window } from 'vscode';
import {
  Action,
  COMMAND,
  Config,
  Demo,
  getDemosFromConfig,
  InsertTypingMode,
  Slide,
  SlideParser,
  Step,
  VideoExportEvent,
  VideoExportIssue,
  VideoExportRunOptions,
  VideoExportSceneRef,
  WebViewMessages,
} from '@demotime/common';
import { Subscription } from '../models';
import { ContextKeys, General } from '../constants';
import { Preview } from '../preview/Preview';
import {
  formatVideoExportRange,
  getFileContents,
  getReadingSeconds,
  getSlideHoldSeconds,
  getVideoExportStepIssue,
  parseVideoExportRange,
  preflightVideoExport,
  selectVideoExportScenes,
  setContext,
  sleep,
  sortFiles,
  togglePresentationView,
  toWorkspaceRelativePath,
  VIDEO_EXPORT_DEFAULTS,
  VideoExportAct,
  VideoExportScene,
} from '../utils';
import { DemoAutoProceedService } from './DemoAutoProceedService';
import { DemoFileProvider } from './DemoFileProvider';
import { Extension } from './Extension';
import { Logger } from './Logger';
import { Notifications } from './Notifications';

type ResolvedOptions = Required<Omit<VideoExportRunOptions, 'range' | 'eventLogPath'>> & {
  range: string;
  eventLogPath: string;
};

export interface VideoExportResult {
  status: 'completed' | 'cancelled' | 'failed';
  eventLogPath?: string;
  issues: VideoExportIssue[];
  error?: string;
}

/// The environment variable the video CLI sets to the path of a JSON file with
/// `VideoExportRunOptions`. When set, the play runs as soon as the extension is up.
const ENV_OPTIONS_FILE = 'DEMOTIME_VIDEO_EXPORT';
/// Time for the workbench and the Demo Time views to settle before an env-triggered run.
const ENV_START_DELAY_MS = 2000;
/// Time for a slide preview to render and report whether it has a next slide.
const SLIDE_SETTLE_MS = 800;
/// Time to wait for the preview to confirm it moved to the next slide.
const SLIDE_ADVANCE_TIMEOUT_MS = 3000;
/// Guard against a slide that never reports it reached the end.
const MAX_SLIDE_ADVANCES = 500;

/**
 * Runs a play unattended, so it can be recorded as a video, and writes a JSONL event log
 * of when each scene and slide started. The recorder uses the log for its cuts, captions
 * and chapters.
 */
export class VideoExportService {
  private static active = false;
  private static cancelled = false;
  private static options: ResolvedOptions | undefined;
  private static currentScene: VideoExportSceneRef | undefined;
  /** The slide deck the current scene opened, with its variables filled in. */
  private static sceneSlidePath: string | undefined;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(
      commands.registerCommand(COMMAND.runForVideoExport, VideoExportService.runCommand),
    );
    subscriptions.push(commands.registerCommand(COMMAND.stopVideoExport, VideoExportService.stop));

    const optionsFile = process.env[ENV_OPTIONS_FILE];
    if (optionsFile) {
      setTimeout(() => void VideoExportService.runFromFile(optionsFile), ENV_START_DELAY_MS);
    }
  }

  public static isActive(): boolean {
    return VideoExportService.active;
  }

  /**
   * How long a terminal command may run before the next move starts, or `undefined`
   * outside an export.
   */
  public static getTerminalTimeoutMs(): number | undefined {
    if (!VideoExportService.active || !VideoExportService.options) {
      return undefined;
    }
    return VideoExportService.options.terminalTimeoutSeconds * 1000;
  }

  /**
   * Called for every move while an export runs. Returns the move to run (possibly adjusted),
   * or `undefined` when the move is skipped.
   */
  public static async beforeStep(step: Step): Promise<Step | undefined> {
    // Once the run is stopped, the rest of the scene's moves don't run either
    if (VideoExportService.cancelled) {
      return undefined;
    }

    // The move as it runs: variables are filled in and snippets expanded, so this is the
    // deck the preview opens
    if (step.action === Action.OpenSlide && step.path) {
      VideoExportService.sceneSlidePath = step.path;
    }

    const typingMode = Extension.getInstance().getSetting<InsertTypingMode>(
      Config.insert.typingMode,
    );
    const issue = getVideoExportStepIssue(step, typingMode);
    if (!issue) {
      return step;
    }

    await VideoExportService.logIssue(issue);

    if (issue.handling === 'skip') {
      return undefined;
    }
    if (issue.handling === 'auto-continue') {
      await VideoExportService.hold(VideoExportService.options?.pauseSeconds ?? 0);
      return undefined;
    }
    if (issue.handling === 'adjust') {
      return { ...step, insertTypingMode: 'character-by-character' };
    }
    return step;
  }

  /**
   * A terminal without shell integration cannot tell when a command finishes, so the next move
   * may start while the command is still printing.
   */
  public static async warnNoShellIntegration(): Promise<void> {
    await VideoExportService.logIssue({
      action: Action.ExecuteTerminalCommand,
      handling: 'warn',
      reason:
        'The terminal has no shell integration, so the export cannot wait for the command to finish.',
    });
  }

  public static stop(): void {
    if (VideoExportService.active) {
      VideoExportService.cancelled = true;
    }
  }

  /**
   * The command: with options it runs directly (the video CLI's path); without, it asks
   * which part of the play to run.
   */
  private static async runCommand(
    options?: VideoExportRunOptions,
  ): Promise<VideoExportResult | undefined> {
    if (options) {
      return VideoExportService.run(options);
    }

    const acts = await VideoExportService.getActs();
    if (acts.length <= 0) {
      Notifications.error('No acts found to run.');
      return;
    }

    const items: (QuickPickItem & { range: string })[] = [
      { label: 'Whole play', description: `${acts.length} act(s)`, range: 'all' },
      ...acts.map((act, idx) => ({
        label: act.title,
        description: `Act ${idx + 1}`,
        range: `act:${idx + 1}`,
      })),
    ];
    const picked = await window.showQuickPick(items, {
      title: 'Run the play unattended for recording',
      placeHolder: 'Which part of the play do you want to run?',
    });
    if (!picked) {
      return;
    }

    const scenes = selectVideoExportScenes(acts, parseVideoExportRange(picked.range));
    const changed = preflightVideoExport(scenes, VideoExportService.getTypingModeSetting()).filter(
      (issue) => issue.handling !== 'warn',
    );
    if (changed.length > 0) {
      const answer = await Notifications.warning(
        `${changed.length} move(s) run differently when unattended: skipped, continued automatically or typed differently. The event log lists them.`,
        'Run',
        'Cancel',
      );
      if (answer !== 'Run') {
        return;
      }
    }

    const result = await VideoExportService.run({ range: picked.range });
    if (result.eventLogPath) {
      const open = await Notifications.info(`Unattended run ${result.status}.`, 'Open event log');
      if (open === 'Open event log') {
        await window.showTextDocument(Uri.file(result.eventLogPath));
      }
    }
    return result;
  }

  private static async runFromFile(optionsFile: string): Promise<void> {
    let options: VideoExportRunOptions;
    try {
      options = JSON.parse(await readFile(optionsFile, 'utf8'));
    } catch (error) {
      Logger.error(`Video export: cannot read ${optionsFile}: ${(error as Error).message}`);
      return;
    }
    await VideoExportService.run(options);
  }

  /**
   * Runs the scenes in the range one after the other, holds each scene and slide on
   * screen, and logs when each started and ended.
   */
  public static async run(input: VideoExportRunOptions = {}): Promise<VideoExportResult> {
    if (VideoExportService.active) {
      return { status: 'failed', issues: [], error: 'An unattended run is already in progress.' };
    }

    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return { status: 'failed', issues: [], error: 'No workspace folder found.' };
    }

    const options: ResolvedOptions = {
      ...VIDEO_EXPORT_DEFAULTS,
      ...input,
      range: input.range || 'all',
      eventLogPath:
        input.eventLogPath ||
        join(
          workspaceFolder.uri.fsPath,
          General.demoFolder,
          'exports',
          `video-${new Date().toISOString().replace(/[:.]/g, '-')}`,
          'events.jsonl',
        ),
    };

    VideoExportService.options = options;
    VideoExportService.cancelled = false;
    VideoExportService.currentScene = undefined;
    try {
      await mkdir(dirname(options.eventLogPath), { recursive: true });
    } catch (error) {
      const message = `Cannot create the folder for the event log: ${(error as Error).message}`;
      Logger.error(`Video export: ${message}`);
      Notifications.error(message);
      return { status: 'failed', issues: [], error: message };
    }

    let scenes: VideoExportScene[];
    let issues: VideoExportIssue[];
    try {
      const range = parseVideoExportRange(options.range);
      scenes = selectVideoExportScenes(await VideoExportService.getActs(), range);
      issues = preflightVideoExport(scenes, VideoExportService.getTypingModeSetting());
      options.range = formatVideoExportRange(range);
    } catch (error) {
      return VideoExportService.fail(options, [], (error as Error).message);
    }

    if (scenes.length <= 0) {
      return VideoExportService.fail(options, issues, 'The range has no scenes to run.');
    }

    const skipped = issues.filter((issue) => issue.handling === 'skip');
    if (options.strict && skipped.length > 0) {
      for (const issue of skipped) {
        await VideoExportService.log({ type: 'issue', t: Date.now(), issue });
      }
      return VideoExportService.fail(
        options,
        issues,
        `${skipped.length} move(s) cannot be recorded; strict mode stops the export.`,
      );
    }

    VideoExportService.active = true;
    await setContext(ContextKeys.videoExportActive, true);
    let status: VideoExportResult['status'] = 'completed';
    let errorMessage: string | undefined;

    try {
      await VideoExportService.prepare(options);
      await VideoExportService.log({
        type: 'start',
        t: Date.now(),
        version: 1,
        range: options.range,
        sceneCount: scenes.length,
      });
      await VideoExportService.hold(options.leadSeconds);

      for (const scene of scenes) {
        if (VideoExportService.cancelled) {
          break;
        }
        await VideoExportService.runScene(scene, options);
      }

      await VideoExportService.hold(options.leadSeconds);
      status = VideoExportService.cancelled ? 'cancelled' : 'completed';
    } catch (error) {
      status = 'failed';
      errorMessage = (error as Error).message;
      Logger.error(`Video export failed: ${errorMessage}`);
    } finally {
      VideoExportService.currentScene = undefined;
      await VideoExportService.log({ type: 'end', t: Date.now(), status, error: errorMessage });
      await VideoExportService.restore(options);
      // Released last, so another run cannot take over the options and the log before the end
      VideoExportService.active = false;
      await setContext(ContextKeys.videoExportActive, false);
    }

    return { status, eventLogPath: options.eventLogPath, issues, error: errorMessage };
  }

  private static async runScene(scene: VideoExportScene, options: ResolvedOptions) {
    const { demo } = scene;
    const ref: VideoExportSceneRef = {
      actIndex: scene.actIndex,
      actTitle: scene.act.title,
      actFile: scene.act.filePath,
      sceneIndex: scene.sceneIndex,
      sceneTitle: demo.title,
      sceneId: demo.id,
      notesPath: demo.notes?.path
        ? toWorkspaceRelativePath(demo.notes.path, scene.act.version)
        : undefined,
    };
    VideoExportService.currentScene = ref;
    const startedAt = Date.now();
    await VideoExportService.log({ type: 'sceneStart', t: startedAt, ...ref });

    // Notes open beside the editor when `showOnTrigger` is set; keep them out of the video
    // unless asked for. The notes path is in the log either way.
    const demoToRun: Demo = options.showNotes ? demo : { ...demo, notes: undefined };
    VideoExportService.sceneSlidePath = undefined;
    await commands.executeCommand(COMMAND.runStep, {
      filePath: scene.act.filePath,
      idx: scene.sceneIndex,
      demo: demoToRun,
    });

    const slidePath = VideoExportService.sceneSlidePath;
    if (slidePath) {
      await VideoExportService.playSlides(slidePath, demo, ref, options);
    } else {
      await VideoExportService.hold(
        typeof demo.autoAdvanceAfter === 'number' && demo.autoAdvanceAfter > 0
          ? demo.autoAdvanceAfter
          : options.sceneHoldSeconds,
      );
    }

    // Captions made from the notes need the scene on screen long enough to read them
    if (options.holdForNotes && demo.notes?.path) {
      const notesSeconds = await VideoExportService.getNotesReadingSeconds(demo.notes.path);
      await VideoExportService.hold(notesSeconds - (Date.now() - startedAt) / 1000);
    }

    await VideoExportService.log({ type: 'sceneEnd', t: Date.now(), ...ref });
  }

  /**
   * Holds each slide of the scene's slide deck, then advances the preview, until the
   * preview reports there is no next slide.
   */
  private static async playSlides(
    slidePath: string,
    demo: Demo,
    ref: VideoExportSceneRef,
    options: ResolvedOptions,
  ) {
    const slides = await VideoExportService.getSlides(slidePath);
    await sleep(SLIDE_SETTLE_MS);

    let loggedIndex: number | undefined;
    for (let advances = 0; advances < MAX_SLIDE_ADVANCES; advances++) {
      if (VideoExportService.cancelled) {
        return;
      }

      const slideIndex = Math.max(Preview.getCurrentSlideIndex(), 0);
      const slide: Slide | undefined = slides[slideIndex];
      if (slideIndex !== loggedIndex) {
        loggedIndex = slideIndex;
        await VideoExportService.log({
          type: 'slide',
          t: Date.now(),
          ...ref,
          slideIndex,
          slideTitle: VideoExportService.getSlideTitle(slide),
        });
      }

      await VideoExportService.hold(
        getSlideHoldSeconds(
          slide?.content,
          {
            sceneAutoAdvanceAfter: demo.autoAdvanceAfter,
            slideAutoAdvanceAfter: slide?.frontmatter?.autoAdvanceAfter,
          },
          options,
        ),
      );

      if (!Preview.checkIfHasNextSlide()) {
        return;
      }

      await Preview.postMessage(WebViewMessages.toWebview.nextSlide);
      // An animated slide can consume the "next" without changing slides; the timeout
      // covers that, and the next iteration holds the same slide again.
      await VideoExportService.waitFor(
        () => Preview.getCurrentSlideIndex() !== slideIndex,
        SLIDE_ADVANCE_TIMEOUT_MS,
      );
      await sleep(SLIDE_SETTLE_MS / 2);
    }

    throw new Error(
      `"${demo.title}" still had slides after ${MAX_SLIDE_ADVANCES}; the export stops rather than skip the rest.`,
    );
  }

  private static async prepare(options: ResolvedOptions) {
    await commands.executeCommand(COMMAND.reset);
    await DemoAutoProceedService.resetState();
    await commands.executeCommand('notifications.clearAll');
    if (options.hideUI) {
      await togglePresentationView(true);
    }
  }

  private static async restore(options: ResolvedOptions) {
    if (options.hideUI) {
      await togglePresentationView(false);
    }
  }

  private static async fail(
    options: ResolvedOptions,
    issues: VideoExportIssue[],
    error: string,
  ): Promise<VideoExportResult> {
    Logger.error(`Video export: ${error}`);
    await VideoExportService.log({ type: 'end', t: Date.now(), status: 'failed', error });
    Notifications.error(error);
    return { status: 'failed', eventLogPath: options.eventLogPath, issues, error };
  }

  private static async logIssue(issue: VideoExportIssue) {
    const scene = VideoExportService.currentScene;
    await VideoExportService.log({
      type: 'issue',
      t: Date.now(),
      issue: { ...issue, actTitle: scene?.actTitle, sceneTitle: scene?.sceneTitle },
    });
  }

  private static async log(event: VideoExportEvent) {
    const path = VideoExportService.options?.eventLogPath;
    if (!path) {
      return;
    }
    try {
      await appendFile(path, `${JSON.stringify(event)}\n`, 'utf8');
    } catch (error) {
      Logger.error(`Video export: cannot write the event log: ${(error as Error).message}`);
    }
  }

  /** Sleeps for `seconds`, returning early when the run is stopped. */
  private static async hold(seconds: number) {
    const until = Date.now() + seconds * 1000;
    while (!VideoExportService.cancelled && Date.now() < until) {
      await sleep(Math.min(100, until - Date.now()));
    }
  }

  private static async waitFor(check: () => boolean, timeoutMs: number) {
    const until = Date.now() + timeoutMs;
    while (!check() && Date.now() < until) {
      await sleep(50);
    }
  }

  public static async getActs(): Promise<VideoExportAct[]> {
    const demoFiles = (await DemoFileProvider.getFiles()) || {};
    return sortFiles(demoFiles).map((filePath) => ({
      filePath,
      title: demoFiles[filePath]?.title || filePath.split('/').pop() || filePath,
      demos: getDemosFromConfig(demoFiles[filePath]),
      version: demoFiles[filePath]?.version,
    }));
  }

  private static async getSlides(slidePath: string): Promise<Slide[]> {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return [];
    }
    const content = await getFileContents(workspaceFolder, slidePath);
    return content ? new SlideParser().parseSlides(content) : [];
  }

  private static async getNotesReadingSeconds(notesPath: string): Promise<number> {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    const content = workspaceFolder ? await getFileContents(workspaceFolder, notesPath) : undefined;
    return content ? getReadingSeconds(content) : 0;
  }

  private static getSlideTitle(slide: Slide | undefined): string | undefined {
    const title = slide?.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    return title || (slide?.frontmatter as { title?: string } | undefined)?.title;
  }

  private static getTypingModeSetting(): InsertTypingMode | undefined {
    return Extension.getInstance().getSetting<InsertTypingMode>(Config.insert.typingMode);
  }
}
