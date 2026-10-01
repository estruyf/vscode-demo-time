import {
  Action,
  Demo,
  InsertTypingMode,
  Step,
  VideoExportIssue,
  VideoExportRange,
  VideoExportRunOptions,
} from '@demotime/common';

export const VIDEO_EXPORT_DEFAULTS: Required<
  Omit<VideoExportRunOptions, 'range' | 'eventLogPath'>
> = {
  sceneHoldSeconds: 2,
  minSlideSeconds: 3,
  maxSlideSeconds: 12,
  pauseSeconds: 1,
  terminalTimeoutSeconds: 30,
  leadSeconds: 1,
  hideUI: true,
  showNotes: false,
  holdForNotes: false,
  strict: false,
};

export interface VideoExportAct {
  filePath: string;
  title: string;
  demos: Demo[];
  /** The act file's version: version 1 resolves paths from the `.demo` folder. */
  version?: number;
}

/**
 * A path from an act file, relative to the workspace: version 1 act files give paths relative
 * to the `.demo` folder, later versions relative to the workspace.
 */
export const toWorkspaceRelativePath = (path: string, version?: number): string =>
  typeof version === 'number' && version < 2 ? `.demo/${path.replace(/^\.?\//, '')}` : path;

export interface VideoExportScene {
  actIndex: number;
  act: VideoExportAct;
  sceneIndex: number;
  demo: Demo;
}

const RANGE_REGEX = /^act:(\d+)(?:\/scenes:(\d+)(?:-(\d*))?)?$/;

/**
 * Parses `all`, `act:2`, `act:2/scenes:3`, `act:2/scenes:3-5` or `act:2/scenes:3-`.
 * Acts and scenes are 1-based.
 */
export const parseVideoExportRange = (range?: string): VideoExportRange => {
  const value = (range || 'all').trim().toLowerCase();
  if (value === 'all') {
    return { type: 'all' };
  }

  const match = RANGE_REGEX.exec(value);
  if (!match) {
    throw new Error(
      `Invalid range "${range}". Use "all", "act:<n>" or "act:<n>/scenes:<from>-<to>".`,
    );
  }

  const act = parseInt(match[1], 10);
  const fromScene = match[2] ? parseInt(match[2], 10) : undefined;
  // "3" is a single scene, "3-" runs to the end of the act, "3-5" is inclusive
  let toScene: number | undefined = fromScene;
  if (match[3] !== undefined) {
    toScene = match[3] === '' ? undefined : parseInt(match[3], 10);
  }

  if (act < 1 || (fromScene !== undefined && fromScene < 1)) {
    throw new Error(`Invalid range "${range}". Acts and scenes start at 1.`);
  }
  if (fromScene !== undefined && toScene !== undefined && toScene < fromScene) {
    throw new Error(`Invalid range "${range}". The last scene comes before the first one.`);
  }

  return { type: 'act', act, fromScene, toScene };
};

export const formatVideoExportRange = (range: VideoExportRange): string => {
  if (range.type === 'all') {
    return 'all';
  }
  if (range.fromScene === undefined) {
    return `act:${range.act}`;
  }
  if (range.toScene === range.fromScene) {
    return `act:${range.act}/scenes:${range.fromScene}`;
  }
  return `act:${range.act}/scenes:${range.fromScene}-${range.toScene ?? ''}`;
};

/**
 * Returns the enabled scenes the range covers, in play order.
 */
export const selectVideoExportScenes = (
  acts: VideoExportAct[],
  range: VideoExportRange,
): VideoExportScene[] => {
  if (range.type === 'act' && range.act > acts.length) {
    throw new Error(`The play has ${acts.length} act(s); act ${range.act} does not exist.`);
  }

  const scenes: VideoExportScene[] = [];
  acts.forEach((act, actIndex) => {
    if (range.type === 'act' && actIndex !== range.act - 1) {
      return;
    }

    const from = range.type === 'act' && range.fromScene ? range.fromScene - 1 : 0;
    const to = range.type === 'act' && range.toScene ? range.toScene - 1 : act.demos.length - 1;

    const lastScene = range.type === 'act' ? (range.toScene ?? range.fromScene) : undefined;
    if (range.type === 'act' && lastScene !== undefined && lastScene > act.demos.length) {
      throw new Error(
        `Act ${range.act} has ${act.demos.length} scene(s); scene ${lastScene} does not exist.`,
      );
    }

    act.demos.forEach((demo, sceneIndex) => {
      if (sceneIndex < from || sceneIndex > to || demo.disabled || !demo.steps?.length) {
        return;
      }
      scenes.push({ actIndex, act, sceneIndex, demo });
    });
  });

  return scenes;
};

