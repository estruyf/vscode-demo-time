import { SlideMetadata } from '../models';

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return undefined;
};

/**
 * Returns whether the video of a slide should start automatically.
 * `autoplay` is the documented property, `autoPlay` is kept as an alias for existing decks.
 * Without either, background videos (no `controls`) autoplay and videos with controls don't.
 */
export const getVideoAutoplay = (matter?: SlideMetadata): boolean => {
  const autoplay = toBoolean(matter?.autoplay) ?? toBoolean(matter?.autoPlay);
  if (autoplay !== undefined) {
    return autoplay;
  }

  return !matter?.controls;
};
