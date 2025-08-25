import { getLineAndCharacterPosition } from '../src/utils/getLineAndCharacterPosition';
import { describe, it, expect } from '@jest/globals';

describe('getLineAndCharacterPosition', () => {
  it('parses line and character', () => {
    expect(getLineAndCharacterPosition('3,5')).toEqual({ line: 2, character: 5 });
  });

  it('parses line only', () => {
    expect(getLineAndCharacterPosition('2')).toEqual({ line: 1, character: 0 });
  });

  it('handles character starting at one', () => {
    expect(getLineAndCharacterPosition('1,1')).toEqual({ line: 0, character: 1 });
  });
});
