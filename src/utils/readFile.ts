import { Uri, workspace } from "vscode";

export const readFile = async (filePath: Uri) => {
  const text = await workspace.fs.readFile(filePath);
  return new TextDecoder().decode(text);
};
