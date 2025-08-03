import { OpenDialogOptions, window } from 'vscode';
import { Extension } from '../services';
import { parseWinPath } from './parseWinPath';

export const openFilePicker = async (fileTypes: string[] = []): Promise<string | undefined> => {
  const dialogSettings: OpenDialogOptions = {
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: 'Select File',
  };

  if (Array.isArray(fileTypes) && fileTypes.length > 0) {
    dialogSettings.filters = {
      'Allowed Files': fileTypes.map((ext: string) => ext.replace(/^\./, '')),
    };
  }

  const uris = await window.showOpenDialog(dialogSettings);
  if (!uris || uris.length === 0) {
    return;
  }

  const extension = Extension.getInstance();
  const workspaceFolder = extension.workspaceFolder;
  let relativePath = parseWinPath(uris[0].fsPath);
  if (workspaceFolder) {
    const workspacePath = parseWinPath(workspaceFolder.uri.fsPath);
    if (relativePath.startsWith(workspacePath)) {
      relativePath = relativePath.substring(workspacePath.length + 1);
    }
  }

  return relativePath;
};
