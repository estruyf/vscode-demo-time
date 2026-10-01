# @demotime/video

Export a [Demo Time](https://demotime.show) play as a video. It runs the play unattended in VS Code,
records the window, and writes an MP4, plus a GIF, captions and chapters if you ask for them.

When the demo changes, you run it again. No screen recording, no editing.

📖 **Documentation**:
[demotime.show/features/video-export](https://demotime.show/features/video-export/)

## Run it from a terminal

You don't need to open VS Code or install anything first. From the folder that contains your `.demo`
folder:

```bash
npx @demotime/video export
```

The CLI opens its own VS Code window with an empty profile and installs the Demo Time extension into
it from the Marketplace. The VS Code you work in and its extensions aren't touched.

The files go to `.demo/exports`:

| File                | What it is                                                       |
| ------------------- | ---------------------------------------------------------------- |
| `demo.mp4`          | The video, with chapters when you ask for them                   |
| `demo.gif`          | With `--gif`                                                     |
| `demo.srt`          | With `--srt`                                                     |
| `demo-chapters.txt` | With `--chapters`, as `0:00 Title` lines for a video description |
| `demo-events.jsonl` | When each scene and slide started, and which moves were skipped  |

In VS Code, **Demo Time: Export play as video** runs this same CLI for you. It uses the VS Code
you're running, your theme and your fonts.

## Examples

```bash
# The second act as a vertical video with captions from the scene notes
npx @demotime/video export --range act:2 --preset 9:16 --captions notes

# A GIF of scenes 1 to 3 of the first act, for a README
npx @demotime/video export --range act:1/scenes:1-3 --gif --name readme

# Everything, with your theme, in a specific folder
npx @demotime/video export ./my-talk --out ./videos --gif --srt --chapters --cards \
  --extensions eliostruyf.vscode-demotime-theme --settings ./recording-settings.json
```

`recording-settings.json` holds VS Code settings for the recording, such as
`{ "workbench.colorTheme": "Demo Time Dark" }`.

## Options

| Option                                       | What it does                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `[workspace]`                                | The folder with the `.demo` folder (default: the current folder)         |
| `--range <range>`                            | `all` (default), `act:2`, `act:2/scenes:3-5` or `act:2/scenes:3-`        |
| `--preset <preset>`                          | `16:9` (1920×1080, default), `1:1` (1080×1080) or `9:16` (1080×1920)     |
| `--fps <n>`                                  | Frame rate (default 30)                                                  |
| `--out <dir>`, `--name <name>`               | Where the files go (default `<workspace>/.demo/exports/demo.*`)          |
| `--gif`, `--gif-width <px>`, `--gif-fps <n>` | Also write a GIF (default 960 pixels wide, 12 fps)                       |
| `--srt`                                      | Also write captions as `<name>.srt`, from scene titles                   |
| `--captions titles\|notes`                   | What the captions say: scene titles (default) or notes; implies `--srt`  |
| `--chapters`                                 | Add chapters to the MP4 and write a chapter list                         |
| `--cards`, `--card-seconds <n>`              | Add a title and end card from the first and last slide                   |
| `--strict`                                   | Fail when a move cannot be recorded, instead of skipping it              |
| `--show-notes`                               | Keep notes that open with `showOnTrigger` in the video                   |
| `--vscode <path>`                            | The VS Code to record in (default: the installed one)                    |
| `--vscode-version <v>`                       | Download this VS Code version instead: `stable`, `insiders` or `1.105.0` |
| `--extension <id\|vsix>`                     | The Demo Time to install (default: the latest from the Marketplace)      |
| `--extensions <ids>`                         | More extensions to install, comma separated, such as your theme          |
| `--settings <file>`                          | A JSON file with VS Code settings for the recording                      |
| `--vscode-arg=<arg>`                         | An extra argument for VS Code, such as `--vscode-arg=--disable-gpu`      |
| `--in-place`                                 | Run in the workspace itself instead of a copy                            |
| `--copy-node-modules`                        | Copy `node_modules` into the workspace copy instead of linking them      |
| `--keep-temp`                                | Keep the temporary profile, workspace copy and frames                    |
| `--scene-hold <s>`                           | Seconds a scene without slides stays on screen (default 2)               |
| `--slide-min <s>`, `--slide-max <s>`         | The shortest and longest time a slide stays on screen (default 3 and 12) |
| `--terminal-timeout <s>`                     | Seconds a terminal command gets to finish (default 30)                   |
| `--timeout <minutes>`                        | Give up after this long (default 60)                                     |
| `--ffmpeg <path>`                            | The ffmpeg to use (default: the bundled one, then `FFMPEG` or `PATH`)    |

`npx @demotime/video --help` lists them too.

## Captions

`--srt` writes the captions as `<name>.srt`, a subtitle file next to the MP4. They aren't burned
into the picture. Players such as VLC load the file when it has the same name as the video, and
YouTube, Vimeo and LinkedIn take it as the video's subtitles.

- **`--captions titles`** (the default): each scene's title, for its first 4 seconds.
- **`--captions notes`**: the scene's notes file turned into plain-text sentences, in cues of at
  most two lines. The cues are spread over the scene, and the scene stays on screen long enough to
  read them. Scenes without notes get their title.

The [documentation](https://demotime.show/features/video-export/#captions) shows examples of both,
and how to burn the captions into the picture for social media.

## How it works

1. **A copy of the workspace.** The play runs in a temporary copy, so every export starts from the
   same state and the files it creates or changes don't end up in your workspace. Symbolic links are
   copied as the files they point to. `node_modules` folders are linked instead of copied, so
   scripts in the demo run without a long copy; a demo that installs packages therefore changes your
   real `node_modules`, unless you pass `--copy-node-modules`.
2. **A clean VS Code.** VS Code opens with an empty profile and no Chat, tips or other UI. The
   window is sized for the preset, and Demo Time and any extensions you name are installed into the
   profile.
3. **The play runs unattended.** Demo Time plays every scene in the range the way a presenter would,
   and hides the status bar, tabs, side bars and panel. After a scene's moves finish, it stays on
   screen for the scene's `autoAdvanceAfter`. Without one, a slide stays for its reading time and
   other scenes for 2 seconds. Terminal commands get up to 30 seconds to finish
   (`--terminal-timeout`).
4. **Moves that need a presenter are handled.**
   - `pause` and `waitForInput` continue after a second.
   - Hacker-typer typing becomes character by character.
   - Moves outside VS Code (an external browser, PowerPoint, desktop and macOS moves) are skipped
     with a warning.
5. **The window is recorded.** The DevTools screencast captures only the VS Code window, not the
   rest of your screen. The frames are resampled to a fixed frame rate and cut from the first to the
   last scene.
6. **ffmpeg encodes the files.** It writes the MP4 with its chapters and the GIF. The CLI writes the
   captions and the chapter list from the timing of each scene.

## Run it in CI

The export needs no one at the keyboard, so CI can keep the video in sync with the demo. On Linux,
run it under a virtual display:

```yaml
- run: >
    xvfb-run -a npx --yes @demotime/video export . --vscode-version stable --out video --gif
    --chapters --srt
- uses: actions/upload-artifact@v6
  with:
    name: demo-video
    path: video
```

The [documentation](https://demotime.show/features/video-export/#keep-the-video-in-sync-in-ci) has a
complete workflow.

## Requirements

- **Node.js 20 or later.**
- **VS Code**: the installed one is used. With `--vscode-version`, or when none is installed, it is
  downloaded.
- **Demo Time with video export support**: installed from the Marketplace automatically. Pass
  `--extension` for a specific version or a VSIX.
- **ffmpeg**: a static build is installed with the package. Otherwise pass `--ffmpeg` or set
  `FFMPEG`.
- **A display**: on Linux without one, use `xvfb-run -a`.

While it records, a VS Code window opens on your screen. Leave it alone until it closes.

## Limitations

- Only the main VS Code window is recorded: not the presenter view, other windows, native dialogs or
  other apps.
- The play runs in a copy of the workspace folder. For paths outside the folder, or a monorepo
  package that needs the parent's `node_modules`, use `--in-place`.
- A terminal command that keeps running, such as a dev server, holds its scene for
  `--terminal-timeout` seconds.

## Beta

Every change on the `dev` branch of Demo Time can be published as a beta:
`npx @demotime/video@next export`. The beta (pre-release) version of the Demo Time extension uses
it.

## Development

```bash
yarn install
npx nx build common
cd apps/video
npm run build
npx jest
node dist/cli.js export ../../promo/demo/ship-it --extension path/to/demo-time.vsix
```

## License

Apache License 2.0. See the [LICENSE](./LICENSE) file.

<br />

<p align="center">
  <a href="https://visitorbadge.io/status?path=https%3A%2F%2Fgithub.com%2Festruyf%2Fvscode-demo-time%2Ftree%2Fmain%2Fapps%2Fvideo">
    <img src="https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fgithub.com%2Festruyf%2Fvscode-demo-time%2Ftree%2Fmain%2Fapps%2Fvideo&labelColor=%23555555&countColor=%2397ca00" height="25px" alt="Demo Time video CLI visitors" />
  </a>
</p>
