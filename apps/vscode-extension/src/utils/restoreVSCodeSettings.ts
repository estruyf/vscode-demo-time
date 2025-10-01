import * as fs from 'fs';
import * as path from 'path';
import { workspace } from 'vscode';
import { Notifications } from '../services';

/**
 * Restores the VS Code workspace settings.json from settings.backup.json in the .vscode folder.
 * Returns the restored file path if successful, or throws an error.
 */
export async function restoreVSCodeSettings(): Promise<void> {
  const workspaceFolders = workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error('No workspace folder found.');
  }
  const rootPath = workspaceFolders[0].uri.fsPath;
  const settingsPath = path.join(rootPath, '.vscode', 'settings.json');
  const backupPath = path.join(rootPath, '.vscode', 'settings.backup.json');

  if (!fs.existsSync(backupPath)) {
    Notifications.warning('settings.backup.json not found in .vscode folder.');
    return;
  }

  await fs.promises.copyFile(backupPath, settingsPath);
}
