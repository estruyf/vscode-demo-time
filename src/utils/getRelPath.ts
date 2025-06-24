import path from "node:path";
import { Extension } from "../services/Extension";
import { parseWinPath } from "./parseWinPath";

export const getRelPath = (fsPath: string) => {
  const workspaceFolder = Extension.getInstance().workspaceFolder;
  if (!workspaceFolder) {
    return fsPath;
  }

  const from = parseWinPath(workspaceFolder.uri.fsPath);
  const to = parseWinPath(fsPath);

  const relative = path.posix.relative(from, to);
  return relative;
};
