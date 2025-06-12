import { Uri } from 'vscode';
import { addExtensionRecommendation } from '../src/utils/addExtensionRecommendation';
import { Extension } from '../src/services/Extension';
import { fileExists } from '../src/utils/fileExists';
import { readFile, writeFile } from '../src/utils'; // Assuming index.ts exports these
import { Logger } from '../src/services/Logger';

// Mock services that pull in problematic ESM dependencies
jest.mock('../src/services/PdfExportService', () => ({
  PdfExportService: jest.fn().mockImplementation(() => ({
    export: jest.fn().mockResolvedValue(undefined),
    // Add any other methods used by the application if necessary
  })),
}));

// Mock utilities that might pull in problematic ESM dependencies
jest.mock('../src/utils/transformMarkdown', () => ({
  transformMarkdown: jest.fn((content) => Promise.resolve(content)), // Simple mock
  // Add other exports from this module if they are used and need mocking
}));
// Add mocks for other services if they also cause similar issues

// Mock constants
const TEST_EXTENSION_ID = 'test.extension-id';
// Uri will be mocked by the manual mock in __mocks__/vscode.ts
// So, we need to use the mocked version for mockWorkspaceFolderUri
import { Uri as MockedUri } from 'vscode';
const mockWorkspaceFolderUri = MockedUri.file('/test/workspace');

// Mock VS Code APIs and services
jest.mock('vscode'); // This will now use __mocks__/vscode.ts

