import { parse as jsonParse } from "jsonc-parser";
import { env, UIKind, Uri, workspace, WorkspaceFolder } from "vscode";
import { Config, General, StateKeys } from "../constants";
import { Extension } from "../services/Extension";
import { Logger } from "../services/Logger";
import { fileExists } from "./fileExists";

export const getVariables = async (workspaceFolder: WorkspaceFolder): Promise<{ [key: string]: any } | undefined> => {
  try {
    const ext = Extension.getInstance();

    if (ext.getSetting<boolean>(Config.api.enabled) && env.uiKind === UIKind.Web) {
      // otherwise clipboard is not readable in the browser
      // if request is triggered from another window
      window.focus();
    }
    const clipboard = await env.clipboard.readText();
    // Set the default variables
    const defaultVariables: { [key: string]: string } = {
      DT_INPUT: "",
      DT_CLIPBOARD: clipboard
    };

    // Get the state variables

    const stateVariables = ext.getState<{ [key: string]: string }>(StateKeys.variables) || {};
    for (const key of Object.keys(stateVariables)) {
      defaultVariables[key] = stateVariables[key];
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