const SKIPPED_ACTIONS: { [action: string]: string } = {
  [Action.OpenPowerPoint]: 'opens an external application',
  [Action.OpenKeynote]: 'opens an external application',
  [Action.HideDesktopIcons]: 'changes the desktop, outside VS Code',
  [Action.ShowDesktopIcons]: 'changes the desktop, outside VS Code',
  [Action.StartEngageTimeSession]: 'depends on a live EngageTime session',
  [Action.StartEngageTimePoll]: 'depends on a live EngageTime session',
  [Action.CloseEngageTimeSession]: 'depends on a live EngageTime session',
  [Action.CloseEngageTimePoll]: 'depends on a live EngageTime session',
  [Action.ShowEngageTimeSession]: 'depends on a live EngageTime session',
  [Action.ShowEngageTimePoll]: 'depends on a live EngageTime session',
  [Action.SendEngageTimeMessage]: 'depends on a live EngageTime session',
};

const NONDETERMINISTIC_ACTIONS: string[] = [
  Action.AskChat,
  Action.EditChat,
  Action.AgentChat,
  Action.CustomChat,
];

/**
 * Tells how a move is handled when the play runs unattended, or `undefined` when it runs as is.
 *
 * @param step - The move to check.
 * @param defaultTypingMode - The `demoTime.insertTypingMode` setting, used when the move has none.
 */
export const getVideoExportStepIssue = (
  step: Step,
  defaultTypingMode?: InsertTypingMode,
): VideoExportIssue | undefined => {
  if (!step?.action || step.disabled) {
    return undefined;
  }

  const action = step.action as string;

  if (SKIPPED_ACTIONS[action]) {
    return { action, handling: 'skip', reason: `Skipped: ${SKIPPED_ACTIONS[action]}.` };
  }

  if (action.startsWith('macos.')) {
    return { action, handling: 'skip', reason: 'Skipped: changes macOS, outside VS Code.' };
  }

  if (step.action === Action.OpenWebsite && !step.openInVSCode) {
    return {
      action,
      handling: 'skip',
      reason: 'Skipped: opens an external browser. Set "openInVSCode": true to record it.',
    };
  }

  if (step.action === Action.Pause || step.action === Action.WaitForInput) {
    return {
      action,
      handling: 'auto-continue',
      reason: 'Waits for the presenter; continues automatically after a short pause.',
    };
  }

  if (step.action === Action.ExecuteTerminalCommand && step.autoExecute === false) {
    return {
      action,
      handling: 'warn',
      reason: 'The command is typed but not run, so the video will not show its output.',
    };
  }

  const typingMode = step.insertTypingMode ?? defaultTypingMode;
  if (typingMode === 'hacker-typer' && isTypingAction(step.action)) {
    return {
      action,
      handling: 'adjust',
      reason: 'Hacker-typer mode needs key presses; typed character by character instead.',
    };
  }

  if (NONDETERMINISTIC_ACTIONS.includes(action)) {
    return {
      action,
      handling: 'warn',
      reason: 'The chat response differs on every run, so each export differs too.',
    };
  }

  return undefined;
};

const isTypingAction = (action: Action) =>
  action === Action.Insert || action === Action.Replace || action === Action.ApplyPatch;

/**
 * Lists every move in the scenes that cannot run unattended exactly as written.
 * Moves inside snippets are only known once they run, so they are reported during the run.
 */
export const preflightVideoExport = (
  scenes: VideoExportScene[],
  defaultTypingMode?: InsertTypingMode,
): VideoExportIssue[] => {
  const issues: VideoExportIssue[] = [];
  for (const scene of scenes) {
    for (const step of scene.demo.steps || []) {
      const issue = getVideoExportStepIssue(step, defaultTypingMode);
      if (issue) {
        issues.push({ ...issue, actTitle: scene.act.title, sceneTitle: scene.demo.title });
      }
    }
  }
  return issues;
};

/**
 * Counts the words a viewer reads on a slide: markdown and HTML syntax, code fences and
 * URLs are left out.
 */
