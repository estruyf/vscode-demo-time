import { Uri, Webview } from 'vscode';
import { WebviewType } from '../models';
import { Extension, Logger, Notifications } from '../services';
import { fileExists } from './fileExists';
import { getWebviewExtensionUrl, getWebviewWorkspaceUrl, readFile } from '.';
import { WebviewHtml } from '../webview';

export const getWebviewHtml = async (
  type: WebviewType,
  webview: Webview,
  jsFiles: (Uri | string)[],
  moduleFiles: (Uri | string)[],
  cssFiles: (Uri | string)[],
) => {
  Logger.info(`Loading webview HTML for type: ${type}`);

  const extension = Extension.getInstance();
  const webviewWsUrl = getWebviewWorkspaceUrl(webview, '');
  const webviewExtUrl = getWebviewExtensionUrl(webview);

  const scriptUrls = jsFiles.map((file) =>
    typeof file === 'string' && file.startsWith(`http`)
      ? file
      : webview.asWebviewUri(file as Uri).toString(),
  );
  const moduleUrls = moduleFiles.map((file) =>
    typeof file === 'string' && file.startsWith(`http`)
      ? file
      : webview.asWebviewUri(file as Uri).toString(),
  );
  const styleUrls = cssFiles.map((file) =>
    typeof file === 'string' && file.startsWith(`http`)
      ? file
      : webview.asWebviewUri(file as Uri).toString(),
  );

  const htmlToInclude = [
    ...styleUrls.map((href) => `<link rel="stylesheet" href="${href}" />`),
    ...moduleUrls.map((src) => `<script type="module" src="${src}"></script>`),
    ...scriptUrls.map((src) => `<script src="${src}"></script>`),
    '</head>',
  ].join('\n');

  if (extension.isProductionMode) {
    const extensionUri = extension.extensionUri;
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

      patchedHtml = patchedHtml.replace('</head>', htmlToInclude);

      return patchedHtml;
    } catch (error) {
      Notifications.error('Error loading webview HTML file.');
      return;
    }
  } else {
    // DEVELOPMENT MODE
    return `
        <!doctype html>
        <html lang="en">
          <head>
            <script type="module">
              import RefreshRuntime from "http://localhost:5173/@react-refresh"
              RefreshRuntime.injectIntoGlobalHook(window)
              window.$RefreshReg$ = () => {}
              window.$RefreshSig$ = () => (type) => type
              window.__vite_plugin_react_preamble_installed__ = true
            </script>

            <script type="module" src="http://localhost:5173/@vite/client"></script>

            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Demo Time Config Editor</title>
          </head>
          <body>
            <div id="root" data-view-type="${type}" data-webview-url="${webviewWsUrl}" data-extension-url="${webviewExtUrl}"></div>

            ${htmlToInclude}
            <script type="module" src="http://localhost:5173/src/main.tsx"></script>
          </body>
        </html>`;
  }
};
