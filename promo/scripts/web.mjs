// Re-encodes the two renders for the web and drops them, with a poster and a
// GIF, into the docs site's public/video/ — demotime.show serves them from
// there.
//
//   npm run web
//
// The renders in out/ are the masters — CRF 17 — and they are
// what to upload anywhere that re-encodes for you. These are the copies the
// landing page serves, so they are sized for a first visit rather than for an
// archive: no audio track at all (both cuts are silent by design), `faststart`
// so the browser can begin on the first packet instead of waiting for the index,
// and the tour dropped to 720p because it plays into a box that is never wider
// than half the page.

import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FFMPEG } from './ffmpeg.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../out');
// Where the page that serves these lives. Point it at the app's own static dir.
const VIDEO = resolve(HERE, '../../docs/public/video');

mkdirSync(VIDEO, { recursive: true });

const ffmpeg = (args) =>
  execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    stdio: 'inherit',
  });
const mb = (path) => `${(statSync(path).size / 1024 / 1024).toFixed(1)} MB`;

const encode = (from, to, scale) => {
  ffmpeg([
    '-i',
    join(OUT, from),
    ...(scale ? ['-vf', `scale=${scale}:flags=lanczos`] : []),
    '-c:v',
    'libx264',
    '-crf',
    '25',
    '-preset',
    'slow',
    '-profile:v',
    'high',
    '-level',
    '4.0',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    join(VIDEO, to),
  ]);
  console.log(`public/video/${to} — ${mb(join(VIDEO, to))}`);
};

encode('promo.mp4', 'promo.mp4', null);
encode('tour.mp4', 'tour.mp4', '1280:720');

// The poster is where the slides beat comes to rest: the agenda slide, in the
// talk's own theme, pushed in. A poster of the title card would be a picture of a
// logo, which is what the page above it already is.
ffmpeg([
  '-i',
  join(OUT, 'promo.mp4'),
  '-vf',
  "select='eq(n\\,355)'",
  '-frames:v',
  '1',
  '-q:v',
  '4',
  join(VIDEO, 'poster.jpg'),
]);
console.log(`public/video/poster.jpg — ${mb(join(VIDEO, 'poster.jpg'))}`);

// A README loop. GitHub READMEs and extension/app store pages do not play video
// inline; they do play a GIF. One recorded beat, no captions (the README's own
// text is its caption), 12 fps, ~960px wide, one palette for the whole clip so
// flat UI colours do not dither. Set README_BEAT to null to skip it.
const README_BEAT = 'typing';
// CODE_PUSH in src/crops.ts: the editor, where the route types itself in. The
// click on the status bar that starts it is outside this crop, so the GIF
// starts after it.
const README_CROP = 'crop=1854:1188:706:172';
const README_FROM = 1.9; // seconds into the clip
if (README_BEAT) {
  const gif = join(VIDEO, 'demotime.gif');
  ffmpeg([
    '-ss',
    String(README_FROM),
    '-i',
    resolve(HERE, `../public/clips/${README_BEAT}.mp4`),
    '-vf',
    [
      'fps=12',
      ...(README_CROP ? [README_CROP] : []),
      'scale=960:-1:flags=lanczos',
      'split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
    ].join(','),
    '-loop',
    '0',
    gif,
  ]);
  console.log(`public/video/demotime.gif — ${mb(gif)}`);
}
