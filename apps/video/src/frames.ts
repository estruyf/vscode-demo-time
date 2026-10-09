/**
 * The screencast sends a frame only when the page paints, so what comes back is a variable-rate
 * stream with a timestamp on each frame. These helpers resample it onto a fixed frame rate, so a
 * frame number means a fixed number of milliseconds.
 */

/** Index of the last frame painted at or before `at`, or the first frame when none was. */
export const frameAt = (times: number[], at: number): number => {
  let low = 0;
  let high = times.length - 1;
  let found = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (times[mid] <= at) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
};

/**
 * For each output frame from `from` to `to` (wall-clock milliseconds), the index of the recorded
 * frame to show.
 *
 * @param times - Recorded frame times in milliseconds, sorted.
 * @param toRecorded - Maps milliseconds since `from` in the video to milliseconds since `from` in
 *   the recording, for a video that holds frames longer than they were recorded. By default the
 *   video follows the recording.
 */
export const planFrames = (
  times: number[],
  from: number,
  to: number,
  fps: number,
  toRecorded: (ms: number) => number = (ms) => ms,
): number[] => {
  if (times.length === 0) {
    return [];
  }
  const count = Math.max(1, Math.round(((to - from) * fps) / 1000));
  const plan: number[] = [];
  for (let idx = 0; idx < count; idx++) {
    plan.push(frameAt(times, from + toRecorded((idx * 1000) / fps)));
  }
  return plan;
};

/** `count` copies of one frame, for a still title or end card. */
export const holdFrame = (frame: number, seconds: number, fps: number): number[] =>
  Array(Math.max(0, Math.round(seconds * fps))).fill(frame);
