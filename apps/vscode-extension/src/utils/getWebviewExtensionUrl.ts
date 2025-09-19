import { Webview } from 'vscode';
import { Extension } from '../services';

export const getWebviewExtensionUrl = (webview: Webview) => {
  const extUri = Extension.getInstance().extensionUri;
  if (!extUri) {
    return;
  }

  const fileWebviewPath = webview.asWebviewUri(extUri).toString();
  return fileWebviewPath;
};
