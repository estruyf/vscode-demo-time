import { describe, it, expect } from '@jest/globals';
import { getDropIndex, moveArrayItem } from '@demotime/common';

describe('moveArrayItem', () => {
  const items = ['a', 'b', 'c', 'd'];

  it('moves an item up', () => {
    expect(moveArrayItem(items, 2, 1)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('moves an item down', () => {
    expect(moveArrayItem(items, 1, 2)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('moves an item to the first position', () => {
    expect(moveArrayItem(items, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('moves an item to the last position', () => {
    expect(moveArrayItem(items, 0, 3)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('does not change the original array', () => {
    moveArrayItem(items, 0, 3);
    expect(items).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('getDropIndex', () => {
  it('returns the insertion index when dropping before the slide', () => {
    expect(getDropIndex(1, 0)).toBe(0);
  });

  it('corrects the insertion index when dropping after the slide', () => {
    expect(getDropIndex(1, 3)).toBe(2);
  });

  it('keeps the position in the gaps next to the slide', () => {
    expect(getDropIndex(1, 1)).toBe(1);
    expect(getDropIndex(1, 2)).toBe(1);
  });
});
