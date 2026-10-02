import { SlideMetadata } from '../models';
import { toBoolean } from './toBoolean';

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
