// Retakes every picture the videos are cut from, in real VS Code with the
// packaged Demo Time extension, against the demo workspace in ../demo/ship-it
// and nothing else.
//
//   node scripts/capture.mjs             everything
//   node scripts/capture.mjs shots       the stills only
//   node scripts/capture.mjs clips       the recorded beats only
//   node scripts/capture.mjs typing run  just those, by name
//
// Needs the packaged extension: `npm run vsix` first, and again after any change
// to the extension that should show up in the video.
//
// Stills land in public/shots/<name>.png at 2x. Recorded beats land in
// public/clips/<name>.mp4 at a constant 30 fps, with public/clips.json naming
// how long each one is — the compositions read that rather than carrying a table
// of frame numbers, so re-recording a beat does not mean re-cutting the piece
// around it.
//
// The stills share one VS Code. Every recorded beat gets a VS Code of its own,
// on a fresh copy of the workspace: a beat that inserts code would otherwise
// leave it in every shot after it.

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  linkSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  hidePointer,
  openApp,
  pointTo,
  pressMouse,
  releaseMouse,
  runCommand,
  settle,
  showActs,
  showPointer,
  tree,
  VIEWPORT,
  webview,
} from './harness.mjs';
import { FFMPEG } from './ffmpeg.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, '../public');
const SHOTS_DIR = join(PUBLIC, 'shots');
const CLIPS_DIR = join(PUBLIC, 'clips');
const TMP = join(PUBLIC, '.frames');

export const CLIP_FPS = 30;

// ---- driving the app -----------------------------------------------------

const pause = (page, ms) => page.waitForTimeout(ms);

/** Glide the pointer to the middle of `target` — a locator in the workbench or
 *  inside a webview; either way its box comes back in window coordinates. */
async function moveTo(page, target, { steps = 26, dx = 0.5, dy = 0.5 } = {}) {
  await target.scrollIntoViewIfNeeded().catch(() => {});
  const box = await target.boundingBox();
  if (!box) {
    throw new Error('moveTo: target has no box');
  }
  await pointTo(page, box.x + box.width * dx, box.y + box.height * dy, { steps });
  return box;
}

/** Move, settle for a beat so the hover state reads, then click. */
async function clickOn(page, target, { before = 320, after = 500, ...move } = {}) {
  await moveTo(page, target, move);
  await pause(page, before);
  await pressMouse(page);
  await pause(page, 90);
  await releaseMouse(page);
  await pause(page, after);
}

/** Send the pointer somewhere nothing reacts to it: the middle of the title
 *  bar. */
async function park(page) {
  await pointTo(page, VIEWPORT.width / 2 + 180, 12, { steps: 6 });
  await pause(page, 260);
}

/** A scene row in the Acts & Scenes tree, by its label ("2. Add the shorten route"). */
const sceneRow = (page, label) =>
  tree(page).locator('.monaco-list-row', { hasText: label }).first();

/** The status bar button that runs the next scene. Its label is the next
 *  scene's title — this is the one-click "next" a presenter uses. */
const nextButton = (page, title) =>
  page
    .locator('.statusbar-item', { hasText: title })
    .filter({ has: page.locator('[class*="dt-logo"], .codicon') })
    .first();

/** Run scenes by clicking their rows, off camera, to put the talk where a shot
 *  needs it. */
async function runScenes(page, labels) {
  for (const label of labels) {
    await sceneRow(page, label).click();
    await pause(page, label.includes('shorten') ? 7000 : label.includes('Try') ? 4000 : 1500);
  }
}

/** Every shot starts here: nothing open, the panel closed, the Resources view
 *  folded away and the Demo Time side bar showing. */
async function reset(page) {
  await page.keyboard.press('Escape');
  await runCommand(page, 'File: Save All Files');
  await runCommand(page, 'View: Close All Editor Groups');
  await runCommand(page, 'View: Single Column Editor Layout');
  if (await page.locator('.part.panel').isVisible()) {
    await runCommand(page, 'View: Toggle Panel Visibility');
  }
  if (await page.locator('.part.auxiliarybar').isVisible()) {
    await runCommand(page, 'View: Toggle Secondary Side Bar Visibility');
  }
  await showActs(page);
  const resources = page.locator('.pane-header[aria-label*="Resources"]');
  if ((await resources.getAttribute('aria-expanded')) === 'true') {
    await resources.click();
  }
  await park(page);
  await settle(page, 600);
}

