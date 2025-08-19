import { sortFiles } from '../src/utils/sortFiles';
import { describe, it, expect } from '@jest/globals';

describe('sortFiles', () => {
  it('sorts file names case-insensitively and numerically', () => {
    const files = {
      'file10.ts': {} as any,
      'File2.ts': {} as any,
      'file1.ts': {} as any,
    };
    expect(sortFiles(files)).toEqual(['file1.ts', 'File2.ts', 'file10.ts']);
  });
});
