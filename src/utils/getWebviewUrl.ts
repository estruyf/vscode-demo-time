import { Uri, Webview } from "vscode";
import { Extension } from "../services";

export const getWebviewUrl = (webview: Webview, path: string | null) => {
  const wsFolder = Extension.getInstance().workspaceFolder;
  if (!wsFolder) {
    return;
  }

  const fileWebviewPath = webview.asWebviewUri(path ? Uri.joinPath(wsFolder.uri, path) : wsFolder.uri).toString();
  return fileWebviewPath;
};
