import { getRelPath } from '../src/utils/getRelPath';
import { Extension } from '../src/services/Extension';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('vscode', () => ({}), { virtual: true });

jest.mock('../src/services/Extension');

const getInstanceMock = Extension.getInstance as jest.Mock;

describe('getRelPath', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns path relative to workspace folder', () => {
    const workspaceFolder = { uri: { fsPath: '/workspace/project' } };
    getInstanceMock.mockReturnValue({ workspaceFolder });

    expect(getRelPath('/workspace/project/src/file.ts')).toBe('src/file.ts');
  });

  it('handles Windows style paths', () => {
    const workspaceFolder = { uri: { fsPath: 'C:\\ws\\project' } };
    getInstanceMock.mockReturnValue({ workspaceFolder });

    expect(getRelPath('C:\\ws\\project\\src\\file.ts')).toBe('src/file.ts');
  });

  it('returns original path when workspace folder is missing', () => {
    getInstanceMock.mockReturnValue({ workspaceFolder: null });

    expect(getRelPath('/workspace/project/src/file.ts')).toBe('/workspace/project/src/file.ts');
  });
});
