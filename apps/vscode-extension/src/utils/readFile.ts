import { Uri, workspace } from 'vscode';
import { parseWinPath } from './parseWinPath';

export const readFile = async (filePath: Uri) => {
  const parsedPath = parseWinPath(filePath.fsPath);
  filePath = Uri.file(parsedPath);
  const text = await workspace.fs.readFile(filePath);
  return new TextDecoder('utf-8').decode(text);
};
