import { window } from 'vscode';
import { DemoRunner, Extension } from '../services';
import { getFileUri } from './getFileUri';
import { isPathInWorkspace } from './isPathInWorkspace';

export const openFile = async (filePath: string) => {
  const extension = Extension.getInstance();
  const workspaceFolder = extension?.workspaceFolder;
  const version = DemoRunner.getCurrentVersion();
  const fileUri = getFileUri(filePath, workspaceFolder, version);

  if (fileUri) {
    // Verify the resolved path is contained within the workspace
    if (!isPathInWorkspace(fileUri, workspaceFolder)) {
      window.showErrorMessage(`Failed to open file: ${filePath}. Path is outside workspace.`);
      return;
    }

    try {
      await window.showTextDocument(fileUri, { preview: false });
    } catch (error) {
      window.showErrorMessage(`Failed to open file: ${filePath}. ${error}`);
    }
  }
};
