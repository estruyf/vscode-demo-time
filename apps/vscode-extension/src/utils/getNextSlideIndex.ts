import { getNextSlideIdx, getVisibleSlideIdx, Slide } from '@demotime/common';

/**
 * Get the 0-based index of the slide shown next in the presenter view preview.
 *
 * @param hasNextSlide - Whether the current deck still has a next slide
 * @param crntSlideIdx - The 0-based index of the current slide
 * @param stepSlide - The 1-based `slide` of the next scene's `openSlide` move
 * @param slides - The slides of the target deck
 * @param skipHidden - Whether hidden slides (`hide: true`) are skipped, as they are while presenting
 */
export const getNextSlideIndex = (
  hasNextSlide: boolean,
  crntSlideIdx: number,
  stepSlide: number | undefined,
  slides: Pick<Slide, 'frontmatter'>[],
  skipHidden = false,
): number => {
  if (hasNextSlide) {
    return getNextSlideIdx(slides, crntSlideIdx, skipHidden) ?? 0;
  }

  let slideIndex = 0;
  if (typeof stepSlide === 'number' && stepSlide > 0) {
    // Same conversion as `Preview.show`: the `slide` property is 1-based
    slideIndex = stepSlide - 1;
  }

  if (slideIndex < 0 || slideIndex >= slides.length) {
    slideIndex = 0;
  }

  return skipHidden ? getVisibleSlideIdx(slides, slideIndex) : slideIndex;
};
