import { Uri, window } from 'vscode';
import { DemoRunner, Extension } from '../services';
import { General } from '../constants';

export const openFile = async (filePath: string) => {
  const extension = Extension.getInstance();
  const workspaceFolder = extension?.workspaceFolder;
  const version = DemoRunner.getCurrentVersion();
  const fileUri = workspaceFolder
    ? version === 2
      ? Uri.joinPath(workspaceFolder.uri, filePath)
      : Uri.joinPath(workspaceFolder.uri, General.demoFolder, filePath)
    : undefined;
  if (fileUri) {
    try {
      await window.showTextDocument(fileUri, { preview: false });
    } catch (error) {
      window.showErrorMessage(`Failed to open file: ${filePath}. ${error}`);
    }
  }
};
