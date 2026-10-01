import { describe, it, expect } from '@jest/globals';
import { getNextSlideIndex } from '../src/utils/getNextSlideIndex';

describe('getNextSlideIndex', () => {
  it('returns the next slide of the current deck', () => {
    expect(getNextSlideIndex(true, 2, 5, 10)).toBe(3);
  });

  it('uses the 1-based slide of the next scene when the deck has no next slide', () => {
    expect(getNextSlideIndex(false, 4, 3, 10)).toBe(2);
  });

  it('returns the first slide when the next scene has no slide', () => {
    expect(getNextSlideIndex(false, 4, undefined, 10)).toBe(0);
    expect(getNextSlideIndex(false, 4, 0, 10)).toBe(0);
  });

  it('falls back to the first slide when the index is out of range', () => {
    expect(getNextSlideIndex(false, 0, 20, 10)).toBe(0);
    expect(getNextSlideIndex(true, 9, undefined, 10)).toBe(0);
  });
});
