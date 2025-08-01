import { Config } from '../constants';
import { window } from 'vscode';

export const getUserInput = async (prompt: string, title?: string) => {
  const input = await window.showInputBox({
    title: title || Config.title,
    prompt,
    ignoreFocusOut: true,
  });

  return input || '';
};
