import { Uri } from 'vscode';
import { bringToFront } from '../src/utils/bringToFront';
import { Extension } from '../src/services/Extension';
import { exec } from 'child_process';

// Mock vscode (primarily for Uri if not using the global __mocks__/vscode.ts effectively elsewhere)
// jest.mock('vscode'); // __mocks__/vscode.ts is automatically used

// Mock services & utils that might pull in problematic ESM dependencies
jest.mock('../src/services/PdfExportService', () => ({
  PdfExportService: jest.fn().mockImplementation(() => ({
    export: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('../src/utils/transformMarkdown', () => ({
  transformMarkdown: jest.fn((content) => Promise.resolve(content)),
}));

// Mock services and modules
jest.mock('../src/services/Extension');
jest.mock('child_process');

// exec from child_process is now a Jest mock function due to jest.mock above.
// We can type it more accurately if needed, or use it directly as a mock.
const mockedExec = exec as jest.MockedFunction<typeof exec>;
const MockedExtension = Extension as jest.Mocked<typeof Extension>;

describe('bringToFront', () => {
  let mockWorkspaceFolder: any;

  beforeEach(() => {
    jest.resetAllMocks();

    // Use a direct plain object for uri to avoid issues with Uri.file mock resolution
    mockWorkspaceFolder = {
      uri: {
        fsPath: '/test/workspace',
        path: '/test/workspace', // Typically same as fsPath for file URIs
        scheme: 'file',
        // Minimal Uri structure needed by the function under test (fsPath)
        // Add other properties like `with`, `toString` if they were called by source.
      },
      name: 'test-ws',
      index: 0,
    };
  });

  test('should not resolve or reject if no workspace folder is available', (done) => {
    MockedExtension.getInstance = jest.fn().mockReturnValue({
      workspaceFolder: undefined,
    } as any);

    const promise = bringToFront();

    // Check that exec was not called
    expect(mockedExec).not.toHaveBeenCalled();

    // Test that the promise does not resolve/reject quickly
    // It's hard to test for "never resolves" directly in Jest without timeouts.
    // We're verifying it doesn't proceed to call exec.
    // A timeout can help assert it hasn't resolved/rejected yet.
    const timeout = setTimeout(() => {
      done(); // If it hasn't resolved/rejected by now, assume it's pending as expected
    }, 100);

    promise.then(() => {
      clearTimeout(timeout);
      done.fail('Promise should not have resolved');
    }).catch(() => {
      clearTimeout(timeout);
      done.fail('Promise should not have rejected');
    });
  });

  test('should call child_process.exec with correct command and cwd when workspace folder is available', async () => {
    MockedExtension.getInstance = jest.fn().mockReturnValue({
      workspaceFolder: mockWorkspaceFolder,
    } as any);

    // Mock exec to immediately call its callback to resolve the promise
    mockedExec.mockImplementation((command, options, callback) => {
      if (callback) callback(null, 'stdout', 'stderr'); // Simulate successful execution
      return {} as any; // Return a dummy ChildProcess object
    });

    await bringToFront();

    expect(mockedExec).toHaveBeenCalledWith(
      'code .',
      { cwd: mockWorkspaceFolder.uri.fsPath },
      expect.any(Function)
    );
  });

  test('should resolve the promise when exec callback is invoked (even with exec error)', async () => {
    MockedExtension.getInstance = jest.fn().mockReturnValue({
      workspaceFolder: mockWorkspaceFolder,
    } as any);

    const execError = new Error('exec failed');
    mockedExec.mockImplementation((command, options, callback) => {
      if (callback) callback(execError, 'stdout', 'stderr'); // Simulate exec error
      return {} as any;
    });

    // The promise should still resolve because the callback calls resolve() regardless of exec error
    await expect(bringToFront()).resolves.toBeUndefined();
    expect(mockedExec).toHaveBeenCalled();
  });

  test('should resolve the promise when exec callback is invoked (no exec error)', async () => {
    MockedExtension.getInstance = jest.fn().mockReturnValue({
      workspaceFolder: mockWorkspaceFolder,
    } as any);

    mockedExec.mockImplementation((command, options, callback) => {
      if (callback) callback(null, 'stdout', 'stderr'); // Simulate successful exec
      return {} as any;
    });

    await expect(bringToFront()).resolves.toBeUndefined();
    expect(mockedExec).toHaveBeenCalled();
  });
});
