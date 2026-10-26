// REPL driver for the Demo Time extension in a real VS Code, for agents.
//
// Reads one command per line on stdin and prints `DONE <command>` when it finishes. Run it
// through `dt.sh` (next to this file), which starts it in the background and sends commands.
//
// Every `launch` starts from scratch in $DT_RUN_DIR (default /tmp/dt-run): a fresh VS Code
// profile, the packaged VSIX installed in an empty extensions folder, and a copy of the
// workspace, so nothing the test does lands in the repository.
import { _electron as electron } from 'playwright-core';
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
} from '@vscode/test-electron';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(SKILL_DIR, '../../..');
// Short on purpose: VS Code puts IPC sockets in the profile, and macOS caps a socket path at 104
// bytes, so os.tmpdir() (/var/folders/...) is too long
const RUN = process.env.DT_RUN_DIR || '/tmp/dt-run';
const VSIX = process.env.DT_VSIX || join(REPO, '.vscode-test/demo-time.vsix');
const SHOTS = join(RUN, 'shots');
const PROFILE = join(RUN, 'profile');
const EXTENSIONS = join(RUN, 'extensions');
const WORKSPACE = join(RUN, 'ws');

// Settings of the throwaway profile. `window.menuStyle` and `files.simpleDialog.enable` draw the
// context menus and the save/open dialogs in the window, where Playwright can see them.
const USER_SETTINGS = {
  'workbench.colorTheme': 'Default Dark Modern',
  'workbench.startupEditor': 'none',
  'workbench.tips.enabled': false,
  'workbench.enableExperiments': false,
  'workbench.secondarySideBar.defaultVisibility': 'hidden',
  'window.restoreWindows': 'none',
  'window.menuStyle': 'custom',
  'files.simpleDialog.enable': true,
  'files.autoSave': 'off',
  'telemetry.telemetryLevel': 'off',
  'update.mode': 'none',
  'extensions.autoUpdate': false,
  'extensions.autoCheckUpdates': false,
  'extensions.ignoreRecommendations': true,
  'security.workspace.trust.enabled': false,
  'chat.disableAIFeatures': true,
  'git.enabled': false,
  'editor.minimap.enabled': false,
  'editor.cursorBlinking': 'solid',
  // The Demo Time API, to run scenes with `curl http://localhost:3710/api/runById?id=...`
  'demoTime.api.enabled': true,
};

// A VS Code terminal sets these, and they make the child talk to the parent instead of starting
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !/^(VSCODE_|ELECTRON_)/.test(key)),
);

let app = null;
let page = null;

const log = (...args) => console.log(...args);

async function getVSCode() {
  if (process.env.VSCODE_EXE) {
    return process.env.VSCODE_EXE;
  }

  let exe = await downloadAndUnzipVSCode({
    version: process.env.VSCODE_VERSION || 'stable',
    cachePath: join(REPO, '.vscode-test'),
  });
  // Recent macOS builds name the binary `Code`, test-electron still returns `Electron`
  if (!existsSync(exe) && existsSync(join(dirname(exe), 'Code'))) {
    exe = join(dirname(exe), 'Code');
  }
  return exe;
}

// The first frame (webview) whose document has `selector`. Webviews are not inside the editor
// element of the workbench DOM, so look them up by what the extension rendered in them.
async function frameWith(selector) {
  for (const frame of page.frames()) {
    try {
      if (await frame.$(selector)) {
        return frame;
      }
    } catch {
      // A frame that navigated away
    }
  }
  return null;
}

// A webview with the focus (like the preview after a scene opened it) swallows the workbench
// shortcuts, so Ctrl/Cmd+P never opens Quick Open
async function focusWorkbench() {
  await page.evaluate(() => {
    if (document.activeElement?.tagName === 'IFRAME') {
      document.activeElement.blur();
    }
  });
}

// `<frame selector> ;; <rest>`
const splitFrameArg = (arg) => {
  const [selector, rest] = arg.split(' ;; ');
  return { selector: selector.trim(), rest: rest?.trim() };
};

// The preview webview: the slide container only exists there
const PREVIEW = '.slide__container';

