const window = {
  withProgress: jest.fn().mockImplementation(async (options, task) => {
    return task();
  }),
};

const ProgressLocation = {
  Notification: 15,
};

const Uri = {
  file: jest.fn().mockImplementation((path) => ({
    fsPath: path,
    scheme: 'file',
    path: path,
    toString: () => path,
  })),
};

class TreeItem {
  constructor(label, collapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

module.exports = {
  window,
  ProgressLocation,
  Uri,
  TreeItem,
};
