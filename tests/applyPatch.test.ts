import { Uri } from 'vscode';
import { applyPatch } from '../src/utils/applyPatch';
import { Extension, Notifications } from '../src/services';
import { applyPatch as applyFilePatchFromDiff } from 'diff';
import * as utilsIndex from '../src/utils'; // To mock getFileContents and writeFile

// Mock services & utils that might pull in problematic ESM dependencies
jest.mock('../src/services/PdfExportService', () => ({
  PdfExportService: jest.fn().mockImplementation(() => ({
    export: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('../src/utils/transformMarkdown', () => ({ // transformMarkdown is in src/utils, not directly in services
  transformMarkdown: jest.fn((content) => Promise.resolve(content)),
}));

// Mock vscode and services
jest.mock('vscode'); // Uses __mocks__/vscode.ts
jest.mock('../src/services/Extension');
jest.mock('../src/services/Notifications');
jest.mock('diff'); // Mock the 'diff' library, specifically applyPatch

// Mock utils from './index' (src/utils/index.ts)
jest.mock('../src/utils', () => {
  const originalModule = jest.requireActual('../src/utils');
  return {
    ...originalModule,
    getFileContents: jest.fn(),
    writeFile: jest.fn(),
  };
});

// Typed mocks for convenience
const mockedGetFileContents = utilsIndex.getFileContents as jest.Mock;
const mockedWriteFile = utilsIndex.writeFile as jest.Mock;
const mockedApplyFilePatchFromDiff = applyFilePatchFromDiff as jest.Mock;
const mockedNotificationsError = Notifications.error as jest.Mock;
const MockedExtension = Extension as jest.Mocked<typeof Extension>; // For Extension.getInstance()

describe('applyPatch', () => {
  const mockFilePath = Uri.file('/test/file.txt');
  const mockFileContent = 'Original content line 1\nOriginal content line 2\n';
  const mockPatchStringPath = 'test.patch'; // Relative path for the patch file
  const mockPatchFileContent = '--- a/file.txt\n+++ b/file.txt\n@@ -1,2 +1,2 @@\n-Original content line 1\n+Patched content line 1\n Original content line 2\n';
  const mockPatchedContent = 'Patched content line 1\nOriginal content line 2\n';

  let mockWorkspaceFolder: any;

  beforeEach(() => {
    jest.resetAllMocks();

    mockWorkspaceFolder = {
      uri: Uri.file('/test/workspace'),
      name: 'test-ws',
      index: 0,
    };
    // Setup Extension.getInstance().workspaceFolder to return the mock
    MockedExtension.getInstance = jest.fn().mockReturnValue({
      workspaceFolder: mockWorkspaceFolder,
    } as any);
  });

  test('should call Notifications.error and return if no patch string is provided', async () => {
    await applyPatch(mockFilePath, mockFileContent, undefined);
    expect(mockedNotificationsError).toHaveBeenCalledWith('No patch provided');
    expect(mockedGetFileContents).not.toHaveBeenCalled();
    expect(mockedApplyFilePatchFromDiff).not.toHaveBeenCalled();
    expect(mockedWriteFile).not.toHaveBeenCalled();
  });

  test('should return silently if no workspace folder is available', async () => {
    MockedExtension.getInstance = jest.fn().mockReturnValue({
      workspaceFolder: undefined,
    } as any);
    await applyPatch(mockFilePath, mockFileContent, mockPatchStringPath);
    expect(mockedNotificationsError).not.toHaveBeenCalled(); // No error notification in this specific case
    expect(mockedGetFileContents).not.toHaveBeenCalled();
  });

  test('should call Notifications.error if patch file content cannot be retrieved', async () => {
    mockedGetFileContents.mockResolvedValue(undefined); // Simulate getFileContents failure

    await applyPatch(mockFilePath, mockFileContent, mockPatchStringPath);

    expect(mockedGetFileContents).toHaveBeenCalledWith(mockWorkspaceFolder, mockPatchStringPath);
    expect(mockedNotificationsError).toHaveBeenCalledWith('No file content retrieved for the patch');
    expect(mockedApplyFilePatchFromDiff).not.toHaveBeenCalled();
    expect(mockedWriteFile).not.toHaveBeenCalled();
  });

  test('should call Notifications.error if applyFilePatch from diff library fails (returns false)', async () => {
    mockedGetFileContents.mockResolvedValue(mockPatchFileContent);
    mockedApplyFilePatchFromDiff.mockReturnValue(false); // Simulate patch application failure

    await applyPatch(mockFilePath, mockFileContent, mockPatchStringPath);

    expect(mockedApplyFilePatchFromDiff).toHaveBeenCalledWith(mockFileContent, mockPatchFileContent);
    expect(mockedNotificationsError).toHaveBeenCalledWith('Could not apply patch to the file');
    expect(mockedWriteFile).not.toHaveBeenCalled();
  });

  test('should successfully apply patch and call writeFile with correct parameters', async () => {
    mockedGetFileContents.mockResolvedValue(mockPatchFileContent);
    mockedApplyFilePatchFromDiff.mockReturnValue(mockPatchedContent);
    mockedWriteFile.mockResolvedValue(undefined); // Simulate successful write

    await applyPatch(mockFilePath, mockFileContent, mockPatchStringPath);

    expect(mockedGetFileContents).toHaveBeenCalledWith(mockWorkspaceFolder, mockPatchStringPath);
    expect(mockedApplyFilePatchFromDiff).toHaveBeenCalledWith(mockFileContent, mockPatchFileContent);
    expect(mockedWriteFile).toHaveBeenCalledWith(mockFilePath, mockPatchedContent);
    expect(mockedNotificationsError).not.toHaveBeenCalled();
  });

  test('should call Notifications.error if writeFile throws an error', async () => {
    mockedGetFileContents.mockResolvedValue(mockPatchFileContent);
    mockedApplyFilePatchFromDiff.mockReturnValue(mockPatchedContent);
    const writeError = new Error('Failed to write file');
    mockedWriteFile.mockRejectedValue(writeError);

    // The function applyPatch itself doesn't catch errors from writeFile, so it will propagate
    // No, looking at the source, it doesn't have a try/catch around writeFile.
    // So the error will propagate and Jest will catch it.
    // Notifications.error would NOT be called by applyPatch in this case.
    await expect(applyPatch(mockFilePath, mockFileContent, mockPatchStringPath)).rejects.toThrow(writeError);

    expect(mockedNotificationsError).not.toHaveBeenCalled();
  });
});
