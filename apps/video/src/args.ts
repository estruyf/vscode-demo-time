import { parseArgs } from 'node:util';
import { isAbsolute, join, resolve } from 'node:path';
import { getPreset, Preset } from './presets';

export type CaptionSource = 'titles' | 'notes';

export interface ExportOptions {
  workspace: string;
  range: string;
  preset: Preset;
  fps: number;
  outDir: string;
  name: string;
  gif: boolean;
  gifWidth: number;
  gifFps: number;
  srt: boolean;
  captions: CaptionSource;
  chapters: boolean;
  cards: boolean;
  cardSeconds: number;
  strict: boolean;
  showNotes: boolean;
  /** Path to a VS Code executable or app bundle. */
  vscodePath?: string;
  /** Download this VS Code version (`stable`, `insiders` or `1.105.0`) instead of using an installed one. */
  vscodeVersion?: string;
  /** Demo Time itself: a Marketplace id (optionally `@version`) or a VSIX path. */
  extension: string;
  /** More extensions to install, such as the color theme. */
  extensions: string[];
  /** A JSON file with user settings for the recording profile. */
  settingsFile?: string;
  vscodeArgs: string[];
  inPlace: boolean;
  keepTemp: boolean;
  timeoutMinutes: number;
  ffmpegPath?: string;
  /** Timing of the unattended run; Demo Time's defaults when not set. */
  timing: {
    sceneHoldSeconds?: number;
    minSlideSeconds?: number;
    maxSlideSeconds?: number;
    terminalTimeoutSeconds?: number;
  };
}

export const USAGE = `Usage: demotime-video export [workspace] [options]

Runs a Demo Time play unattended in VS Code, records it, and writes an MP4.

Options:
  --range <range>         all (default), act:2, act:2/scenes:3-5 or act:2/scenes:3-
  --preset <preset>       16:9 (default), 1:1 or 9:16
  --fps <n>               Frame rate (default 30)
  --out <dir>             Output folder (default <workspace>/.demo/exports)
  --name <name>           File name without extension (default "demo")
  --gif                   Also write a GIF
  --gif-width <px>        GIF width (default 960)
  --gif-fps <n>           GIF frame rate (default 12)
  --srt                   Also write captions as an SRT file, next to the MP4
  --captions <source>     What the captions say: titles (default) or notes;
                          implies --srt
  --chapters              Add chapter markers and write a chapter list
  --cards                 Add a title and end card from the first and last slide
  --card-seconds <n>      How long each card shows (default 3)
  --strict                Fail when a move cannot be recorded instead of skipping it
  --show-notes            Keep scene notes that open on trigger in the video
  --vscode <path>         VS Code executable or app to record in (default: the installed one)
  --vscode-version <v>    Download this VS Code version instead (stable, insiders, 1.105.0)
  --extension <id|vsix>   Demo Time to install (default eliostruyf.vscode-demo-time)
  --extensions <ids>      More extensions to install, comma separated (a theme, for example)
  --settings <file>       JSON file with VS Code user settings for the recording
  --vscode-arg=<arg>      Extra argument for VS Code, such as --vscode-arg=--disable-gpu;
                          repeat for more
  --in-place              Run in the workspace itself instead of a temporary copy
  --keep-temp             Keep the temporary profile, workspace copy and frames
  --scene-hold <s>        Seconds a scene without slides stays on screen (default 2)
  --slide-min <s>         Minimum seconds for a slide (default 3)
  --slide-max <s>         Maximum seconds for a slide's reading time (default 12)
  --terminal-timeout <s>  Seconds a terminal command gets to finish (default 30)
  --timeout <minutes>     Give up after this long (default 60)
  --ffmpeg <path>         ffmpeg to use (default: ffmpeg-static, FFMPEG, or PATH)
  -h, --help              Show this help
`;

const toNumber = (value: string | undefined, name: string, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`--${name} needs a positive number, got "${value}".`);
  }
  return number;
};

const optionalNumber = (value: string | undefined, name: string): number | undefined =>
  value === undefined ? undefined : toNumber(value, name, 0);

