import { Uri, Webview } from 'vscode';
import { WebviewType } from '../models';
import { Extension, Logger, Notifications } from '../services';
import { fileExists } from './fileExists';
import { getWebviewExtensionUrl, getWebviewWorkspaceUrl, readFile } from '.';
import { WebviewHtml } from '../webview';

export const getWebviewHtml = async (type: WebviewType, webview: Webview) => {
  Logger.info(`Loading webview HTML for type: ${type}`);

  const extensions = Extension.getInstance();
  const extensionUri = extensions.extensionUri;
  let webviewHtml = WebviewHtml;

  if (!webviewHtml) {
    const webviewPath = Uri.joinPath(extensionUri, 'webviews', 'index.html');

    if (!(await fileExists(webviewPath))) {
      Notifications.error('Webview HTML file not found.');
      return;
    }

    try {
      const html = await readFile(webviewPath);
      if (!html) {
        Notifications.error('Failed to read webview HTML file.');
        return;
      }

      webviewHtml = html;
    } catch (error) {
      Notifications.error('Error loading webview HTML file.');
      return;
    }
  }

  const webviewWsUrl = getWebviewWorkspaceUrl(webview, '');
  const webviewExtUrl = getWebviewExtensionUrl(webview);

  try {
    if (!webviewHtml) {
      Notifications.error('Failed to read webview HTML file.');
      return;
    }

    const baseUrl = `${webviewExtUrl}/webviews/`;

    let patchedHtml = webviewHtml || '';
    if (patchedHtml.includes('<base href="/" />')) {
      patchedHtml = patchedHtml.replace('<base href="/" />', `<base href="${baseUrl}" />`);
    }

    patchedHtml = patchedHtml.replace(
      `id="root"`,
      `id="root" data-view-type="${type}" data-webview-url="${webviewWsUrl}" data-extension-url="${webviewExtUrl}"`,
    );

    return patchedHtml;
  } catch (error) {
    Notifications.error('Error loading webview HTML file.');
    return;
  }
};
