import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

const onPath = (name: string): string | undefined => {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    const candidate = dir && join(dir, exe);
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
};

const fromFfmpegStatic = (): string | undefined => {
  try {
    // Optional dependency: a static ffmpeg build for the platform, downloaded on install.
    const path = require('ffmpeg-static') as string | null;
    return path && existsSync(path) ? path : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Finds ffmpeg: the one named on the command line, `FFMPEG`, the `ffmpeg-static` package, then
 * PATH and the usual install locations.
 */
export const findFfmpeg = (explicit?: string): string => {
  const candidates = [
    explicit,
    process.env.FFMPEG,
    fromFfmpegStatic(),
    onPath('ffmpeg'),
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
  ];
  const found = candidates.find((path) => path && existsSync(path));
  if (!found) {
    throw new Error(
      'ffmpeg not found. Install it (https://ffmpeg.org/download.html), or pass --ffmpeg <path>.',
    );
  }
  return found;
};

export const runFfmpeg = (ffmpeg: string, args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-4000);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}:\n${stderr.trim()}`));
      }
    });
  });

/**
 * Encodes a numbered JPEG sequence to H.264, scaled and letterboxed to exactly `width`×`height`,
 * with chapters from an ffmpeg metadata file when one is given.
 */
export const encodeMp4 = (
  ffmpeg: string,
  options: {
    framesPattern: string;
    fps: number;
    width: number;
    height: number;
    out: string;
    metadataFile?: string;
  },
): Promise<void> => {
  const { framesPattern, fps, width, height, out, metadataFile } = options;
  const filter = [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
    'format=yuv420p',
  ].join(',');

  return runFfmpeg(ffmpeg, [
    '-framerate',
    String(fps),
    '-i',
    framesPattern,
    ...(metadataFile ? ['-i', metadataFile, '-map_metadata', '1', '-map_chapters', '1'] : []),
    '-map',
    '0:v',
    '-vf',
    filter,
    '-c:v',
    'libx264',
    '-crf',
    '18',
    '-preset',
    'medium',
    '-r',
    String(fps),
    '-movflags',
    '+faststart',
    out,
  ]);
};

/** A looping GIF with its own palette, which keeps code and slide colors clean. */
export const encodeGif = (
  ffmpeg: string,
  options: { input: string; out: string; width: number; fps: number },
): Promise<void> =>
  runFfmpeg(ffmpeg, [
    '-i',
    options.input,
    '-vf',
    [
      `fps=${options.fps}`,
      `scale=${options.width}:-2:flags=lanczos`,
      'split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
    ].join(','),
    '-loop',
    '0',
    options.out,
  ]);
