import { Uri, WorkspaceFolder, workspace, env } from "vscode";
import { General, StateKeys } from "../constants";
import { parse as jsonParse } from "jsonc-parser";
import { Logger } from "../services/Logger";
import { fileExists } from "./fileExists";
import { Extension } from "../services/Extension";

export const getVariables = async (workspaceFolder: WorkspaceFolder): Promise<{ [key: string]: any } | undefined> => {
  try {
    // Set the default variables
    const clipboard = await env.clipboard.readText();
    const defaultVariables: { [key: string]: string } = {
      DT_CLIPBOARD: clipboard,
      DT_INPUT: "",
    };

    // Get the state variables
    const ext = Extension.getInstance();
    const stateVariables = ext.getState<{ [key: string]: string }>(StateKeys.variables) || {};
    for (const key of Object.keys(stateVariables)) {
      defaultVariables[`STATE_${key}`] = stateVariables[key];
    }

    const contentUri = Uri.joinPath(workspaceFolder.uri, General.demoFolder, General.variablesFile);
    if (!(await fileExists(contentUri))) {
      return {
        ...defaultVariables,
      };
    }

    const contentEditor = await workspace.openTextDocument(contentUri);
    const content = contentEditor.getText();
    const variables = jsonParse(content);
    return {
      ...variables,
      ...defaultVariables,
    };
  } catch (error) {
    Logger.error((error as Error).message);
  }
};
