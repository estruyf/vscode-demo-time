import { exec } from 'child_process';
import { env } from 'vscode';
import { Extension } from '../services/Extension';

export const bringToFront = () => {
  return new Promise<void>((resolve) => {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return;
    }

    const appName = env.appName.toLowerCase();
    let command = 'code';

    if (appName.includes('insiders')) {
      command = 'code-insiders';
    }

    exec(`${command} .`, { cwd: workspaceFolder?.uri.fsPath }, () => {
      resolve();
    });
  });
};
