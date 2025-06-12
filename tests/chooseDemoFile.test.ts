import { chooseDemoFile } from '../src/utils/chooseDemoFile';
import { FileProvider } from '../src/services';
import { DemoFile } from '../src/models'; // Import DemoFile for type safety if needed for sample data

// Mock services & utils that might pull in problematic ESM dependencies
jest.mock('../src/services/PdfExportService', () => ({
  PdfExportService: jest.fn().mockImplementation(() => ({
    export: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('../src/utils/transformMarkdown', () => ({
  transformMarkdown: jest.fn((content) => Promise.resolve(content)),
}));

// Mock target service
jest.mock('../src/services/FileProvider');

// Typed Mock
const mockedDemoQuickPick = FileProvider.demoQuickPick as jest.Mock;

describe('chooseDemoFile', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should return undefined if FileProvider.demoQuickPick returns undefined', async () => {
    mockedDemoQuickPick.mockResolvedValue(undefined);

    const result = await chooseDemoFile();
    expect(result).toBeUndefined();
    expect(mockedDemoQuickPick).toHaveBeenCalledTimes(1);
  });

  test('should return undefined if FileProvider.demoQuickPick returns an object with an undefined demo property', async () => {
    const mockQuickPickResponse = {
      filePath: '/path/to/some/file.json',
      // demo property is missing or undefined
    };
    mockedDemoQuickPick.mockResolvedValue(mockQuickPickResponse);

    const result = await chooseDemoFile();
    expect(result).toBeUndefined();
    expect(mockedDemoQuickPick).toHaveBeenCalledTimes(1);
  });

  test('should return undefined if FileProvider.demoQuickPick returns an object with a null demo property', async () => {
    const mockQuickPickResponse = {
      filePath: '/path/to/some/file.json',
      demo: null, // Explicitly null
    };
    mockedDemoQuickPick.mockResolvedValue(mockQuickPickResponse as any); // Cast as any if type complains about null

    const result = await chooseDemoFile();
    expect(result).toBeUndefined();
    expect(mockedDemoQuickPick).toHaveBeenCalledTimes(1);
  });

  test('should return the filePath and demo object if FileProvider.demoQuickPick returns a valid object', async () => {
    const sampleFilePath = '/path/to/valid/demo.json';
    // For the 'demo' object, its internal structure doesn't matter for chooseDemoFile,
    // only its presence.
    const sampleDemoObject: DemoFile = {
      title: "Test Demo",
      description: "A test demo file",
      demos: []
    };
    const mockQuickPickResponse = {
      filePath: sampleFilePath,
      demo: sampleDemoObject,
    };
    mockedDemoQuickPick.mockResolvedValue(mockQuickPickResponse);

    const result = await chooseDemoFile();

    expect(result).toEqual({
      filePath: sampleFilePath,
      demo: sampleDemoObject,
    });
    expect(mockedDemoQuickPick).toHaveBeenCalledTimes(1);
  });

  test('should call FileProvider.demoQuickPick with no arguments', async () => {
    mockedDemoQuickPick.mockResolvedValue(undefined); // Return undefined to stop further processing
    await chooseDemoFile();
    expect(mockedDemoQuickPick).toHaveBeenCalledWith(); // Verifies it's called with no args
  });
});
