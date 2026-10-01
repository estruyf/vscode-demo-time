import { describe, it, expect } from '@jest/globals';
import { getNextSlideIndex } from '../src/utils/getNextSlideIndex';

const deck = (length: number, hidden: number[] = []) =>
  Array.from({ length }, (_, idx) => ({ frontmatter: hidden.includes(idx) ? { hide: true } : {} }));

describe('getNextSlideIndex', () => {
  it('returns the next slide of the current deck', () => {
    expect(getNextSlideIndex(true, 2, 5, deck(10))).toBe(3);
  });

  it('uses the 1-based slide of the next scene when the deck has no next slide', () => {
    expect(getNextSlideIndex(false, 4, 3, deck(10))).toBe(2);
  });

  it('returns the first slide when the next scene has no slide', () => {
    expect(getNextSlideIndex(false, 4, undefined, deck(10))).toBe(0);
    expect(getNextSlideIndex(false, 4, 0, deck(10))).toBe(0);
  });

  it('falls back to the first slide when the index is out of range', () => {
    expect(getNextSlideIndex(false, 0, 20, deck(10))).toBe(0);
    expect(getNextSlideIndex(true, 9, undefined, deck(10))).toBe(0);
  });

  it('skips hidden slides while presenting', () => {
    expect(getNextSlideIndex(true, 2, undefined, deck(10, [3, 4]), true)).toBe(5);
    expect(getNextSlideIndex(false, 4, undefined, deck(10, [0]), true)).toBe(1);
    expect(getNextSlideIndex(false, 4, 3, deck(10, [2]), true)).toBe(3);
  });

  it('keeps hidden slides outside presentation mode', () => {
    expect(getNextSlideIndex(true, 2, undefined, deck(10, [3, 4]))).toBe(3);
    expect(getNextSlideIndex(false, 4, undefined, deck(10, [0]))).toBe(0);
  });
});
