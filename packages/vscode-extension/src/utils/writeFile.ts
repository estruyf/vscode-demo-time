import { Uri, workspace } from 'vscode';
import { sleep } from './sleep';
import { parseWinPath } from './parseWinPath';

export const writeFile = async (filePath: Uri, text: string, shouldWait = true) => {
  const parsedPath = parseWinPath(filePath.fsPath);
  filePath = Uri.file(parsedPath);
  await workspace.fs.writeFile(filePath, new TextEncoder().encode(text.replace(/\\n/g, '\n')));
  // Added some sleep to ensure the file is written before proceeding
  // This is a workaround for the issue where the file is not written immediately
  // and the next operation fails.
  if (shouldWait) {
    await sleep(500);
  }
};
