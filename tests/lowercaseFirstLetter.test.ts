import { lowercaseFirstLetter } from '../src/utils/lowercaseFirstLetter';
import { describe, it, expect } from '@jest/globals';

describe('lowercaseFirstLetter', () => {
  it('lowercases the first character', () => {
    expect(lowercaseFirstLetter('Hello')).toBe('hello');
  });
});
