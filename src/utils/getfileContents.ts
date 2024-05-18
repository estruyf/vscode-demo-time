import { Uri, WorkspaceFolder, workspace } from "vscode";
import { General } from "../constants";

export const getFileContents = async (workspaceFolder: WorkspaceFolder, contentPath?: string) => {
  if (!contentPath) {
    return;
  }

  const contentUri = Uri.joinPath(workspaceFolder.uri, General.demoFolder, contentPath);
  if (!contentUri) {
    return;
  }

  const contentEditor = await workspace.openTextDocument(contentUri);
  return contentEditor.getText();
};
