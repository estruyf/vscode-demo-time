import { getPlatform } from '../src/utils/getPlatform';
import * as os from 'os';
import { describe, it, expect, jest } from '@jest/globals';

jest.mock('os');

describe('getPlatform', () => {
  it('returns windows for win32', () => {
    (os.platform as jest.Mock).mockReturnValue('win32');
    expect(getPlatform()).toBe('windows');
  });

  it('returns osx for darwin', () => {
    (os.platform as jest.Mock).mockReturnValue('darwin');
    expect(getPlatform()).toBe('osx');
  });

  it('returns linux for others', () => {
    (os.platform as jest.Mock).mockReturnValue('linux');
    expect(getPlatform()).toBe('linux');
  });
});
