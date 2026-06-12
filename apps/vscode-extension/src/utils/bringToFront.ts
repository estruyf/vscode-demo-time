import { exec } from 'child_process';
import { env } from 'vscode';
import { Extension } from '../services/Extension';

export const bringToFront = () => {
  return new Promise<void>((resolve) => {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      resolve();
      return;
    }

    const appName = env.appName.toLowerCase();
    let command = 'code';

    if (appName.includes('insiders')) {
      command = 'code-insiders';
    }

    exec(`${command} .`, { cwd: workspaceFolder?.uri.fsPath }, (error) => {
      if (error) {
        console.error(`Error bringing ${appName} to front: ${error.message}`);
      }
      resolve();
    });
  });
};
