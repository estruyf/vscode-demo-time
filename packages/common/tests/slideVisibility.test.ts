import { describe, it, expect } from '@jest/globals';
import {
  getNextSlideIdx,
  getPreviousSlideIdx,
  getVisibleSlideIdx,
  getVisibleSlides,
  isSlideHidden,
} from '../src/utils/slideVisibility';
import { SlideParser } from '../src/services/SlideParser';
import { SlideMetadata } from '../src/models';

// A quoted `"true"` in the frontmatter is parsed as a string
const slide = (hide?: boolean | string) => ({
  frontmatter: (hide === undefined ? {} : { hide }) as SlideMetadata,
});

describe('slideVisibility', () => {
  it('detects hidden slides', () => {
    expect(isSlideHidden(slide(true))).toBe(true);
    expect(isSlideHidden(slide('true'))).toBe(true);
    expect(isSlideHidden(slide(false))).toBe(false);
    expect(isSlideHidden(slide())).toBe(false);
    expect(isSlideHidden(undefined)).toBe(false);
  });

  it('parses hide from the slide frontmatter', () => {
    const slides = new SlideParser().parseSlides(`---
hide: true
---

# Hidden

---
layout: default
---

# Visible`);

    expect(isSlideHidden(slides[0])).toBe(true);
    expect(isSlideHidden(slides[1])).toBe(false);
  });

  it('skips hidden slides when getting the next slide', () => {
    const slides = [slide(), slide(true), slide(true), slide()];
    expect(getNextSlideIdx(slides, 0)).toBe(3);
    expect(getNextSlideIdx(slides, 0, false)).toBe(1);
    expect(getNextSlideIdx(slides, 3)).toBeUndefined();
    expect(getNextSlideIdx([slide(), slide(true)], 0)).toBeUndefined();
  });

  it('skips hidden slides when getting the previous slide', () => {
    const slides = [slide(), slide(true), slide(true), slide()];
    expect(getPreviousSlideIdx(slides, 3)).toBe(0);
    expect(getPreviousSlideIdx(slides, 3, false)).toBe(2);
    expect(getPreviousSlideIdx(slides, 0)).toBeUndefined();
    expect(getPreviousSlideIdx([slide(true), slide()], 1)).toBeUndefined();
  });

  it('opens a deck on a visible slide', () => {
    expect(getVisibleSlideIdx([slide(), slide()], 1)).toBe(1);
    expect(getVisibleSlideIdx([slide(true), slide()], 0)).toBe(1);
    expect(getVisibleSlideIdx([slide(), slide(true)], 1)).toBe(0);
    expect(getVisibleSlideIdx([slide(true), slide(true)], 1)).toBe(1);
  });

  it('filters the visible slides', () => {
    const slides = [slide(), slide(true), slide()];
    expect(getVisibleSlides(slides)).toEqual([slides[0], slides[2]]);
  });
});
