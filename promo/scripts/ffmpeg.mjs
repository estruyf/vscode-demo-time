// Where ffmpeg is. Run by absolute path rather than looked up on PATH: the
// usual install locations, or FFMPEG=/path/to/ffmpeg to name another.

import { existsSync } from 'node:fs';

const CANDIDATES = [
  process.env.FFMPEG,
  '/opt/homebrew/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  '/usr/bin/ffmpeg',
];

export const FFMPEG = CANDIDATES.find((path) => path && existsSync(path));

if (!FFMPEG) {
  throw new Error('ffmpeg not found — install it, or set FFMPEG=/path/to/ffmpeg');
}
