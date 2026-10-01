import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  downloadAndUnzipVSCode,
  resolveCliPathFromVSCodeExecutablePath,
} from '@vscode/test-electron';
import { _electron as electron, ElectronApplication, Page } from 'playwright-core';
import { Preset } from './presets';

/// Settings of the throwaway recording profile: nothing in the video that the demo did not put
/// there. Everything here is something a user could set; `--settings` adds to it.
export const DEFAULT_SETTINGS: Record<string, unknown> = {
  'workbench.startupEditor': 'none',
  'workbench.tips.enabled': false,
  'workbench.enableExperiments': false,
  'workbench.layoutControl.enabled': false,
  'workbench.secondarySideBar.defaultVisibility': 'hidden',
  'workbench.editor.empty.hint': 'hidden',
  'window.restoreWindows': 'none',
  'window.commandCenter': false,
  'window.confirmBeforeClose': 'never',
  'telemetry.telemetryLevel': 'off',
  'update.mode': 'none',
  'extensions.autoUpdate': false,
  'extensions.autoCheckUpdates': false,
  'extensions.ignoreRecommendations': true,
  'security.workspace.trust.enabled': false,
  'chat.disableAIFeatures': true,
  'chat.commandCenter.enabled': false,
  'git.openRepositoryInParentFolders': 'never',
  // A blinking caret makes every frame differ from the last
  'editor.cursorBlinking': 'solid',
  'files.autoSave': 'off',
};

const INSTALLED: { [platform: string]: string[] } = {
  darwin: [
    '/Applications/Visual Studio Code.app/Contents/MacOS/Code',
    '/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
    join(homedir(), 'Applications/Visual Studio Code.app/Contents/MacOS/Code'),
    join(homedir(), 'Applications/Visual Studio Code.app/Contents/MacOS/Electron'),
  ],
  win32: [
    join(process.env.LOCALAPPDATA ?? '', 'Programs/Microsoft VS Code/Code.exe'),
    join(process.env.ProgramFiles ?? 'C:/Program Files', 'Microsoft VS Code/Code.exe'),
  ],
  linux: [
    '/usr/share/code/code',
    '/usr/lib/code/code',
    '/opt/visual-studio-code/code',
    '/snap/code/current/usr/share/code/code',
  ],
};

/** An app bundle (`Visual Studio Code.app`) resolves to the executable inside it. */
const fromAppBundle = (path: string): string => {
  if (!path.endsWith('.app')) {
    return path;
  }
  const code = join(path, 'Contents/MacOS/Code');
  return existsSync(code) ? code : join(path, 'Contents/MacOS/Electron');
};

/**
 * The VS Code to record in: the one named, a downloaded version, or the installed one, which is
 * downloaded as `stable` when there is none.
 */
export const resolveVSCode = async (options: {
  vscodePath?: string;
  vscodeVersion?: string;
  cacheDir: string;
}): Promise<string> => {
  if (options.vscodePath) {
    const executable = fromAppBundle(options.vscodePath);
    if (!existsSync(executable)) {
      throw new Error(`No VS Code executable at ${executable}.`);
    }
    return executable;
  }

  if (!options.vscodeVersion) {
    const installed = (INSTALLED[process.platform] ?? []).find((path) => existsSync(path));
    if (installed) {
      return installed;
    }
  }

  let executable = await downloadAndUnzipVSCode({
    version: options.vscodeVersion ?? 'stable',
    cachePath: join(options.cacheDir, 'vscode'),
  });
  // Recent macOS builds name the binary `Code`; test-electron still expects `Electron`.
  if (!existsSync(executable) && existsSync(join(dirname(executable), 'Code'))) {
    executable = join(dirname(executable), 'Code');
  }
  return executable;
};

/**
 * The environment VS Code starts with. When the export runs from a VS Code terminal, the parent's
 * VSCODE_* variables would make the new window talk to the parent instead of starting on its own.
 */
export const cleanEnv = (extra: Record<string, string>): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...process.env, ...extra };
  for (const key of Object.keys(env)) {
    if (
      key.startsWith('VSCODE_') ||
      key === 'ELECTRON_RUN_AS_NODE' ||
      key === 'ELECTRON_NO_ATTACH_CONSOLE'
    ) {
      delete env[key];
    }
  }
  return env;
};

export const writeUserSettings = (profileDir: string, settings: Record<string, unknown>) => {
  mkdirSync(join(profileDir, 'User'), { recursive: true });
  writeFileSync(join(profileDir, 'User/settings.json'), JSON.stringify(settings, null, 2));
};

