import { Uri, WorkspaceFolder, workspace } from "vscode";
import { Config, General } from "../constants";
import { getSetting } from "./getSetting";

export const getFileContents = async (workspaceFolder: WorkspaceFolder, contentPath?: string) => {
  if (!contentPath) {
    return;
  }

  const isRelativeFromWorkspace = getSetting<boolean>(Config.relativeFromWorkspace);

  const contentUri = isRelativeFromWorkspace
    ? Uri.joinPath(workspaceFolder.uri, contentPath)
    : Uri.joinPath(workspaceFolder.uri, General.demoFolder, contentPath);
  if (!contentUri) {
    return;
  }

  const contentEditor = await workspace.openTextDocument(contentUri);
  return contentEditor.getText();
};
