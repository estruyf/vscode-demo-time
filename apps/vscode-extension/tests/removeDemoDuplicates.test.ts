import { removeDemoDuplicates } from '../src/utils/removeDemoDuplicates';
import { describe, it, expect } from '@jest/globals';

describe('removeDemoDuplicates', () => {
  it('removes items with duplicate idx values', () => {
    const demos = [
      { idx: 1, title: 'a' },
      { idx: 1, title: 'duplicate' },
      { idx: 2, title: 'b' },
      { idx: 3, title: 'c' },
      { idx: 3, title: 'dup' },
    ];
    expect(removeDemoDuplicates(demos)).toEqual([
      { idx: 1, title: 'a' },
      { idx: 2, title: 'b' },
      { idx: 3, title: 'c' },
    ]);
  });
});
