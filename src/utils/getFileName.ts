import { Uri } from "vscode";
import { parseWinPath } from "./parseWinPath";

export const getFileName = (filePath: Uri) => {
  const crntFilePath = parseWinPath(filePath.fsPath);
  const fileName = Uri.file(crntFilePath).path.split("/").pop() ?? "";
  if (!fileName) {
    return;
  }
  return fileName;
};
