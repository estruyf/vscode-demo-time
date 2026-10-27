---
name: run-vscode-extension
description: Build, run, and drive the Demo Time VS Code extension in a real VS Code window. Use when asked to run, start, launch, test, or screenshot the extension, its slide preview, overview or other webviews, to check a change in the running extension instead of only the unit tests, or to run a play's scenes against a sample workspace.
---

The Demo Time extension (`apps/vscode-extension`, with its webviews from `apps/webviews` and shared
code from `packages/common`) runs inside a real VS Code. An agent drives it with
`.claude/skills/run-vscode-extension/driver.mjs`, a Playwright REPL, through the
`.claude/skills/run-vscode-extension/dt.sh` wrapper. Every launch uses a fresh VS Code profile, the
packaged VSIX and a **copy** of the workspace in `/tmp/dt-run`, so nothing lands in the repository.

All paths are relative to the repository root. Verified on macOS (Apple silicon) with VS Code
1.143.1. It opens a real VS Code window on the screen: tell the user, and don't let them touch it
while it runs. Not tried on Linux, where it would need `xvfb-run` around the driver.

## Setup

Once, for the driver's own dependencies (`playwright-core`, `@vscode/test-electron`):

```bash
npm install --prefix .claude/skills/run-vscode-extension
```

## Build

Build the extension and package it as a VSIX. Run this again after every code change: the driver
installs this file, not the source.

```bash
npm run vscode:build
git checkout -- apps/vscode-extension/src/webview/WebviewHtml.ts
mkdir -p .vscode-test
cd apps/vscode-extension && npx --yes @vscode/vsce package --no-dependencies -o ../../.vscode-test/demo-time.vsix; cd ../..
```

## Run (agent path)

```bash
DT=.claude/skills/run-vscode-extension/dt.sh
$DT start                                  # starts the driver in the background
$DT launch                                 # VS Code with a copy of examples/pitch
$DT ss 01-launch                           # -> /tmp/dt-run/shots/01-launch.png
$DT stop                                   # closes VS Code and the driver
```

For another workspace, pass its path: `$DT launch /path/to/presentation-sample` (after a
`$DT stop` and `$DT start` when VS Code is already running). Each `$DT <command>` waits until the
driver prints `DONE <command>` and shows its output. The first `launch` downloads the stable VS
Code into `.vscode-test/` (~310 MB, gitignored). Look at the screenshots: an empty editor with the
**DT** item and `API: 3710` in the status bar means the extension is up.

A typical slide preview check:

```bash
$DT cmd Notifications: Clear All Notifications
$DT open .demo/slides/intro.md
$DT cmd Demo Time: Open slide preview
$DT wait 4000
$DT slides                                  # thumbnails, `>` marks the active slide
$DT thumb 2                                 # click the 2nd thumbnail
$DT fright '.slide__container ;; #slide-thumb-1'   # right-click a thumbnail
$DT menu                                    # the context menu items
$DT menuclick Show slide contents
$DT line 12                                 # cursor to line 12, the preview follows
$DT cmd 'View: Focus Problems (Errors, Warnings, Infos)'
$DT problems
$DT log 20                                  # the Demo Time output channel
```

Run a scene, or read the play, through the Demo Time API (the driver turns `demoTime.api.enabled`
on):

```bash
curl -s "http://localhost:3710/api/runById?id=<scene id>"
curl -s "http://localhost:3710/api/demos"
```

