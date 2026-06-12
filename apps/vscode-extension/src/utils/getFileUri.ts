import { Uri, WorkspaceFolder } from 'vscode';
import { General } from '../constants';

export const getFileUri = (
  filePath: string,
  workspaceFolder: WorkspaceFolder | undefined | null,
  version: number,
): Uri | undefined => {
  return workspaceFolder
    ? version >= 2
      ? Uri.joinPath(workspaceFolder.uri, filePath)
      : Uri.joinPath(workspaceFolder.uri, General.demoFolder, filePath)
    : undefined;
};
