// __mocks__/vscode.ts

// This is a basic mock for the 'vscode' API.
// You may need to expand it based on the specific APIs your extension uses.

export const Uri = {
  file: jest.fn((path) => ({
    fsPath: path,
    path: path,
    scheme: 'file',
    authority: '',
    query: '',
    fragment: '',
    with: jest.fn(),
    toJSON: jest.fn(() => ({ fsPath: path, path: path, scheme: 'file' })),
  })),
  joinPath: jest.fn((base, ...paths) => {
    const newPath = [base.fsPath, ...paths].join('/');
    return {
      fsPath: newPath,
      path: newPath,
      scheme: 'file',
      authority: '',
      query: '',
      fragment: '',
      with: jest.fn(),
      toJSON: jest.fn(() => ({ fsPath: newPath, path: newPath, scheme: 'file' })),
    };
  }),
  parse: jest.fn((pathString, strict) => ({
    fsPath: pathString,
    path: pathString,
    scheme: 'file', // Assuming file URIs for simplicity
    authority: '',
    query: '',
    fragment: '',
    with: jest.fn(),
    toJSON: jest.fn(() => ({ fsPath: pathString, path: pathString, scheme: 'file' })),
  })),
};

export const workspace = {
  workspaceFolders: undefined, // Default to no workspace folders
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
    update: jest.fn(),
    has: jest.fn(),
    inspect: jest.fn(),
  })),
  onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  // Add other workspace APIs your code might use
};

export const window = {
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  createStatusBarItem: jest.fn(() => ({
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  })),
  // Add other window APIs
};

export const commands = {
  executeCommand: jest.fn(),
  registerCommand: jest.fn(),
  // Add other command APIs
};

export const extensions = {
  getExtension: jest.fn(extensionId => {
    if (extensionId === 'test.extension-id') { // Example, adjust as needed
      return {
        id: extensionId,
        extensionPath: '/mocked/extension/path',
        isActive: true,
        packageJSON: {},
        exports: {},
        activate: jest.fn().mockResolvedValue(undefined),
      };
    }
    return undefined;
  }),
  // Add other extensions APIs
};

// For other VS Code enums or classes you might use
export class TreeItem {
  public label: string | undefined;
  constructor(label?: string) {
    this.label = label;
  }
}
export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
};

export const EventEmitter = jest.fn().mockImplementation(() => {
  return {
    fire: jest.fn(),
    event: jest.fn(),
    dispose: jest.fn()
  };
});

// If your code uses vscode.ThemeColor
export class ThemeColor {
  public id: string;
  constructor(id: string) {
    this.id = id;
  }
}
// ... and so on for other APIs used in your project.
// It's often built incrementally as you write tests.
