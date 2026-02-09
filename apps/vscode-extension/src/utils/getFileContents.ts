import { WorkspaceFolder, workspace } from 'vscode';
import { DemoRunner } from '../services';
import { getFileUri } from './getFileUri';
import { isPathInWorkspace } from './isPathInWorkspace';

export const getFileContents = async (workspaceFolder: WorkspaceFolder, contentPath?: string) => {
  if (!contentPath) {
    return;
  }

  const version = await DemoRunner.getCurrentVersion();
  const contentUri = getFileUri(contentPath, workspaceFolder, version);

  if (!contentUri) {
    return;
  }

  // Verify the resolved path is contained within the workspace
  if (!isPathInWorkspace(contentUri, workspaceFolder)) {
    return;
  }

  const contentEditor = await workspace.openTextDocument(contentUri);
  return contentEditor.getText();
};
