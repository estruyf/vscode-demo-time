/**
 * Get the 0-based index of the slide shown next in the presenter view preview.
 *
 * @param hasNextSlide - Whether the current deck still has a next slide
 * @param crntSlideIdx - The 0-based index of the current slide
 * @param stepSlide - The 1-based `slide` of the next scene's `openSlide` move
 * @param totalSlides - The number of slides in the target deck
 */
export const getNextSlideIndex = (
  hasNextSlide: boolean,
  crntSlideIdx: number,
  stepSlide: number | undefined,
  totalSlides: number,
): number => {
  let slideIndex = 0;
  if (hasNextSlide) {
    slideIndex = crntSlideIdx + 1;
  } else if (typeof stepSlide === 'number' && stepSlide > 0) {
    // Same conversion as `Preview.show`: the `slide` property is 1-based
    slideIndex = stepSlide - 1;
  }

  return slideIndex >= 0 && slideIndex < totalSlides ? slideIndex : 0;
};
