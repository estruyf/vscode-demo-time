import { upperCaseFirstLetter } from '../src/utils/upperCaseFirstLetter';
import { describe, it, expect } from '@jest/globals';

describe('upperCaseFirstLetter', () => {
  it('uppercases the first character', () => {
    expect(upperCaseFirstLetter('world')).toBe('World');
  });
});
