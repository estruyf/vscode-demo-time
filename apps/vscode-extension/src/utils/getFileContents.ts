import { WorkspaceFolder, workspace } from 'vscode';
import { DemoRunner } from '../services';
import { getFileUri } from './getFileUri';

export const getFileContents = async (workspaceFolder: WorkspaceFolder, contentPath?: string) => {
  if (!contentPath) {
    return;
  }

  const version = DemoRunner.getCurrentVersion();
  const contentUri = getFileUri(contentPath, workspaceFolder, version);

  if (!contentUri) {
    return;
  }

  const contentEditor = await workspace.openTextDocument(contentUri);
  return contentEditor.getText();
};
