import { SlideMetadata } from '../models';
import { toBoolean } from './toBoolean';

type SlideLike = { frontmatter?: SlideMetadata } | undefined;

/**
 * Returns whether the slide has `hide: true` in its frontmatter. Hidden slides stay in the deck,
 * but are skipped while presenting.
 */
export const isSlideHidden = (slide: SlideLike): boolean =>
  toBoolean(slide?.frontmatter?.hide) === true;

/**
 * Returns the index of the first slide after `fromIdx`, skipping hidden slides when `skipHidden`
 * is set.
 *
 * @returns The 0-based index, or `undefined` when there is no next slide.
 */
export const getNextSlideIdx = (
  slides: SlideLike[],
  fromIdx: number,
  skipHidden = true,
): number | undefined => {
  for (let idx = Math.max(fromIdx + 1, 0); idx < slides.length; idx++) {
    if (!skipHidden || !isSlideHidden(slides[idx])) {
      return idx;
    }
  }
  return undefined;
};

/**
 * Returns the index of the first slide before `fromIdx`, skipping hidden slides when `skipHidden`
 * is set.
 *
 * @returns The 0-based index, or `undefined` when there is no previous slide.
 */
export const getPreviousSlideIdx = (
  slides: SlideLike[],
  fromIdx: number,
  skipHidden = true,
): number | undefined => {
  for (let idx = Math.min(fromIdx - 1, slides.length - 1); idx >= 0; idx--) {
    if (!skipHidden || !isSlideHidden(slides[idx])) {
      return idx;
    }
  }
  return undefined;
};

/**
 * Returns the slide to show when a deck opens at `targetIdx`: the target itself when it is
 * visible, otherwise the next visible slide, otherwise the previous visible slide. When every
 * slide is hidden, the target is returned as is.
 */
export const getVisibleSlideIdx = (slides: SlideLike[], targetIdx: number): number => {
  if (!isSlideHidden(slides[targetIdx])) {
    return targetIdx;
  }

  return getNextSlideIdx(slides, targetIdx) ?? getPreviousSlideIdx(slides, targetIdx) ?? targetIdx;
};

/**
 * Returns the slides that are shown while presenting.
 */
export const getVisibleSlides = <T extends SlideLike>(slides: T[]): T[] =>
  slides.filter((slide) => !isSlideHidden(slide));
