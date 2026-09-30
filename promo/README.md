# The promo videos

Two cuts of Demo Time, both [Remotion](https://www.remotion.dev) — React rendered to frames, so the
timeline is a table of frame numbers in a `.tsx` file and changing the pace is changing a number and
re-rendering.

| Composition |     |                                                                                                                            |
| ----------- | --- | -------------------------------------------------------------------------------------------------------------------------- |
| `Promo`     | 40s | Script the demo once; one click runs each scene: a slide, code, typing. The landing page's pitch.                          |
| `Tour`      | 90s | Every screen: acts, scenes and slides, the act editor, the overview, highlights, typing, the terminal, the presenter view. |

Plus a captionless GIF of the typing beat, for places that do not play video.

Nothing here is part of the extension. It has its own `package.json` and its own dependencies, it is
not a Yarn workspace, and the VSIX contains none of it.

## Building them

```bash
npm install

npm run vsix             # builds the extension and packages it into .cache/
npm run capture          # every still and every recorded beat, retaken
npm start                # the Remotion studio, with a scrubbable timeline
npm run render           # out/promo.mp4
npm run render:tour      # out/tour.mp4
npm run web              # docs/public/video: promo.mp4, tour.mp4, poster.jpg, demotime.gif
```

`npm run capture shots` and `npm run capture clips` do half each; naming a shot or a beat does just
that one.

**The capture opens a real VS Code window and drives it.** Leave the mouse alone until it is done.
The first run downloads the pinned VS Code build (~300 MB) into `.cache/vscode`.

## Where the pictures come from

Everything on screen is the real extension, running, in real VS Code, driven by Playwright. Nothing
is a mock-up.

`scripts/harness.mjs` makes every run the same:

- **VS Code is pinned** (`VSCODE_VERSION`), not whatever is installed.
- **The extension is the packaged VSIX**, installed into an empty extensions folder, so it runs in
  production mode exactly as the Marketplace build does. The
  [Demo Time theme](https://marketplace.visualstudio.com/items?itemName=eliostruyf.vscode-demotime-theme)
  is installed next to it at a pinned version, and the window uses Demo Time Dark.
- **The profile, the extensions folder and the workspace are fresh copies** in the temp dir on every
  run.
- **The terminal is plain bash with a HOME of its own**, so the capturing machine's prompt, fonts
  and clock never reach a frame.

`demo/ship-it` is the only thing any of this touches: a small URL-shortener talk by Elio Struyf,
with three acts, four slides and speaker notes. Its `.vscode/settings.json` turns the status bar
clock off, sets the highlight (no border, the selection background kept, everything around it
blurred and dimmed), and gives every slide the talk's own theme and footer:

- `.demo/slides/ship-it.css`: the "Ship it" theme, a custom theme on top of the default one. Deep
  navy, Demo Time yellow, a dot grid, a yellow kicker on the intro layout, numbered cards in the
  two-column agenda, and a full-bleed yellow section slide.
- `.demo/templates/footer.html`: the footer on every slide.

Settings in the throwaway profile that a real user could also have, and why:

- `typescript.validate.enable: false`: the fixture has no `node_modules`, so every `node:http`
  import would otherwise be an error.
- `json.schemaDownload.trustedDomains`: trusts demotime.show, which is the "trust" a user clicks
  once. Without it, each act file shows a warning.
- `terminal.integrated.shellIntegration.decorationsEnabled: never`: Demo Time waits for shell
  integration before it runs a command, so it stays on; only its gutter dots are hidden.

**Stills** go to `public/shots/*.png`, one per screen, at 2x. The presenter view opens in a window
of its own, the way it does for a speaker, so that still is taken from the second window at its own
1024×768.

**Recorded beats** go to `public/clips/*.mp4`, at a constant 30 fps. Each is `{ prepare, run }` and
only `run` is recorded. Every beat is driven the way a presenter drives a talk: one click on the
status bar button that names the next scene. `public/clips.json` records how long each one is and
the compositions read it.

The slide shots (the `slides` and `toCode` beats and the `recap` still) are taken with the Primary
Side Bar closed, so the slide gets the whole window. The pointer stays on the status bar in those: a
hover over the slide brings up its floating toolbar, and it only goes away 5s after the last mouse
move over it.

The screencast does not draw the pointer, so the harness draws a dot where the mouse is. It is the
only thing in any frame the extension did not draw.

## How a shot is put together

Each recorded beat **holds** on its first frame while the caption is read, **plays**, and holds
again where it comes to rest (`Clip` in [`src/components/Shot.tsx`](src/components/Shot.tsx)). The
typing and terminal beats then push in from the whole window to the editor once the click is done
(`DeskBeat` in [`src/beats.tsx`](src/beats.tsx)).

Every crop is a named rectangle in the capture's own 2560×1640 pixels, in
[`src/crops.ts`](src/crops.ts), with a note on which gap each edge falls in.

## Rules that matter

- **The extension is never retouched.** The claims in a caption are ones it makes on screen in the
  same shot. The drawn pointer is the one exception.
- **Every crop edge falls inside the app, or is the window's own edge.**
- **Nothing is sped up.** A beat that runs long gets its pauses shortened in `scripts/capture.mjs`
  and is re-recorded.
- **They read without sound.**
- **The copy sounds like the README.** Plain, specific, no marketing.

## Re-cutting after the UI changes

Run `npm run vsix && npm run capture`, then check the two things that don't update themselves:

- **Crops** in `src/crops.ts`. A layout change moves the gaps a crop was ending in. `TERMINAL_PUSH`
  was measured off the last frame of `run.mp4`.
- **Click frames** noted at the top of `src/Promo.tsx` and `src/Tour.tsx`: the `pushAt` values have
  to land just after the click.

Check a frame with

```bash
npx remotion still src/index.ts Promo out/check.png --frame=N
```

before spending the minutes on a full render.
