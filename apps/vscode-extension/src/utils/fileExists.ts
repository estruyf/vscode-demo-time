import { Uri, workspace } from "vscode";

export const fileExists = async (filePath: Uri): Promise<boolean> => {
  try {
    await workspace.fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
};