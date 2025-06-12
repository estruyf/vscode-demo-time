import { addStepsToDemo } from '../src/utils/addStepsToDemo';
import { DemoFile, Step, Demo, Icons, Action } from '../src/models';
import { DemoPanel } from '../src/panels/DemoPanel';
import { DemoCreator, FileProvider } from '../src/services';

// Mock services & utils that might pull in problematic ESM dependencies
jest.mock('../src/services/PdfExportService', () => ({
  PdfExportService: jest.fn().mockImplementation(() => ({
    export: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('../src/utils/transformMarkdown', () => ({
  transformMarkdown: jest.fn((content) => Promise.resolve(content)),
}));

// Mock target services
jest.mock('../src/services/DemoCreator');
jest.mock('../src/services/FileProvider');
jest.mock('../src/panels/DemoPanel');

// Sample data for testing
const sampleStep: Step = {
  action: Action.ExecuteVSCodeCommand,
  command: 'sample.command',
  args: [],
};

const sampleStepsArray: Step[] = [
  { action: Action.ExecuteVSCodeCommand, command: 'command1' },
  { action: Action.Open, path: 'path/to/file.txt' },
];

const initialDemoSection: Demo = {
  id: 'initial-section', // Added id for easier targeting/simulation
  title: 'Initial Demo Section',
  description: 'An existing section in the demo.',
  steps: [sampleStep], // Start with one step
};

const initialDemoFile: DemoFile = {
  title: 'Main Demo File',
  description: 'File containing all demo sections.',
  // $schema was not part of DemoFile type, removing it.
  // version is optional, can add if needed for a test.
  demos: [JSON.parse(JSON.stringify(initialDemoSection))], // demos is an array of Demo objects
};

// This will be reset and used for each test
let currentTestDemoFileArg: { filePath: string; demo: DemoFile; };

const sampleTitle = "New Steps Section";
const sampleDescription = "Description for new steps";
const sampleIcons: Icons = { start: "$(rocket)", end: "$(check)" };


describe('addStepsToDemo', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Deep clone initialDemoFile for each test to ensure isolation
    currentTestDemoFileArg = {
      filePath: '/path/to/demo.json',
      demo: JSON.parse(JSON.stringify(initialDemoFile)),
    };
  });

  test('should do nothing if demoFile is undefined', async () => {
    await addStepsToDemo(sampleStep, undefined);
    expect(DemoCreator.askWhereToAddStep).not.toHaveBeenCalled();
  });

  test('should do nothing if demoFile.filePath is undefined', async () => {
    await addStepsToDemo(sampleStep, { ...currentTestDemoFileArg, filePath: undefined as any });
    expect(DemoCreator.askWhereToAddStep).not.toHaveBeenCalled();
  });

  test('should do nothing if demoFile.demo is undefined', async () => {
    await addStepsToDemo(sampleStep, { ...currentTestDemoFileArg, demo: undefined as any });
    expect(DemoCreator.askWhereToAddStep).not.toHaveBeenCalled();
  });

  test('should do nothing if DemoCreator.askWhereToAddStep returns undefined (user cancellation)', async () => {
    (DemoCreator.askWhereToAddStep as jest.Mock).mockResolvedValue(undefined);

    await addStepsToDemo(sampleStep, currentTestDemoFileArg, sampleTitle);

    expect(DemoCreator.askWhereToAddStep).toHaveBeenCalledWith(
      currentTestDemoFileArg.demo, // This is DemoFile
      sampleStep,
      sampleTitle,
      undefined,
      undefined
    );
    expect(FileProvider.saveFile).not.toHaveBeenCalled();
    expect(DemoPanel.update).not.toHaveBeenCalled();
  });

  test('should call saveFile and update panel when askWhereToAddStep returns updated demos array', async () => {
    // Simulate askWhereToAddStep returning an updated Demo[] array
    const updatedDemosArray: Demo[] = [
      {
        ...initialDemoSection,
        steps: [...initialDemoSection.steps, sampleStep] // Simulate step added to existing section
      },
      // Or it could be a new section entirely, depending on askWhereToAddStep's internal logic
    ];
    const mockReturnedDemoFileFromCreator: DemoFile = {
      ...currentTestDemoFileArg.demo, // Preserve other DemoFile properties
      demos: updatedDemosArray,
    };
    (DemoCreator.askWhereToAddStep as jest.Mock).mockResolvedValue(mockReturnedDemoFileFromCreator);
    (FileProvider.saveFile as jest.Mock).mockResolvedValue(undefined);

    await addStepsToDemo(sampleStep, currentTestDemoFileArg, sampleTitle, sampleDescription, sampleIcons);

    expect(DemoCreator.askWhereToAddStep).toHaveBeenCalledWith(
      currentTestDemoFileArg.demo, // DemoFile object
      sampleStep,
      sampleTitle,
      sampleDescription,
      sampleIcons
    );

    // Construct the expected DemoFile content that should be saved
    const expectedDemoFileToSave: DemoFile = {
      ...currentTestDemoFileArg.demo, // Contains original title, description, $schema
      demos: updatedDemosArray, // The new demos array returned by askWhereToAddStep
    };

    expect(FileProvider.saveFile).toHaveBeenCalledWith(
      currentTestDemoFileArg.filePath,
      JSON.stringify(expectedDemoFileToSave, null, 2)
    );
    expect(DemoPanel.update).toHaveBeenCalled();
  });

  test('should correctly handle adding multiple steps', async () => {
    const updatedDemosArrayWithMultiple: Demo[] = [
      {
        ...initialDemoSection,
        steps: [...initialDemoSection.steps, ...sampleStepsArray],
      }
    ];
    const mockReturnedDemoFileFromCreatorMultiple: DemoFile = {
      ...currentTestDemoFileArg.demo,
      demos: updatedDemosArrayWithMultiple,
    };
    (DemoCreator.askWhereToAddStep as jest.Mock).mockResolvedValue(mockReturnedDemoFileFromCreatorMultiple);
    (FileProvider.saveFile as jest.Mock).mockResolvedValue(undefined);

    await addStepsToDemo(sampleStepsArray, currentTestDemoFileArg, "Multi-step section");

    expect(DemoCreator.askWhereToAddStep).toHaveBeenCalledWith(
      currentTestDemoFileArg.demo,
      sampleStepsArray,
      "Multi-step section",
      undefined,
      undefined
    );

    const expectedDemoFileToSave: DemoFile = {
      ...currentTestDemoFileArg.demo,
      demos: updatedDemosArrayWithMultiple,
    };

    expect(FileProvider.saveFile).toHaveBeenCalledWith(
      currentTestDemoFileArg.filePath,
      JSON.stringify(expectedDemoFileToSave, null, 2)
    );
    expect(DemoPanel.update).toHaveBeenCalled();
  });

  test('should not call DemoPanel.update if FileProvider.saveFile throws an error', async () => {
    // Simulate askWhereToAddStep returning a DemoFile object
    const mockReturnedDemoFileFromCreatorErrorCase: DemoFile = {
      ...currentTestDemoFileArg.demo,
      demos: [ initialDemoSection ] // Content of demos array doesn't strictly matter for this test path
    };
    (DemoCreator.askWhereToAddStep as jest.Mock).mockResolvedValue(mockReturnedDemoFileFromCreatorErrorCase);
    const saveError = new Error('Failed to save file');
    (FileProvider.saveFile as jest.Mock).mockRejectedValue(saveError);

    await expect(addStepsToDemo(sampleStep, currentTestDemoFileArg)).rejects.toThrow(saveError);

    expect(FileProvider.saveFile).toHaveBeenCalled();
    expect(DemoPanel.update).not.toHaveBeenCalled();
  });
});