/** An empty stretch of the status bar. The slide beats keep the pointer down
 *  here and move it only sideways: any pass over the slide preview brings up
 *  its floating toolbar, and it does not always go away again. */
async function parkOnStatusBar(page, steps = 8) {
  await pointTo(page, 700, VIEWPORT.height - 9, { steps });
  await pause(page, 200);
}

/** Put the Primary Side Bar away, for the shots that are about the slides.
 *  The status bar, with the button that runs the next scene, stays. */
async function hideSideBar(page) {
  // Out of the way first: the slide preview grows into the space the side bar
  // leaves, and if that is under the pointer the preview counts it as a hover.
  await parkOnStatusBar(page);
  if (await page.locator('.part.sidebar').isVisible()) {
    await runCommand(page, 'View: Toggle Primary Side Bar Visibility');
  }
  // The slide's floating toolbar comes up on any hover and does not reliably
  // go away when the pointer leaves the webview; it hides on its own 5s after
  // the last mouse move over the slide. So: one pass over it, out to the
  // status bar, and wait that out.
  await pointTo(page, VIEWPORT.width / 2, VIEWPORT.height / 2, { steps: 10 });
  await pointTo(page, VIEWPORT.width / 2 + 20, VIEWPORT.height / 2 + 10, { steps: 4 });
  await parkOnStatusBar(page, 12);
  await pause(page, 5600);
  await settle(page, 600);
}

/** Open an act file; it opens in the act editor, which is the default. */
async function openAct(page, file) {
  await page.keyboard.press('Meta+P');
  await page.keyboard.type(file, { delay: 15 });
  await pause(page, 800);
  await page.keyboard.press('Enter');
  const editor = await webview(page, 'config-editor');
  await editor.getByText('Scenes', { exact: true }).first().waitFor({ state: 'visible' });
  await settle(page, 1500);
  return editor;
}

// ---- stills --------------------------------------------------------------
//
// One per screen. The stills share one VS Code, in this order: each one moves
// the talk forward from where the last left it.

const SHOTS = {
  /** The acts and their scenes in the side bar, the title slide up. */
  async acts(page) {
    await reset(page);
    await runScenes(page, ['1. Welcome']);
    await (await webview(page, 'preview')).locator('.slide__container').waitFor();
    await settle(page, 1200);
  },

  /** The act editor on the build act, one scene open. */
  async editor(page) {
    await reset(page);
    const editor = await openAct(page, '2.build.json');
    await editor.getByText('Add the shorten route', { exact: true }).first().click();
    await settle(page, 1500);
  },

  /** The act editor again, scrolled to the open scene's moves. */
  async moves(page) {
    await reset(page);
    const editor = await openAct(page, '2.build.json');
    await editor.getByText('Add the shorten route', { exact: true }).first().click();
    await settle(page, 1000);
    await editor.getByText('Configure Scene', { exact: false }).first().scrollIntoViewIfNeeded();
    await editor.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find(
        (e) => /^Moves/.test(e.textContent?.trim() ?? '') && e.children.length < 3,
      );
      el?.scrollIntoView({ block: 'start' });
    });
    await settle(page, 1500);
  },

  /** Demo Time's overview of the whole play. */
  async overview(page) {
    await reset(page);
    await runCommand(page, 'Demo Time: Overview');
    await webview(page, 'overview');
    await settle(page, 3000);
  },

  /** A scene that ran: the server, with the handler highlighted. */
  async highlight(page) {
    await reset(page);
    await runScenes(page, ['1. Tour the server']);
  },

  /** The terminal, after the Try it scene. */
  async terminal(page) {
    await reset(page);
    await runScenes(page, ['2. Add the shorten route', '3. Try it']);
    await settle(page, 1500);
  },

  /** The recap slide, which closes everything the demo opened. */
  async recap(page) {
    await reset(page);
    await runScenes(page, ['1. Recap']);
    await hideSideBar(page);
    // Already parked on the status bar; the usual trip to the title bar would
    // cross the slide and bring its toolbar back.
    return { parked: true };
  },
};

