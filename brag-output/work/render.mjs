// Renders index.html frame by frame. Usage:
//   node render.mjs stills 0.6 5.6 ...   -> work/stills/t-<t>.png
//   node render.mjs video                -> work/video.mp4 (silent, 20s @ 30fps)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = path.resolve(here, '../../node_modules/ffmpeg-static/ffmpeg');
const FPS = 30, DURATION = 20;
const [mode, ...args] = process.argv.slice(2);

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--allow-file-access-from-files', '--hide-scrollbars', '--font-render-hinting=none'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(here, 'index.html'));
const fontsOk = await page.evaluate(() => window.ready());
if (!fontsOk) console.warn('Fonts did not load');

const shot = async (t) => {
  await page.evaluate((t) => window.render(t), t);
  return page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' });
};

if (mode === 'stills') {
  const dir = path.join(here, 'stills');
  mkdirSync(dir, { recursive: true });
  for (const a of args) {
    const t = Number(a);
    const buf = await shot(t);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(path.join(dir, `t-${t.toFixed(2)}.png`), buf);
  }
  console.log('stills in', dir);
} else if (mode === 'video') {
  const out = path.join(here, 'video.mp4');
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = FPS * DURATION;
  for (let f = 0; f < total; f++) {
    const buf = await shot(f / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`frame ${f}/${total}\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(out);
}
await browser.close();
