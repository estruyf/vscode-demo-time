import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import {
  commands,
  ConfigurationTarget,
  env,
  extensions,
  QuickPickItem,
  ShellExecution,
  ShellQuoting,
  Task,
  TaskRevealKind,
  TaskScope,
  tasks,
  Uri,
  window,
  workspace,
} from 'vscode';
import { COMMAND, Config } from '@demotime/common';
import { General } from '../constants';
import { Subscription } from '../models';
import {
  buildVideoExportArgs,
  describeVideoExportChoices,
  getVSCodeExecutableCandidates,
  normalizeVideoExportChoices,
  parseVideoExportRange,
  toVideoFileName,
  VideoExportChoices,
  VideoExportPreset,
  DEFAULT_VIDEO_EXPORT_CHOICES,
} from '../utils';
import { Extension } from './Extension';
import { Notifications } from './Notifications';
import { VideoExportService } from './VideoExportService';

/// Settings that decide how VS Code looks. Their values are handed to the recording, so the
/// video looks like the presenter's own editor.
const LOOK_SETTINGS = [
  'workbench.colorTheme',
  'workbench.iconTheme',
  'workbench.productIconTheme',
  'editor.fontFamily',
  'editor.fontSize',
  'editor.fontLigatures',
  'editor.fontWeight',
  'editor.lineHeight',
  'editor.letterSpacing',
  'terminal.integrated.fontFamily',
  'terminal.integrated.fontSize',
  'terminal.integrated.lineHeight',
];

type PickItem<T> = QuickPickItem & { value: T };

/**
 * "Demo Time: Export play as video": asks what to export, then runs the video CLI in a task.
 */