| command                                           | what it does                                                                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `launch [workspace]`                              | fresh profile, install `.vscode-test/demo-time.vsix`, copy the workspace (default `examples/pitch`) to `/tmp/dt-run/ws`, open it |
| `ss <name>`                                       | screenshot of the window to `/tmp/dt-run/shots/<name>.png`                                                                       |
| `cmd <title>`                                     | run a command palette command by its exact title                                                                                 |
| `open <path>`                                     | Quick Open a workspace file                                                                                                      |
| `line <n>`                                        | move the cursor of the active editor to line `n`                                                                                 |
| `press <key>` / `type <text>` / `wait <ms>`       | keyboard input, pause                                                                                                            |
| `eval <js>`                                       | evaluate in the workbench, print JSON                                                                                            |
| `fe <frame selector> ;; <js>`                     | evaluate in the webview that contains the selector                                                                               |
| `fclick` / `fright <frame selector> ;; <element>` | click / right-click in a webview                                                                                                 |
| `fdrag <frame selector> ;; <element> ;; <x,y> ...` | drag the mouse through points given as fractions (0-1) of the element box, like drawing on `.slide__drawing` |
| `pv <js>`                                         | evaluate in the slide preview webview                                                                                            |
| `slides` / `thumb <n>`                            | list / click the preview thumbnails (1-based)                                                                                    |
| `menu` / `menuclick <label>`                      | list / click the items of the open context menu                                                                                  |
| `problems`                                        | the rows of the Problems panel                                                                                                   |
| `log [lines]`                                     | the end of the Demo Time output channel                                                                                          |
| `frames`                                          | the URLs of the workbench and webview frames                                                                                     |
| `quit`                                            | close VS Code (use `dt.sh stop`)                                                                                                 |

Webview selectors: the preview has `.slide__container` (thumbnails `#slide-thumb-<0-based>`, the
notes pane is the `textarea`), the overview has the text `Expand All`
(`fclick text=Expand All ;; text=<card title>`).

Environment: `DT_RUN_DIR` (default `/tmp/dt-run`), `DT_VSIX`, `DT_WORKSPACE`, `VSCODE_VERSION`
(default `stable`), `VSCODE_EXE` (use an installed VS Code instead of the download), `DT_TIMEOUT`
(seconds per command, default 300).

## Run (human path)

The **Launch Extension** configuration in `.vscode/launch.json` (`F5`) runs the extension in
Development mode, with the webviews from the Vite dev server of `npm run vscode:dev`. Not covered by
this skill.

## Test

```bash
npm test
```

Runs the Jest suites of the extension, `packages/common` and `apps/video`; all pass.

## Gotchas

- **Use the VSIX, not `--extensionDevelopmentPath`.** In Development mode the webviews load from
  `http://localhost:5173` (`getWebviewHtml.ts`), so without `npm run vscode:dev` running they are
  blank.
- **`npm run vscode:build` rewrites `apps/vscode-extension/src/webview/WebviewHtml.ts`** with a new
  asset hash. Check it out again so it doesn't end up in a commit.
- **`vsce package -o` doesn't create the folder**: `ENOENT ... .vscode-test/demo-time.vsix` without
  the `mkdir -p .vscode-test`.
- **A focused webview swallows `Cmd+P` / `Cmd+Shift+P`.** After a scene opens the preview, Quick
  Open and the palette time out (`waiting for locator('.quick-input-widget input')`). The driver
  blurs the webview first in `cmd` and `open`; do the same in new keyboard commands.
- **Native macOS menus and dialogs are invisible to Playwright.** The profile sets
  `window.menuStyle: custom`, so the webview context menu is DOM (`menu`), and
  `files.simpleDialog.enable`, so save dialogs (like **Export slides to PDF**) are a quick input you
  confirm with `press Enter`. Without it the export waits on a dialog forever.
- **The first right-click on a thumbnail that isn't active can show no menu**, as it selects the
  slide first. Run `fright` again.
- **`/tmp`, not `os.tmpdir()`.** VS Code puts IPC sockets in the profile, and macOS caps a socket
  path at 104 bytes.
- **`VSCODE_*` / `ELECTRON_*` variables** from a VS Code terminal make the child try to talk to the
  parent. The driver strips them.
- **Slide numbers in headers and footers count the slides of all act files** of the workspace, so
  they depend on the workspace you launch, not only the deck.
- **PDF export and next slide screenshots need `playwright-chromium` in the workspace**
  (`npm i -D playwright-chromium` in `/tmp/dt-run/ws`), and the export stops at the first slide with
  a missing `customTheme` file.

## Troubleshooting

- **`No VSIX at .vscode-test/demo-time.vsix`**: run the Build section.
- **`The driver is not running`**: `dt.sh start` first. It also happens after `quit` or a crash;
  `cat /tmp/dt-run/log` shows why.
- **`NOT FOUND, the palette lists: [...]`**: the title isn't exact. Pick it from the list, for
  example `View: Focus Problems (Errors, Warnings, Infos)`.
- **`NO FRAME with .slide__container`**: the preview isn't open, or another editor covers it.
