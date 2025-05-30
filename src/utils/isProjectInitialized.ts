import { Uri, workspace } from "vscode";
import { fileExists } from "./fileExists";
import { General } from "../constants";

export async function isProjectInitialized(): Promise<boolean> {
  const workspaceFolder = workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return false;
  }

  const demoFolderUri = Uri.joinPath(workspaceFolder.uri, General.demoFolder);

  // Check if the `.demo` folder and `demo.json` file exist
  const folderExists = await fileExists(demoFolderUri);

  return folderExists;
}
