import { parseWinPath } from '../src/utils/parseWinPath';
import { describe, it, expect } from '@jest/globals';

describe('parseWinPath', () => {
  it('converts backslashes to forward slashes', () => {
    expect(parseWinPath('folder\\sub\\file.txt')).toBe('folder/sub/file.txt');
  });

  it('returns empty string when path is undefined', () => {
    expect(parseWinPath(undefined)).toBe('');
  });
});