export class VideoExportCommand {
  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(
      commands.registerCommand(COMMAND.exportPlayAsVideo, VideoExportCommand.exportPlayAsVideo),
    );
  }

  private static async exportPlayAsVideo(): Promise<void> {
    const ext = Extension.getInstance();
    const workspaceFolder = ext.workspaceFolder;
    if (!workspaceFolder) {
      Notifications.error('Open a workspace with a Demo Time play to export it.');
      return;
    }

    // The export opens a VS Code window next to the workspace, which a remote machine
    // (WSL, SSH, a dev container or a codespace) cannot show
    if (env.remoteName) {
      Notifications.error(
        `Video export needs a local workspace; this one is on ${env.remoteName}. Clone it locally, or run "npx @demotime/video export" on a machine with a display.`,
      );
      return;
    }

    const acts = await VideoExportService.getActs();
    if (acts.length <= 0) {
      Notifications.error('No acts found to export.');
      return;
    }
    const actTitles = acts.map((act) => act.title);

    const saved = normalizeVideoExportChoices(ext.getSetting(Config.videoExport.options));
    let choices: VideoExportChoices | undefined;
    if (saved) {
      const again = await window.showQuickPick<PickItem<boolean>>(
        [
          {
            label: '$(play) Export again',
            detail: describeVideoExportChoices(saved, actTitles),
            value: true,
          },
          { label: '$(settings-gear) Choose the options…', value: false },
        ],
        { title: 'Export play as video' },
      );
      if (!again) {
        return;
      }
      choices = again.value ? saved : undefined;
    }

    if (!choices) {
      choices = await VideoExportCommand.askChoices(saved, actTitles);
      if (!choices) {
        return;
      }
      await workspace
        .getConfiguration(Config.root)
        .update(Config.videoExport.options, choices, ConfigurationTarget.Workspace);
    }

    await VideoExportCommand.runExport(choices, workspaceFolder.uri.fsPath, actTitles);
  }

  private static async askChoices(
    saved: VideoExportChoices | undefined,
    actTitles: string[],
  ): Promise<VideoExportChoices | undefined> {
    const previous = saved ?? DEFAULT_VIDEO_EXPORT_CHOICES;
    const title = 'Export play as video';

    const range = await window.showQuickPick<PickItem<string>>(
      [
        { label: 'Whole play', description: `${actTitles.length} act(s)`, value: 'all' },
        ...actTitles.map((actTitle, idx) => ({
          label: actTitle,
          description: `Act ${idx + 1}`,
          value: `act:${idx + 1}`,
        })),
      ],
      { title: `${title} (1/3)`, placeHolder: 'What do you want to export?' },
    );
    if (!range) {
      return undefined;
    }

    const presets: PickItem<VideoExportPreset>[] = [
      { label: '16:9', description: 'Landscape, 1920×1080: talks, YouTube', value: '16:9' },
      { label: '1:1', description: 'Square, 1080×1080: social feeds', value: '1:1' },
      { label: '9:16', description: 'Vertical, 1080×1920: Shorts, Reels', value: '9:16' },
    ];
    // The format used last time comes first, so Enter keeps it
    const preset = await window.showQuickPick(
      [
        ...presets.filter((item) => item.value === previous.preset),
        ...presets.filter((item) => item.value !== previous.preset),
      ],
      { title: `${title} (2/3)`, placeHolder: 'Which format?' },
    );
    if (!preset) {
      return undefined;
    }

    type Extra = 'gif' | 'titles' | 'notes' | 'chapters' | 'cards';
    const extras = await window.showQuickPick<PickItem<Extra>>(
      [
        { label: 'GIF', description: 'For a README or a Marketplace page', value: 'gif' as Extra },
        {
          label: 'Captions from scene titles',
          description: 'An SRT file',
          value: 'titles' as Extra,
        },
        {
          label: 'Captions from scene notes',
          description: 'An SRT file; scenes stay on screen long enough to read them',
          value: 'notes' as Extra,
        },
        {
          label: 'Chapters',
          description: 'One per scene, in the MP4 and as a list',
          value: 'chapters' as Extra,
        },
        {
          label: 'Title and end cards',
          description: 'The first and last slide, held for 3 seconds',
          value: 'cards' as Extra,
        },
      ].map((item) => ({
        ...item,
        picked:
          (item.value === 'gif' && previous.gif) ||
          (item.value === 'titles' && previous.captions === 'titles') ||
          (item.value === 'notes' && previous.captions === 'notes') ||
          (item.value === 'chapters' && previous.chapters) ||
          (item.value === 'cards' && previous.cards),
      })),
      {
        title: `${title} (3/3)`,
        placeHolder: 'Anything besides the MP4? (Enter to continue)',
        canPickMany: true,
      },
    );
    if (!extras) {
      return undefined;
    }

    const picked = new Set(extras.map((extra) => extra.value));
    return {
      range: range.value,
      preset: preset.value,
      gif: picked.has('gif'),
      // Notes make the fuller captions, so they win when both are picked
      captions: picked.has('notes') ? 'notes' : picked.has('titles') ? 'titles' : 'none',
      chapters: picked.has('chapters'),
      cards: picked.has('cards'),
    };
  }

  private static async runExport(
    choices: VideoExportChoices,
    workspacePath: string,
    actTitles: string[],
  ): Promise<void> {
    const ext = Extension.getInstance();
    const range = parseVideoExportRange(choices.range);
    const baseName = toVideoFileName(
      workspace.name || workspacePath.split(/[\\/]/).pop() || 'demo',
    );
    const name =
      range.type === 'all'
        ? baseName
        : `${baseName}-${toVideoFileName(actTitles[range.act - 1] ?? `act-${range.act}`)}`;
    const outDir = join(workspacePath, General.demoFolder, 'exports');

    const lookSettings = VideoExportCommand.getLookSettings();
    let settingsFile: string | undefined;
    if (Object.keys(lookSettings).length > 0) {
      settingsFile = join(ext.context.globalStorageUri.fsPath, 'video-export-settings.json');
      await workspace.fs.createDirectory(ext.context.globalStorageUri);
      await writeFile(settingsFile, JSON.stringify(lookSettings, null, 2), 'utf8');
    }

    const args = buildVideoExportArgs(choices, {
      workspace: workspacePath,
      outDir,
      name,
      vscodePath: VideoExportCommand.getVSCodeExecutable(),
      extension:
        ext.getSetting<string>(Config.videoExport.extension)?.trim() || `${ext.id}@${ext.version}`,
      extensions: VideoExportCommand.getLookExtensions(lookSettings),
      settingsFile,
    });

    const commandLine = (
      ext.getSetting<string>(Config.videoExport.command)?.trim() ||
      VideoExportCommand.getDefaultCliCommand()
    ).split(/\s+/);
    const [command, ...commandArgs] = commandLine;
    // VS Code hands the end event a task object of its own, so the export is found by its id
    const exportId = randomUUID();
    const task = new Task(
      { type: 'demotime-video', id: exportId },
      TaskScope.Workspace,
      'Export play as video',
      Config.title,
      new ShellExecution(
        command,
        [...commandArgs, ...args].map((value) => ({ value, quoting: ShellQuoting.Strong })),
      ),
    );
    task.presentationOptions = { reveal: TaskRevealKind.Always, clear: true };

    // Listen before starting: a command that fails at once (npx missing, a bad argument) can
    // end before executeTask resolves
    const listener = tasks.onDidEndTaskProcess(async (event) => {
      if (event.execution.task.definition.id !== exportId) {
        return;
      }
      listener.dispose();

      const video = Uri.file(join(outDir, `${name}.mp4`));
      if (event.exitCode !== 0 || !existsSync(video.fsPath)) {
        Notifications.error('The video export failed. The terminal shows why.');
        return;
      }
      const answer = await Notifications.info(
        `The video is ready: ${name}.mp4`,
        'Open video',
        'Show in folder',
      );
      if (answer === 'Open video') {
        await env.openExternal(video);
      } else if (answer === 'Show in folder') {
        await commands.executeCommand('revealFileInOS', video);
      }
    });
    await tasks.executeTask(task);
  }

  /**
   * The setting's default from this build's manifest: `@demotime/video@latest` for a release,
   * `@demotime/video@next` for a pre-release (scripts/beta-release.mjs sets it), so an emptied
   * setting still runs the CLI that goes with this build.
   */
  private static getDefaultCliCommand(): string {
    const property =
      Extension.getInstance().context.extension.packageJSON?.contributes?.configuration
        ?.properties?.[`${Config.root}.${Config.videoExport.command}`];
    return typeof property?.default === 'string' && property.default.trim()
      ? property.default.trim()
      : 'npx --yes @demotime/video@latest';
  }

  /** The running VS Code, so the recording uses the same version; the CLI finds one otherwise. */
  private static getVSCodeExecutable(): string | undefined {
    return getVSCodeExecutableCandidates(env.appRoot, process.platform)
      .map((path) => normalize(path))
      .find((path) => existsSync(path));
  }

  /** The look settings the presenter set, in their user or workspace settings. */
  private static getLookSettings(): Record<string, unknown> {
    const config = workspace.getConfiguration();
    const settings: Record<string, unknown> = {};
    for (const key of LOOK_SETTINGS) {
      const inspected = config.inspect(key);
      const value =
        inspected?.workspaceFolderValue ?? inspected?.workspaceValue ?? inspected?.globalValue;
      if (value !== undefined) {
        settings[key] = value;
      }
    }
    return settings;
  }

  /** The extensions behind the color, file icon and product icon themes, unless built in. */
  private static getLookExtensions(settings: Record<string, unknown>): string[] {
    const colorTheme = settings['workbench.colorTheme'];
    const iconTheme = settings['workbench.iconTheme'];
    const productIconTheme = settings['workbench.productIconTheme'];

    const ids = new Set<string>();
    for (const extension of extensions.all) {
      if (extension.extensionUri.fsPath.startsWith(env.appRoot)) {
        continue;
      }
      const contributes = extension.packageJSON?.contributes ?? {};
      const matches = (list: { id?: string; label?: string }[] | undefined, value: unknown) =>
        !!value && (list ?? []).some((item) => item.id === value || item.label === value);

      if (
        matches(contributes.themes, colorTheme) ||
        matches(contributes.iconThemes, iconTheme) ||
        matches(contributes.productIconThemes, productIconTheme)
      ) {
        ids.add(extension.id);
      }
    }
    return [...ids];
  }
}