/** The presenter view is its own window — the extension moves it out of the
 *  editor on purpose, for the laptop screen while the audience sees the slides.
 *  So it is a still of its own, taken from that second window. */
async function presenterStill(app, page, path) {
  await reset(page);
  await runScenes(page, ['1. Welcome']);
  const opened = app.waitForEvent('window', { timeout: 30_000 });
  await runCommand(page, 'Demo Time: Show presenter view');
  const win = await opened;
  const view = await webview(win, 'presenter');
  await view.getByText('Presenter Notes').first().waitFor({ state: 'visible' });
  await view.getByText('Say hi', { exact: false }).first().waitFor({ state: 'visible' });
  await settle(win, 1500);
  await win.screenshot({ path });
}

// ---- recorded beats ------------------------------------------------------
//
// The moments where something has to *happen*. Each is `{ prepare, run }` and
// only `run` is recorded. Every one is driven the way a presenter drives a
// talk: one click on the status bar button that names the next scene.

const CLIPS = {
  /** From the title slide to the agenda: the next scene is a slide too. */
  slides: {
    async prepare(page) {
      await reset(page);
      await runScenes(page, ['1. Welcome']);
      await hideSideBar(page);
    },
    async run(page) {
      await pause(page, 500);
      await clickOn(page, nextButton(page, "What we'll build"), {
        steps: 34,
        before: 450,
        after: 200,
      });
      // Back along the status bar, off the button so its tooltip stays away.
      await parkOnStatusBar(page, 20);
      await pause(page, 2600);
    },
  },

  /** From the agenda slide to code: one click, the slide makes way for the
   *  server file with its handler highlighted. */
  toCode: {
    async prepare(page) {
      await reset(page);
      await runScenes(page, ['1. Welcome', "2. What we'll build"]);
      await hideSideBar(page);
    },
    async run(page) {
      await pause(page, 500);
      await clickOn(page, nextButton(page, 'Tour the server'), {
        steps: 34,
        before: 450,
        after: 200,
      });
      await parkOnStatusBar(page, 20);
      await pause(page, 2400);
    },
  },

  /** The route types itself in and lights up. */
  typing: {
    async prepare(page) {
      await reset(page);
      await runScenes(page, ['1. Tour the server']);
      await park(page);
      await settle(page, 1000);
    },
    async run(page) {
      await pause(page, 500);
      await clickOn(page, nextButton(page, 'Add the shorten route'), {
        steps: 34,
        before: 450,
        after: 200,
      });
      // Off the status bar, where the button that was clicked has become a
      // shorter one and the pointer would be left hovering over "Notes". Down
      // to the empty bottom of the editor, below the crop the cut pushes in to.
      await pointTo(page, 1100, 765, { steps: 20 });
      // Line by line, then the highlight; wait for the highlight rather than a
      // number of seconds.
      await page
        .locator('.view-lines', { hasText: "'POST /shorten'" })
        .first()
        .waitFor({ timeout: 20_000 });
      await pause(page, 5200);
    },
  },

  /** The terminal command runs on its own. */
  run: {
    async prepare(page) {
      await reset(page);
      await runScenes(page, ['1. Tour the server', '2. Add the shorten route']);
      await park(page);
      await settle(page, 1000);
    },
    async run(page) {
      await pause(page, 500);
      await clickOn(page, nextButton(page, 'Try it'), { steps: 34, before: 450, after: 200 });
      await pointTo(page, 1100, 765, { steps: 20 });
      // The terminal draws to a canvas, so there is no text to wait for; the
      // script finishes in well under a second once the shell is up.
      await page.locator('.part.panel .xterm').first().waitFor({ timeout: 20_000 });
      // The scene is done — and the output printed — when its row in the tree
      // gets its checkmark.
      await sceneRow(page, '3. Try it')
        .locator('.codicon-pass-filled')
        .waitFor({ timeout: 30_000 });
      await pause(page, 2600);
    },
  },
};

// ---- the screencast ------------------------------------------------------

/** Record `clip.run` and write it out as constant-rate h264.
 *
 *  CDP emits a frame when the page paints and not otherwise, so what comes back
 *  is a variable-rate stream with a timestamp on each frame. Resampling it onto
 *  a fixed 30 fps grid here — rather than handing ffmpeg the timestamps — is
 *  what makes a frame number in the timeline mean a fixed number of
 *  milliseconds, which is the whole basis of the cut. */
