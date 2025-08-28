import * as fs from 'fs';
import * as path from 'path';
import { workspace } from 'vscode';
import { Notifications } from '../services';

/**
 * Backs up the VS Code workspace settings.json to settings.backup.json in the .vscode folder.
 * Returns the backup file path if successful, or throws an error.
 */
export async function backupVSCodeSettings(): Promise<void> {
  const workspaceFolders = workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error('No workspace folder found.');
  }
  const rootPath = workspaceFolders[0].uri.fsPath;
  const settingsPath = path.join(rootPath, '.vscode', 'settings.json');
  const backupPath = path.join(rootPath, '.vscode', 'settings.backup.json');

  if (!fs.existsSync(settingsPath)) {
    Notifications.warning('settings.json not found in .vscode folder.');
    return;
  }

  await fs.promises.copyFile(settingsPath, backupPath);
}
