import { Uri, window } from 'vscode';
import { DemoRunner, Extension } from '../services';
import { General } from '../constants';

export const openFile = async (filePath: string) => {
  const workspaceFolder = Extension.getInstance().workspaceFolder;
  const version = DemoRunner.getCurrentVersion();
  const notesPath = workspaceFolder
    ? version === 2
      ? Uri.joinPath(workspaceFolder.uri, filePath)
      : Uri.joinPath(workspaceFolder.uri, General.demoFolder, filePath)
    : undefined;
  if (notesPath) {
    await window.showTextDocument(notesPath, { preview: false });
  }
};
