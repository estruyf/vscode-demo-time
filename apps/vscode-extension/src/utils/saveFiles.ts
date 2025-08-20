import { commands } from 'vscode';

export const saveFiles = async (): Promise<void> => {
  await commands.executeCommand('workbench.action.files.save');
};
