import {
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { VideoExportEvent, VideoExportRunOptions } from '@demotime/common';
import { parse as parseJsonc, ParseError } from 'jsonc-parser';
import { ExportOptions } from './args';
import {
  buildChapters,
  buildCues,
  markdownToText,
  toChapterList,
  toFfmetadata,
  toSrt,
} from './captions';
import { encodeGif, encodeMp4, findFfmpeg } from './ffmpeg';
import { frameAt, holdFrame, planFrames } from './frames';
import { Recorder, RecordedFrame } from './recorder';
import { buildTimeline, parseEventLog, Timeline } from './timeline';
import {
  DEFAULT_SETTINGS,
  getDemoTimeSupport,
  installExtensions,
  launchVSCode,
  LaunchedVSCode,
  resolveVSCode,
  writeUserSettings,
} from './vscode';
import { copyWorkspace } from './workspace';

export interface Reporter {
  step(message: string): void;
  info(message: string): void;
  warn(message: string): void;
}

export interface ExportResult {
  files: string[];
  timeline: Timeline;
}

/// How long Demo Time gets to start the run after VS Code opened.
const START_TIMEOUT_MS = 120_000;
const POLL_MS = 250;
/// A card shows its slide from just before the slide ended, when it is fully rendered.
const CARD_FRAME_BEFORE_END_MS = 200;

/**
 * The events written so far. Demo Time may be writing a line while this reads, so only lines
 * that end with a newline count; the last one is picked up on the next read.
 */
export const readCompleteEvents = (content: string): VideoExportEvent[] =>
  parseEventLog(content.slice(0, content.lastIndexOf('\n') + 1));

const readEvents = (path: string): VideoExportEvent[] =>
  existsSync(path) ? readCompleteEvents(readFileSync(path, 'utf8')) : [];

/**
 * Waits for the run to end, reporting scenes and issues as they come in.
 */
const waitForEnd = async (
  launched: LaunchedVSCode,
  eventLogPath: string,
  timeoutMs: number,
  reporter: Reporter,
): Promise<void> => {
  const startedAt = Date.now();
  let seen = 0;
  let closed = false;
  launched.app.on('close', () => {
    closed = true;
  });

  for (;;) {
    const events = readEvents(eventLogPath);
    for (const event of events.slice(seen)) {
      if (event.type === 'start') {
        reporter.info(`Running ${event.sceneCount} scene(s) (range: ${event.range})`);
      } else if (event.type === 'sceneStart') {
        reporter.info(`  ${event.actTitle} › ${event.sceneTitle}`);
      } else if (event.type === 'issue') {
        const { issue } = event;
        reporter.warn(`${issue.action} in "${issue.sceneTitle ?? '?'}": ${issue.reason}`);
      }
    }
    seen = events.length;

    if (events.some((event) => event.type === 'end')) {
      return;
    }
    if (closed) {
      throw new Error('VS Code closed before the play finished.');
    }
    if (
      !events.some((event) => event.type === 'start') &&
      Date.now() - startedAt > START_TIMEOUT_MS
    ) {
      throw new Error(
        'Demo Time did not start the play. The installed Demo Time needs video export support: ' +
          'update it, or pass --extension <path to a .vsix>.',
      );
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`The play did not finish within ${timeoutMs / 60_000} minutes (--timeout).`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
};

/** Picks the frames of the video: the run itself, with a title and end card when asked. */
const cutFrames = (
  frames: RecordedFrame[],
  timeline: Timeline,
  options: ExportOptions,
  reporter: Reporter,
): { plan: number[]; offset: number } => {
  const times = frames.map((frame) => frame.t);
  const main = planFrames(
    times,
    timeline.startedAt,
    timeline.startedAt + timeline.duration,
    options.fps,
  );

  if (!options.cards) {
    return { plan: main, offset: 0 };
  }

  const first = timeline.slides[0];
  const last = timeline.slides[timeline.slides.length - 1];
  if (!first || !last) {
    reporter.warn('No slides in the range, so there are no title and end cards.');
    return { plan: main, offset: 0 };
  }

  const cardFrame = (end: number) =>
    frameAt(times, timeline.startedAt + Math.max(0, end - CARD_FRAME_BEFORE_END_MS));
  const title = holdFrame(cardFrame(first.end), options.cardSeconds, options.fps);
  const endCard = holdFrame(cardFrame(last.end), options.cardSeconds, options.fps);
  return {
    plan: [...title, ...main, ...endCard],
    offset: (title.length * 1000) / options.fps,
  };
};

/** Numbers the chosen frames 0…n in `dir`, as hard links: most frames of a video are repeats. */
const writeSequence = (frames: RecordedFrame[], plan: number[], dir: string): string => {
  mkdirSync(dir, { recursive: true });
  plan.forEach((frameIdx, idx) => {
    const target = join(dir, `${String(idx).padStart(7, '0')}.jpg`);
    try {
      linkSync(frames[frameIdx].path, target);
    } catch {
      copyFileSync(frames[frameIdx].path, target);
    }
  });
  return join(dir, '%07d.jpg');
};

/**
 * `path` resolved against `root`, or `undefined` when it points outside it: the captions only
 * ever show notes from inside the workspace.
 */
export const resolveInside = (root: string, path: string): string | undefined => {
  const base = resolve(root);
  const full = resolve(base, path);
  const rel = relative(base, full);
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel) ? undefined : full;
};

/** Reads a settings file the way VS Code does: comments and trailing commas are fine. */
export const readSettingsFile = (path: string): Record<string, unknown> => {
  const errors: ParseError[] = [];
  const settings = parseJsonc(readFileSync(path, 'utf8'), errors, { allowTrailingComma: true });
  if (errors.length > 0 || !settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error(`${path} is not a JSON object of VS Code settings.`);
  }
  return settings as Record<string, unknown>;
};

export const exportVideo = async (
  options: ExportOptions,
  reporter: Reporter,
): Promise<ExportResult> => {
  if (!existsSync(join(options.workspace, '.demo'))) {
    throw new Error(`${options.workspace} has no .demo folder; is it a Demo Time workspace?`);
  }
  const ffmpeg = findFfmpeg(options.ffmpegPath);

  // Short paths: VS Code puts IPC sockets under the profile, and macOS caps a socket path at
  // 104 bytes.
  const temp = mkdtempSync(join(tmpdir(), 'dtv-'));
  const profileDir = join(temp, 'u');
  const extensionsDir = join(temp, 'x');
  const eventLogPath = join(temp, 'events.jsonl');
  const optionsFile = join(temp, 'options.json');

  let launched: LaunchedVSCode | undefined;
  // Ctrl+C: close the VS Code window and remove the temporary files before exiting
  const onSignal = () => {
    reporter.warn('Stopped.');
    void (launched?.app.close() ?? Promise.resolve())
      .catch(() => {})
      .finally(() => {
        if (!options.keepTemp) {
          rmSync(temp, { recursive: true, force: true });
        }
        process.exit(130);
      });
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    let workspace = options.workspace;
    if (!options.inPlace) {
      reporter.step('Copying the workspace');
      workspace = join(temp, 'w', basename(options.workspace));
      copyWorkspace(
        options.workspace,
        workspace,
        [options.outDir, join(options.workspace, '.demo', 'exports')],
        { copyNodeModules: options.copyNodeModules },
      );
    }
    mkdirSync(options.outDir, { recursive: true });

    const runOptions: VideoExportRunOptions = {
      range: options.range,
      eventLogPath,
      strict: options.strict,
      showNotes: options.showNotes,
      holdForNotes: options.srt && options.captions === 'notes',
      hideUI: true,
      ...options.timing,
    };
    writeFileSync(optionsFile, JSON.stringify(runOptions, null, 2));

    const extraSettings = options.settingsFile ? readSettingsFile(options.settingsFile) : {};
    writeUserSettings(profileDir, {
      ...DEFAULT_SETTINGS,
      ...options.preset.settings,
      ...extraSettings,
    });

    reporter.step('Finding VS Code');
    const executable = await resolveVSCode({
      vscodePath: options.vscodePath,
      vscodeVersion: options.vscodeVersion,
      cacheDir: join(homedir(), '.cache', 'demotime-video'),
    });
    reporter.info(`  ${executable}`);

    reporter.step('Installing the extensions');
    await installExtensions(executable, {
      profileDir,
      extensionsDir,
      extensions: [options.extension, ...options.extensions],
    });

    // Fail now rather than after the start timeout when Demo Time is too old to run the play
    const demoTime = getDemoTimeSupport(extensionsDir);
    if (demoTime && !demoTime.supported) {
      throw new Error(
        `Demo Time ${demoTime.version} cannot export videos yet. Install a newer version with ` +
          '--extension eliostruyf.vscode-demo-time@<version>, or pass --extension <path to a .vsix>.',
      );
    }

    reporter.step('Recording: leave the VS Code window alone until it closes');
    launched = await launchVSCode(executable, {
      workspace,
      profileDir,
      extensionsDir,
      preset: options.preset,
      env: { DEMOTIME_VIDEO_EXPORT: optionsFile },
      args: options.vscodeArgs,
    });

    const { viewport } = launched;
    const wanted = options.preset.viewport;
    if (viewport.width < wanted.width || viewport.height < wanted.height) {
      reporter.warn(
        `The screen fits a ${viewport.width}×${viewport.height} window, not ${wanted.width}×${wanted.height}; ` +
          'the video is letterboxed.',
      );
    }

    const recorder = new Recorder(launched.page, join(temp, 'f'), {
      width: options.preset.width,
      height: options.preset.height,
    });
    await recorder.start();

    let frames: RecordedFrame[];
    try {
      await waitForEnd(launched, eventLogPath, options.timeoutMinutes * 60_000, reporter);
    } finally {
      frames = await recorder.stop();
      await launched.app.close().catch(() => {});
      launched = undefined;
    }

    const timeline = buildTimeline(readEvents(eventLogPath));
    if (!timeline) {
      throw new Error('The event log has no end.');
    }
    if (timeline.status === 'failed') {
      throw new Error(`The play failed: ${timeline.error ?? 'unknown error'}`);
    }
    if (timeline.status === 'cancelled') {
      reporter.warn('The run was stopped early; the video has what ran until then.');
    }
    if (frames.length === 0) {
      throw new Error('The recording has no frames.');
    }

    reporter.step('Encoding');
    const files: string[] = [];
    const base = join(options.outDir, options.name);
    const { plan, offset } = cutFrames(frames, timeline, options, reporter);
    const totalDuration = (plan.length * 1000) / options.fps;
    const framesPattern = writeSequence(frames, plan, join(temp, 's'));

    let metadataFile: string | undefined;
    if (options.chapters) {
      const chapters = buildChapters(timeline, offset, totalDuration);
      metadataFile = join(temp, 'chapters.ffmeta');
      writeFileSync(metadataFile, toFfmetadata(chapters));
      writeFileSync(`${base}-chapters.txt`, toChapterList(chapters));
      files.push(`${base}-chapters.txt`);
    }

    await encodeMp4(ffmpeg, {
      framesPattern,
      fps: options.fps,
      width: options.preset.width,
      height: options.preset.height,
      out: `${base}.mp4`,
      metadataFile,
    });
    files.unshift(`${base}.mp4`);

    if (options.srt) {
      const cues = buildCues(timeline, options.captions, offset, (scene) => {
        const path = scene.notesPath && resolveInside(workspace, scene.notesPath);
        return path && existsSync(path) ? markdownToText(readFileSync(path, 'utf8')) : undefined;
      });
      writeFileSync(`${base}.srt`, toSrt(cues));
      files.push(`${base}.srt`);
    }

    if (options.gif) {
      await encodeGif(ffmpeg, {
        input: `${base}.mp4`,
        out: `${base}.gif`,
        width: options.gifWidth,
        fps: options.gifFps,
      });
      files.push(`${base}.gif`);
    }

    copyFileSync(eventLogPath, `${base}-events.jsonl`);
    files.push(`${base}-events.jsonl`);

    return { files, timeline };
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    if (launched) {
      await launched.app.close().catch(() => {});
    }
    if (options.keepTemp) {
      reporter.info(`Kept the temporary files in ${temp}`);
    } else {
      rmSync(temp, { recursive: true, force: true });
    }
  }
};
