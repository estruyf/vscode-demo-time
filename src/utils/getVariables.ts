import { Uri, WorkspaceFolder, workspace } from "vscode";
import { General } from "../constants";
import { parse as jsonParse } from "jsonc-parser";

export const getVariables = async (workspaceFolder: WorkspaceFolder): Promise<{ [key: string]: any} | undefined> => {
  try {
    const contentUri = Uri.joinPath(workspaceFolder.uri, General.demoFolder, General.variablesFile);
    if (!contentUri) {
      return;
    }

    const contentEditor = await workspace.openTextDocument(contentUri);
    const content = contentEditor.getText();
    return jsonParse(content);
  } catch (error) {
    console.error(error);
  }
};