async function record(page, name, clip) {
  await clip.prepare?.(page);

  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
    frames.push({ t: metadata.timestamp, data });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });

  await showPointer(page);
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: 4096,
    maxHeight: 4096,
    everyNthFrame: 1,
  });
  await clip.run(page);
  await pause(page, 500);
  await cdp.send('Page.stopScreencast');
  await cdp.detach().catch(() => {});

  if (frames.length < 2) {
    throw new Error(`${name}: the page painted ${frames.length} times — nothing to cut`);
  }

  const src = join(TMP, name, 'src');
  const seq = join(TMP, name, 'seq');
  rmSync(join(TMP, name), { recursive: true, force: true });
  mkdirSync(src, { recursive: true });
  mkdirSync(seq, { recursive: true });

  frames.sort((a, b) => a.t - b.t);
  const paths = frames.map((frame, i) => {
    const path = join(src, `${String(i).padStart(5, '0')}.jpg`);
    writeFileSync(path, Buffer.from(frame.data, 'base64'));
    return path;
  });

  const t0 = frames[0].t;
  const count = Math.max(2, Math.round((frames[frames.length - 1].t - t0) * CLIP_FPS));
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    const at = t0 + i / CLIP_FPS;
    while (cursor + 1 < frames.length && frames[cursor + 1].t <= at) {
      cursor++;
    }
    // Hard links rather than copies: most frames of a beat are repeats.
    linkSync(paths[cursor], join(seq, `${String(i).padStart(5, '0')}.jpg`));
  }

  mkdirSync(CLIPS_DIR, { recursive: true });
  const out = join(CLIPS_DIR, `${name}.mp4`);
  execFileSync(
    FFMPEG,
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-framerate',
      String(CLIP_FPS),
      '-i',
      join(seq, '%05d.jpg'),
      '-vf',
      'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v',
      'libx264',
      '-crf',
      '15',
      '-preset',
      'slow',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      out,
    ],
    { stdio: 'inherit' },
  );
  rmSync(join(TMP, name), { recursive: true, force: true });

  console.log(
    `  ${name}.mp4 — ${count} frames, ${(count / CLIP_FPS).toFixed(1)}s (${frames.length} painted)`,
  );
  return { frames: count, fps: CLIP_FPS };
}

// ---- run -----------------------------------------------------------------

const argv = process.argv.slice(2);
const wants = (kind, name) => argv.length === 0 || argv.includes(kind) || argv.includes(name);

const shotNames = Object.keys(SHOTS).filter((n) => wants('shots', n));
if (shotNames.length || wants('shots', 'presenter')) {
  console.log('shots');
  mkdirSync(SHOTS_DIR, { recursive: true });
  const { app, page } = await openApp({ pointer: true });
  for (const name of shotNames) {
    await showPointer(page);
    const result = await SHOTS[name](page);
    // Nothing under the pointer: the row it was left on keeps its hover state
    // even after the dot is hidden.
    if (!result?.parked) {
      await park(page);
    }
    await hidePointer(page);
    await settle(page, 400);
    await page.screenshot({ path: join(SHOTS_DIR, `${name}.png`) });
    console.log(`  ${name}.png`);
  }
  if (wants('shots', 'presenter')) {
    await hidePointer(page);
    await presenterStill(app, page, join(SHOTS_DIR, 'presenter.png'));
    console.log('  presenter.png');
  }
  await app.close();
}

const clipNames = Object.keys(CLIPS).filter((n) => wants('clips', n));
if (clipNames.length) {
  console.log('clips');
  mkdirSync(TMP, { recursive: true });
  const manifestPath = join(PUBLIC, 'clips.json');
  // Merged rather than replaced, so re-recording one beat by name leaves the
  // lengths of the others alone.
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  for (const name of clipNames) {
    const { app, page } = await openApp({ pointer: true });
    try {
      manifest[name] = await record(page, name, CLIPS[name]);
    } finally {
      await app.close();
    }
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  rmSync(TMP, { recursive: true, force: true });
}

if (existsSync(SHOTS_DIR)) {
  console.log(`\n${readdirSync(SHOTS_DIR).length} stills in public/shots`);
}
