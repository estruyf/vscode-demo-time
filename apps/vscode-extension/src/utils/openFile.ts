import { window } from 'vscode';
import { DemoRunner, Extension } from '../services';
import { getFileUri } from './getFileUri';

export const openFile = async (filePath: string) => {
  const extension = Extension.getInstance();
  const workspaceFolder = extension?.workspaceFolder;
  const version = DemoRunner.getCurrentVersion();
  const fileUri = getFileUri(filePath, workspaceFolder, version);
  if (fileUri) {
    try {
      await window.showTextDocument(fileUri, { preview: false });
    } catch (error) {
      window.showErrorMessage(`Failed to open file: ${filePath}. ${error}`);
    }
  }
};