/** Quotes an argument for cmd.exe when it has spaces or characters cmd would read. */
export const quoteForCmd = (arg: string): string =>
  /[\s"&|<>^()]/.test(arg) ? `"${arg.replace(/"/g, '""')}"` : arg;

/** Installs the extensions into the empty extensions folder of the recording profile. */
export const installExtensions = (
  executable: string,
  options: {
    profileDir: string;
    extensionsDir: string;
    extensions: string[];
    /** Install the pre-release versions; it applies to every extension in the call. */
    preRelease?: boolean;
  },
): Promise<void> => {
  const cli = resolveCliPathFromVSCodeExecutablePath(executable);
  const args = [
    '--user-data-dir',
    options.profileDir,
    '--extensions-dir',
    options.extensionsDir,
    ...options.extensions.flatMap((id) => ['--install-extension', id]),
    ...(options.preRelease ? ['--pre-release'] : []),
    '--force',
  ];

  // The Windows CLI is a .cmd script, which only runs through a shell. A shell joins the
  // arguments with spaces, so paths with spaces (C:\Program Files, C:\Users\Jane Doe) are quoted.
  const shell = process.platform === 'win32';
  return new Promise((resolve, reject) => {
    execFile(
      shell ? quoteForCmd(cli) : cli,
      shell ? args.map(quoteForCmd) : args,
      { env: cleanEnv({}), shell, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(`Installing ${options.extensions.join(', ')} failed:\n${stderr || stdout}`),
          );
        } else {
          resolve();
        }
      },
    );
  });
};

export interface LaunchedVSCode {
  app: ElectronApplication;
  page: Page;
  /** The window's content size after sizing; smaller than asked when the screen is smaller. */
  viewport: { width: number; height: number };
}

export const launchVSCode = async (
  executable: string,
  options: {
    workspace: string;
    profileDir: string;
    extensionsDir: string;
    preset: Preset;
    env: Record<string, string>;
    args: string[];
  },
): Promise<LaunchedVSCode> => {
  const app = await electron.launch({
    executablePath: executable,
    env: cleanEnv(options.env) as { [key: string]: string },
    args: [
      options.workspace,
      `--user-data-dir=${options.profileDir}`,
      `--extensions-dir=${options.extensionsDir}`,
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      '--new-window',
      // The screencast captures at CSS size × scale, so the scale is set here rather than taken
      // from whatever display the window opens on.
      `--force-device-scale-factor=${options.preset.scale}`,
      '--force-color-profile=srgb',
      // Keep painting when another window covers this one, or the video freezes.
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-background-timer-throttling',
      ...options.args,
    ],
  });

  const page = await app.firstWindow();
  await page.waitForSelector('.monaco-workbench', { timeout: 120_000 });

  // The window is sized from the main process; the renderer cannot resize itself.
  const [width, height] = await app.evaluate(({ BrowserWindow }, size) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.setContentSize(size.width, size.height);
    win.center();
    return win.getContentSize();
  }, options.preset.viewport);

  return { app, page, viewport: { width, height } };
};

const DEMO_TIME_ID = 'eliostruyf.vscode-demo-time';
/// The command Demo Time registers when it can run a play for a video export.
const EXPORT_COMMAND = 'demo-time.runForVideoExport';

/**
 * Looks up the Demo Time installed in the recording profile and whether it can run a play for
 * a video export. `undefined` when it is not in the folder.
 */
export const getDemoTimeSupport = (
  extensionsDir: string,
): { version: string; supported: boolean } | undefined => {
  let folders: string[] = [];
  try {
    folders = readdirSync(extensionsDir);
  } catch {
    return undefined;
  }

  for (const folder of folders) {
    if (!folder.toLowerCase().startsWith(`${DEMO_TIME_ID}-`)) {
      continue;
    }
    try {
      const manifest = JSON.parse(
        readFileSync(join(extensionsDir, folder, 'package.json'), 'utf8'),
      );
      if (`${manifest.publisher}.${manifest.name}`.toLowerCase() !== DEMO_TIME_ID) {
        continue;
      }
      const commands: { command?: string }[] = manifest.contributes?.commands ?? [];
      return {
        version: manifest.version,
        supported: commands.some((command) => command.command === EXPORT_COMMAND),
      };
    } catch {
      continue;
    }
  }
  return undefined;
};
