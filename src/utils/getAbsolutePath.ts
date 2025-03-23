import { Uri } from "vscode";
import { Extension } from "../services";

export const getAbsolutePath = (relPath: string): Uri => {
  const workspaceFolder = Extension.getInstance().workspaceFolder;
  if (!workspaceFolder) {
    return Uri.file(relPath);
  }

  const absPath = Uri.joinPath(workspaceFolder.uri, relPath);
  return absPath;
};
