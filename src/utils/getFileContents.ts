import { Uri, WorkspaceFolder, workspace } from "vscode";
import { General } from "../constants";
import { DemoRunner } from "../services";

export const getFileContents = async (workspaceFolder: WorkspaceFolder, contentPath?: string) => {
  if (!contentPath) {
    return;
  }

  const version = DemoRunner.getCurrentVersion();

  const contentUri =
    version === 2
      ? Uri.joinPath(workspaceFolder.uri, contentPath)
      : Uri.joinPath(workspaceFolder.uri, General.demoFolder, contentPath);
  if (!contentUri) {
    return;
  }

  const contentEditor = await workspace.openTextDocument(contentUri);
  return contentEditor.getText();
};