/**
 * Parses the `export` command's arguments. Returns `undefined` when help was asked for.
 */
export const parseExportArgs = (
  argv: string[],
  cwd: string = process.cwd(),
): ExportOptions | undefined => {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      range: { type: 'string' },
      preset: { type: 'string' },
      fps: { type: 'string' },
      out: { type: 'string' },
      name: { type: 'string' },
      gif: { type: 'boolean' },
      'gif-width': { type: 'string' },
      'gif-fps': { type: 'string' },
      srt: { type: 'boolean' },
      captions: { type: 'string' },
      chapters: { type: 'boolean' },
      cards: { type: 'boolean' },
      'card-seconds': { type: 'string' },
      strict: { type: 'boolean' },
      'show-notes': { type: 'boolean' },
      vscode: { type: 'string' },
      'vscode-version': { type: 'string' },
      extension: { type: 'string' },
      extensions: { type: 'string' },
      settings: { type: 'string' },
      'vscode-arg': { type: 'string', multiple: true },
      'in-place': { type: 'boolean' },
      'keep-temp': { type: 'boolean' },
      timeout: { type: 'string' },
      'scene-hold': { type: 'string' },
      'slide-min': { type: 'string' },
      'slide-max': { type: 'string' },
      'terminal-timeout': { type: 'string' },
      ffmpeg: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    return undefined;
  }
  if (positionals.length > 1) {
    throw new Error(`Expected one workspace folder, got: ${positionals.join(', ')}.`);
  }

  const abs = (path: string) => (isAbsolute(path) ? path : resolve(cwd, path));
  const workspace = abs(positionals[0] ?? '.');

  const captions = (values.captions ?? 'titles') as CaptionSource;
  if (captions !== 'titles' && captions !== 'notes') {
    throw new Error(`--captions is "titles" or "notes", got "${values.captions}".`);
  }

  const name = values.name ?? 'demo';
  if (!/^[\w.-]+$/.test(name)) {
    throw new Error(`--name can only use letters, numbers, ".", "-" and "_", got "${name}".`);
  }

  return {
    workspace,
    range: values.range ?? 'all',
    preset: getPreset(values.preset ?? '16:9'),
    fps: toNumber(values.fps, 'fps', 30),
    outDir: values.out ? abs(values.out) : join(workspace, '.demo', 'exports'),
    name,
    gif: !!values.gif,
    gifWidth: toNumber(values['gif-width'], 'gif-width', 960),
    gifFps: toNumber(values['gif-fps'], 'gif-fps', 12),
    // Asking for a caption source is asking for captions
    srt: !!values.srt || values.captions !== undefined,
    captions,
    chapters: !!values.chapters,
    cards: !!values.cards,
    cardSeconds: toNumber(values['card-seconds'], 'card-seconds', 3),
    strict: !!values.strict,
    showNotes: !!values['show-notes'],
    vscodePath: values.vscode ? abs(values.vscode) : undefined,
    vscodeVersion: values['vscode-version'],
    extension: values.extension
      ? /\.vsix$/i.test(values.extension)
        ? abs(values.extension)
        : values.extension
      : 'eliostruyf.vscode-demo-time',
    extensions: (values.extensions ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
    settingsFile: values.settings ? abs(values.settings) : undefined,
    vscodeArgs: values['vscode-arg'] ?? [],
    inPlace: !!values['in-place'],
    keepTemp: !!values['keep-temp'],
    timeoutMinutes: toNumber(values.timeout, 'timeout', 60),
    timing: {
      sceneHoldSeconds: optionalNumber(values['scene-hold'], 'scene-hold'),
      minSlideSeconds: optionalNumber(values['slide-min'], 'slide-min'),
      maxSlideSeconds: optionalNumber(values['slide-max'], 'slide-max'),
      terminalTimeoutSeconds: optionalNumber(values['terminal-timeout'], 'terminal-timeout'),
    },
    ffmpegPath: values.ffmpeg ? abs(values.ffmpeg) : undefined,
  };
};
