import { clearVariablesState } from '../src/utils/clearVariablesState';
import { Extension } from '../src/services/Extension';
import { StateKeys } from '../src/constants/StateKeys'; // Direct import for clarity

// Mock services & utils that might pull in problematic ESM dependencies
jest.mock('../src/services/PdfExportService', () => ({
  PdfExportService: jest.fn().mockImplementation(() => ({
    export: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('../src/utils/transformMarkdown', () => ({
  transformMarkdown: jest.fn((content) => Promise.resolve(content)),
}));

// Mock Extension service
jest.mock('../src/services/Extension');

// Typed Mocks
const MockedExtension = Extension as jest.Mocked<typeof Extension>;
// We need to define what getInstance().setState will be.
const mockSetState = jest.fn();

describe('clearVariablesState', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();

    // Setup getInstance to return an object with the mock setState function
    MockedExtension.getInstance = jest.fn().mockReturnValue({
      setState: mockSetState,
    } as any); // Cast to any to satisfy Extension type if it has other properties
  });

  test('should call Extension.getInstance().setState with StateKeys.variables and an empty object', async () => {
    // Call the function under test
    await clearVariablesState();

    // Verify that Extension.getInstance was called
    expect(MockedExtension.getInstance).toHaveBeenCalledTimes(1);

    // Verify that setState was called on the object returned by getInstance
    expect(mockSetState).toHaveBeenCalledTimes(1);

    // Verify the arguments of the setState call
    expect(mockSetState).toHaveBeenCalledWith(StateKeys.variables, {});
  });

  test('ensure StateKeys.variables is actually "variables" as per subtask description', () => {
    // This test is just to confirm the value of StateKeys.variables as per the subtask requirements.
    // It doesn't test the function clearVariablesState itself but rather a constant it uses.
    expect(StateKeys.variables).toBe("variables");
  });
});