const COMMANDS = {
  /** launch [workspace] - fresh profile + VSIX install + copy of the workspace (default examples/pitch) */
  async launch(arg) {
    if (app) {
      return log('already launched');
    }
    if (!existsSync(VSIX)) {
      throw new Error(`No VSIX at ${VSIX}. Package the extension first (see SKILL.md).`);
    }

    const source = resolve(REPO, arg || process.env.DT_WORKSPACE || 'examples/pitch');
    for (const dir of [PROFILE, EXTENSIONS, WORKSPACE]) {
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
    }
    mkdirSync(SHOTS, { recursive: true });
    cpSync(source, WORKSPACE, {
      recursive: true,
      filter: (path) => !/\/(\.git|node_modules)(\/|$)/.test(path.slice(source.length)),
    });
    mkdirSync(join(PROFILE, 'User'), { recursive: true });
    writeFileSync(join(PROFILE, 'User/settings.json'), JSON.stringify(USER_SETTINGS, null, 2));

    const exe = await getVSCode();
    const [cli] = resolveCliArgsFromVSCodeExecutablePath(exe);
    execFileSync(
      cli,
      [
        '--extensions-dir',
        EXTENSIONS,
        '--user-data-dir',
        PROFILE,
        '--install-extension',
        VSIX,
        '--force',
      ],
      { env, stdio: 'ignore' },
    );

    app = await electron.launch({
      executablePath: exe,
      args: [
        WORKSPACE,
        `--user-data-dir=${PROFILE}`,
        `--extensions-dir=${EXTENSIONS}`,
        '--skip-welcome',
        '--skip-release-notes',
        '--disable-workspace-trust',
        '--new-window',
      ],
      env,
      timeout: 60_000,
    });
    page = await app.firstWindow();
    await page.waitForSelector('.monaco-workbench', { timeout: 60_000 });
    // The renderer can't resize its own window
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(1400, 900),
    );
    // Wait for the Demo Time status bar item: the extension is activated
    await page
      .waitForSelector('.statusbar-item:has-text("API:"), .statusbar-item:has-text("Demo Time")', {
        timeout: 30_000,
      })
      .catch(() => log('warning: no Demo Time status bar item yet'));
    log(`launched ${exe}`);
    log(`workspace copy: ${WORKSPACE}`);
  },

  /** ss <name> - screenshot of the window to $DT_RUN_DIR/shots/<name>.png */
  async ss(name) {
    const file = join(SHOTS, `${name || `ss-${Date.now()}`}.png`);
    await page.screenshot({ path: file });
    log('screenshot:', file);
  },

  /** cmd <exact command palette title> - e.g. `cmd Demo Time: Open slide preview` */
  async cmd(title) {
    await focusWorkbench();
    await page.keyboard.press('Escape');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P');
    await page.waitForSelector('.quick-input-widget input');
    await page.keyboard.type(title, { delay: 5 });
    // The list filters a moment after the input changes
    await page.waitForTimeout(600);
    const rows = await page.$$eval('.quick-input-list .monaco-list-row .label-name', (els) =>
      els.map((el) => el.textContent.trim()),
    );
    const idx = rows.indexOf(title);
    if (idx < 0) {
      await page.keyboard.press('Escape');
      return log('NOT FOUND, the palette lists:', JSON.stringify(rows.slice(0, 8)));
    }
    for (let i = 0; i < idx; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.keyboard.press('Enter');
    log('ran:', title);
  },

  /** open <workspace-relative path> - Quick Open */
  async open(file) {
    await focusWorkbench();
    await page.keyboard.press('Escape');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+P' : 'Control+P');
    await page.waitForSelector('.quick-input-widget input');
    await page.keyboard.type(file, { delay: 5 });
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter');
    log('opened:', file);
  },

  /** line <n> - move the cursor of the active editor to a line */
  async line(n) {
    await page.keyboard.press('Control+G');
    await page.keyboard.type(String(n));
    await page.keyboard.press('Enter');
  },

  async press(key) {
    await page.keyboard.press(key);
  },
  async type(text) {
    await page.keyboard.type(text, { delay: 10 });
  },
  async wait(ms) {
    await page.waitForTimeout(Number(ms) || 1000);
  },

  /** eval <js> - evaluate in the workbench, print JSON */
  async eval(expr) {
    log(JSON.stringify(await page.evaluate(expr)));
  },

  /** fe <frame selector> ;; <js> - evaluate in the webview that has the selector */
  async fe(arg) {
    const { selector, rest } = splitFrameArg(arg);
    const frame = await frameWith(selector);
    if (!frame) {
      return log('NO FRAME with', selector);
    }
    log(JSON.stringify(await frame.evaluate(rest)));
  },

  /** fclick <frame selector> ;; <element selector> - click in a webview */
  async fclick(arg) {
    const { selector, rest } = splitFrameArg(arg);
    const frame = await frameWith(selector);
    if (!frame) {
      return log('NO FRAME with', selector);
    }
    await frame.click(rest, { timeout: 5000 });
    log('clicked', rest);
  },

  /** fright <frame selector> ;; <element selector> - right-click in a webview */
  async fright(arg) {
    const { selector, rest } = splitFrameArg(arg);
    const frame = await frameWith(selector);
    if (!frame) {
      return log('NO FRAME with', selector);
    }
    await frame.click(rest, { button: 'right', timeout: 5000 });
    log('right-clicked', rest);
  },

  /** pv <js> - evaluate in the slide preview webview */
  async pv(expr) {
    await COMMANDS.fe(`${PREVIEW} ;; ${expr}`);
  },

  /** slides - the slides in the preview thumbnails, and the active one */
  async slides() {
    await COMMANDS.pv(
      `[...document.querySelectorAll('[id^=slide-thumb-]')].map((el) => (el.dataset.active === 'true' ? '> ' : '  ') + el.getAttribute('aria-label'))`,
    );
  },

  /** thumb <n> - click the 1-based slide thumbnail in the preview */
  async thumb(n) {
    await COMMANDS.fclick(`${PREVIEW} ;; #slide-thumb-${Number(n) - 1}`);
  },

  /** menu - the items of the open context menu */
  async menu() {
    log(
      JSON.stringify(
        await page.$$eval('.monaco-menu .action-label', (els) =>
          els.map((el) => el.textContent.trim()).filter(Boolean),
        ),
      ),
    );
  },

  /** menuclick <label> - click an item of the open context menu */
  async menuclick(label) {
    const result = await page.evaluate((text) => {
      const el = [...document.querySelectorAll('.monaco-menu .action-label')].find(
        (item) => item.textContent.trim() === text,
      );
      if (!el) {
        return 'NOT FOUND';
      }
      el.closest('.action-item').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      el.click();
      return 'clicked';
    }, label);
    log(result, label);
  },

  /** problems - the rows of the Problems panel (open it with `cmd View: Focus Problems (Errors, Warnings, Infos)`) */
  async problems() {
    log(
      JSON.stringify(
        await page.$$eval('.markers-panel .monaco-list-row', (els) =>
          els.map((el) => el.textContent.trim()),
        ),
        null,
        1,
      ),
    );
  },

  /** log [lines] - the end of the Demo Time output channel */
  async log(lines) {
    const logs = join(PROFILE, 'logs');
    const sessions = existsSync(logs) ? readdirSync(logs).sort() : [];
    const session = sessions.at(-1);
    const exthost = session ? join(logs, session, 'window1/exthost') : '';
    const output =
      exthost && existsSync(exthost)
        ? readdirSync(exthost)
            .filter((name) => name.startsWith('output_logging_'))
            .sort()
            .at(-1)
        : undefined;
    const file = output
      ? readdirSync(join(exthost, output)).find((name) => name.includes('Demo Time'))
      : undefined;
    if (!file) {
      return log('no Demo Time log yet');
    }
    const content = readFileSync(join(exthost, output, file), 'utf8')
      .trimEnd()
      .split('\n');
    log(content.slice(-(Number(lines) || 20)).join('\n'));
  },

  /** frames - the URLs of the workbench and webview frames */
  async frames() {
    for (const frame of page.frames()) {
      log(frame.url().slice(0, 140));
    }
  },

  /** quit - close VS Code and stop the driver */
  async quit() {
    await app?.close().catch(() => {});
    app = null;
    page = null;
  },

  help() {
    log('commands:', Object.keys(COMMANDS).join(', '));
  },
};

log('driver ready');

// One command at a time, in the order they come in
for await (const line of readline.createInterface({ input: process.stdin })) {
  const text = line.trim();
  const space = text.indexOf(' ');
  const cmd = space < 0 ? text : text.slice(0, space);
  const arg = space < 0 ? '' : text.slice(space + 1);
  if (cmd) {
    const fn = COMMANDS[cmd];
    if (!fn) {
      log('unknown command:', cmd, '- try: help');
    } else if (!page && !['launch', 'help', 'quit', 'log'].includes(cmd)) {
      log('ERROR: launch first');
    } else {
      try {
        await fn(arg);
      } catch (e) {
        log('ERROR:', e.message);
      }
    }
    log(`DONE ${cmd}`);
  }
  if (cmd === 'quit') {
    process.exit(0);
  }
}
