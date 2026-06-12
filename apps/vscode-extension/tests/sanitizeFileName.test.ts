import { sanitizeFileName } from '../src/utils/sanitizeFileName';
import { describe, it, expect } from '@jest/globals';

describe('sanitizeFileName', () => {
  it('adds extension, replaces spaces and lowercases', () => {
    expect(sanitizeFileName('My File')).toBe('my-file.json');
  });

  it('does not duplicate extension', () => {
    expect(sanitizeFileName('demo.json')).toBe('demo.json');
  });
});