jest.mock('../src/services/Extension');
jest.mock('../src/utils/fileExists');
jest.mock('../src/utils', () => ({ // Mocking readFile and writeFile from src/utils/index.ts
  ...jest.requireActual('../src/utils'),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));
jest.mock('../src/services/Logger');

describe('addExtensionRecommendation', () => {
  let mockExtensionInstance: any;

  beforeEach(() => {
    jest.resetAllMocks();

    // Need to ensure vscode.Uri.file and vscode.Uri.joinPath are correctly mocked
    // by the manual mock before they are used here or in the component.
    // The manual mock for Uri.file needs to return an object that can be used by Uri.joinPath.
    const mockedUriInstance = MockedUri.file('/test/workspace');

    mockExtensionInstance = {
      id: TEST_EXTENSION_ID,
      workspaceFolder: {
        uri: mockedUriInstance, // Use the instance from the mocked Uri
        name: 'test-workspace',
        index: 0,
      },
    };

    (Extension.getInstance as jest.Mock).mockReturnValue(mockExtensionInstance);
    // Change Logger.error mock to throw, to get a clearer stack trace of the original error
    (Logger.error as jest.Mock).mockImplementation(console.error); // Revert to console.error

    // Configure the manual mock's Uri parts if necessary for the tests
    // For example, ensure joinPath returns something compatible:
    // Let's use the default mock from __mocks__/vscode.ts for joinPath first by NOT overriding it here,
    // unless absolutely necessary. The __mocks__/vscode.ts version should be sufficient if Uri.file works.
    // (MockedUri.joinPath as jest.Mock).mockImplementation((base, ...paths) => {
    //   if (!base || typeof base.fsPath === 'undefined') {
    //     throw new TypeError(`[Custom JoinPath] 'base' missing 'fsPath'. Received: ${JSON.stringify(base)}`);
    //   }
    //   const newPath = [base.fsPath, ...paths].join('/');
    //   return MockedUri.file(newPath);
    // });
  });

  test('should do nothing if no workspace folder is open', async () => {
    mockExtensionInstance.workspaceFolder = undefined;
    (Extension.getInstance as jest.Mock).mockReturnValue(mockExtensionInstance);

    await addExtensionRecommendation();

    expect(fileExists).not.toHaveBeenCalled();
    expect(readFile).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  test('should create extensions.json with the extension ID if it does not exist', async () => {
    (fileExists as jest.Mock).mockResolvedValue(false);
    (writeFile as jest.Mock).mockResolvedValue(undefined);

    await addExtensionRecommendation();

    const expectedFilePath = MockedUri.joinPath(mockWorkspaceFolderUri, '.vscode/extensions.json');
    expect(fileExists).toHaveBeenCalledWith(expectedFilePath);
    expect(readFile).not.toHaveBeenCalled(); // Not called because file doesn't exist
    expect(writeFile).toHaveBeenCalledWith(
      expectedFilePath,
      JSON.stringify({ recommendations: [TEST_EXTENSION_ID] }, null, 2)
    );
  });

  test('should add extension ID to an empty extensions.json', async () => {
    (fileExists as jest.Mock).mockResolvedValue(true);
    (readFile as jest.Mock).mockResolvedValue(JSON.stringify({})); // Empty JSON object
    (writeFile as jest.Mock).mockResolvedValue(undefined);

    await addExtensionRecommendation();

    const expectedFilePath = MockedUri.joinPath(mockWorkspaceFolderUri, '.vscode/extensions.json');
    expect(readFile).toHaveBeenCalledWith(expectedFilePath);
    expect(writeFile).toHaveBeenCalledWith(
      expectedFilePath,
      JSON.stringify({ recommendations: [TEST_EXTENSION_ID] }, null, 2)
    );
  });

  test('should add extension ID if extensions.json has no "recommendations" array', async () => {
    (fileExists as jest.Mock).mockResolvedValue(true);
    (readFile as jest.Mock).mockResolvedValue(JSON.stringify({ unrelated: "data" }));
    (writeFile as jest.Mock).mockResolvedValue(undefined);

    await addExtensionRecommendation();

    const expectedFilePath = MockedUri.joinPath(mockWorkspaceFolderUri, '.vscode/extensions.json');
    expect(readFile).toHaveBeenCalledWith(expectedFilePath);
    // The function initializes contents.recommendations to [] if not present
    expect(writeFile).toHaveBeenCalledWith(
      expectedFilePath,
      JSON.stringify({ unrelated: "data", recommendations: [TEST_EXTENSION_ID] }, null, 2)
    );
  });


  test('should add extension ID to existing recommendations list', async () => {
    const existingRecommendations = { recommendations: ['another.extension'] };
    (fileExists as jest.Mock).mockResolvedValue(true);
    (readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingRecommendations));
    (writeFile as jest.Mock).mockResolvedValue(undefined);

    await addExtensionRecommendation();

    const expectedFilePath = MockedUri.joinPath(mockWorkspaceFolderUri, '.vscode/extensions.json');
    expect(readFile).toHaveBeenCalledWith(expectedFilePath);
    expect(writeFile).toHaveBeenCalledWith(
      expectedFilePath,
      JSON.stringify({ recommendations: ['another.extension', TEST_EXTENSION_ID] }, null, 2)
    );
  });

  test('should do nothing if extension ID is already recommended', async () => {
    const existingRecommendations = { recommendations: [TEST_EXTENSION_ID, 'another.extension'] };
    (fileExists as jest.Mock).mockResolvedValue(true);
    (readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingRecommendations));

    await addExtensionRecommendation();

    expect(readFile).toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  test('should log error if readFile fails', async () => {
    const error = new Error('Failed to read file');
    (fileExists as jest.Mock).mockResolvedValue(true);
    (readFile as jest.Mock).mockRejectedValue(error);

    await addExtensionRecommendation();

    expect(Logger.error).toHaveBeenCalledWith('Failed to read file');
    expect(writeFile).not.toHaveBeenCalled();
  });

  test('should log error if writeFile fails', async () => {
    const error = new Error('Failed to write file');
    (fileExists as jest.Mock).mockResolvedValue(false); // To trigger writeFile
    (writeFile as jest.Mock).mockRejectedValue(error);

    await addExtensionRecommendation();

    expect(Logger.error).toHaveBeenCalledWith('Failed to write file');
  });

  test('should handle malformed JSON in extensions.json', async () => {
    (fileExists as jest.Mock).mockResolvedValue(true);
    (readFile as jest.Mock).mockResolvedValue("this is not json");
    const expectedFilePath = MockedUri.joinPath(mockWorkspaceFolderUri, '.vscode/extensions.json');

    await addExtensionRecommendation();

    expect(Logger.error).toHaveBeenCalledWith(expect.stringContaining("Failed to parse .vscode/extensions.json"));
    // It should write a new file with the current extension recommended
    expect(writeFile).toHaveBeenCalledWith(
      expectedFilePath,
      JSON.stringify({ recommendations: [TEST_EXTENSION_ID] }, null, 2)
    );
  });
});