export const countSlideWords = (content: string): number => {
  const text = (content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_`~|-]/g, ' ');

  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
};

const WORDS_PER_SECOND = 200 / 60;

/** Seconds it takes to read the text of a slide or notes file, with a moment to take it in. */
export const getReadingSeconds = (markdown: string): number =>
  1.5 + countSlideWords(markdown) / WORDS_PER_SECOND;

/**
 * How long a slide stays on screen: the scene's `autoAdvanceAfter`, the slide's
 * `autoAdvanceAfter`, or a reading time based on its text, clamped to the min and max.
 */
export const getSlideHoldSeconds = (
  slideContent: string | undefined,
  timing: { sceneAutoAdvanceAfter?: number; slideAutoAdvanceAfter?: number },
  options: Pick<Required<VideoExportRunOptions>, 'minSlideSeconds' | 'maxSlideSeconds'>,
): number => {
  if (typeof timing.sceneAutoAdvanceAfter === 'number' && timing.sceneAutoAdvanceAfter > 0) {
    return timing.sceneAutoAdvanceAfter;
  }
  if (typeof timing.slideAutoAdvanceAfter === 'number' && timing.slideAutoAdvanceAfter > 0) {
    return timing.slideAutoAdvanceAfter;
  }

  const readingSeconds = getReadingSeconds(slideContent || '');
  return Math.min(
    options.maxSlideSeconds,
    Math.max(options.minSlideSeconds, Math.round(readingSeconds * 10) / 10),
  );
};

export type VideoExportPreset = '16:9' | '1:1' | '9:16';

/** What the "Export play as video" command asks for, saved in `demoTime.videoExport.options`. */
export interface VideoExportChoices {
  range: string;
  preset: VideoExportPreset;
  gif: boolean;
  captions: 'none' | 'titles' | 'notes';
  chapters: boolean;
  cards: boolean;
}

export const DEFAULT_VIDEO_EXPORT_CHOICES: VideoExportChoices = {
  range: 'all',
  preset: '16:9',
  gif: false,
  captions: 'none',
  chapters: true,
  cards: false,
};

/** Reads saved choices, dropping anything unknown so an edited setting cannot break the command. */
export const normalizeVideoExportChoices = (value: unknown): VideoExportChoices | undefined => {
  // VS Code hands back `{}` for an object setting that was never set
  if (!value || typeof value !== 'object' || !('range' in value || 'preset' in value)) {
    return undefined;
  }
  const saved = value as Partial<VideoExportChoices>;
  let range = DEFAULT_VIDEO_EXPORT_CHOICES.range;
  try {
    range = formatVideoExportRange(parseVideoExportRange(saved.range));
  } catch {
    // Keep the default range
  }
  return {
    range,
    preset: ['16:9', '1:1', '9:16'].includes(saved.preset as string)
      ? (saved.preset as VideoExportPreset)
      : DEFAULT_VIDEO_EXPORT_CHOICES.preset,
    gif: saved.gif === true,
    captions: ['titles', 'notes'].includes(saved.captions as string)
      ? (saved.captions as 'titles' | 'notes')
      : 'none',
    chapters: saved.chapters !== false,
    cards: saved.cards === true,
  };
};

/** One line that says what an export with these choices produces. */
export const describeVideoExportChoices = (
  choices: VideoExportChoices,
  actTitles: string[] = [],
): string => {
  const range = parseVideoExportRange(choices.range);
  const what =
    range.type === 'all'
      ? 'Whole play'
      : `${actTitles[range.act - 1] ?? `Act ${range.act}`}${
          range.fromScene ? `, scenes ${formatVideoExportRange(range).split('scenes:')[1]}` : ''
        }`;
  const extras = [
    choices.gif && 'GIF',
    choices.captions === 'titles' && 'captions from titles',
    choices.captions === 'notes' && 'captions from notes',
    choices.chapters && 'chapters',
    choices.cards && 'title and end cards',
  ].filter(Boolean);
  return [what, choices.preset, ...extras].join(' · ');
};

/** A file name from a folder or act name: `Ship it!` → `ship-it`. */
export const toVideoFileName = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'demo';

/**
 * The VS Code executable next to `vscode.env.appRoot`, for each platform's layout. The first that
 * exists is the one running.
 */
export const getVSCodeExecutableCandidates = (appRoot: string, platform: string): string[] => {
  const join = (...parts: string[]) => parts.join('/').replace(/\\/g, '/');
  if (platform === 'darwin') {
    // <App>.app/Contents/Resources/app
    const macos = join(appRoot, '..', '..', 'MacOS');
    return [join(macos, 'Code'), join(macos, 'Electron'), join(macos, 'Code - Insiders')];
  }
  // <install>/resources/app
  const install = join(appRoot, '..', '..');
  if (platform === 'win32') {
    return [join(install, 'Code.exe'), join(install, 'Code - Insiders.exe')];
  }
  return [join(install, 'code'), join(install, 'code-insiders')];
};

/** The arguments of `demotime-video export` for the choices. */
export const buildVideoExportArgs = (
  choices: VideoExportChoices,
  context: {
    workspace: string;
    outDir: string;
    name: string;
    vscodePath?: string;
    extension: string;
    extensions: string[];
    settingsFile?: string;
  },
): string[] => {
  const args = [
    'export',
    context.workspace,
    '--range',
    choices.range,
    '--preset',
    choices.preset,
    '--out',
    context.outDir,
    '--name',
    context.name,
    '--extension',
    context.extension,
  ];
  if (choices.gif) {
    args.push('--gif');
  }
  if (choices.captions !== 'none') {
    args.push('--srt', '--captions', choices.captions);
  }
  if (choices.chapters) {
    args.push('--chapters');
  }
  if (choices.cards) {
    args.push('--cards');
  }
  if (context.vscodePath) {
    args.push('--vscode', context.vscodePath);
  }
  if (context.extensions.length > 0) {
    args.push('--extensions', context.extensions.join(','));
  }
  if (context.settingsFile) {
    args.push('--settings', context.settingsFile);
  }
  return args;
};
