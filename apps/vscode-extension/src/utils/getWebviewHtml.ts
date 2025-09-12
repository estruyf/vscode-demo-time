import { Uri, Webview, workspace, WorkspaceFolder } from 'vscode';
import { WebviewType } from '../models';
import { Extension, Logger, Notifications } from '../services';
import { fileExists } from './fileExists';
import { getWebviewExtensionUrl, getWebviewWorkspaceUrl, readFile } from '.';
import { WebviewHtml } from '../webview';

export const getWebviewHtml = async (
  type: WebviewType,
  webview: Webview,
  jsFiles?: (Uri | string)[],
  moduleFiles?: (Uri | string)[],
  cssFiles?: (Uri | string)[],
) => {
  Logger.info(`Loading webview HTML for type: ${type}`);

  const extension = Extension.getInstance();
  const webviewWsUrl = getWebviewWorkspaceUrl(webview, '');
  const webviewExtUrl = getWebviewExtensionUrl(webview);

  const scriptUrls = (jsFiles || []).map((file) =>
    typeof file === 'string' && file.startsWith(`http`)
      ? file
      : webview.asWebviewUri(file as Uri).toString(),
  );
  const moduleUrls = (moduleFiles || []).map((file) =>
    typeof file === 'string' && file.startsWith(`http`)
      ? file
      : webview.asWebviewUri(file as Uri).toString(),
  );
  const styles = [];
  for (const file of cssFiles || []) {
    let contents = await readFile(file as Uri);
    if (!contents) {
      Notifications.error(`Failed to read CSS file: ${file}`);
      continue;
    }

    // Update the URLs in the CSS files to use the webview URIs where https is not used
    const workspaceUri = extension.workspaceFolder?.uri;
    if (!workspaceUri) {
      continue;
    }

    contents = contents.replace(/url\((?!['"]?(?:https?:)?\/\/)([^)]+)\)/g, (match, p1) => {
      const trimmedPath = p1.trim().replace(/^['"]|['"]$/g, '');
      const absolutePath = Uri.joinPath(workspaceUri, trimmedPath);
      const webviewUri = webview.asWebviewUri(absolutePath);
      return `url(${webviewUri})`;
    });

    styles.push(contents);
  }

  const allStyles = await Promise.all(styles);

  const htmlToInclude = [
    // ...styleUrls.map((href) => `<link rel="stylesheet" href="${href}" />`),
    ...allStyles.map((style) => `<style>${style}</style>`),
    ...moduleUrls.map((src) => `<script type="module" src="${src}"></script>`),
    ...scriptUrls.map((src) => `<script src="${src}"></script>`),
    '</body>',
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

      patchedHtml = patchedHtml.replace('</body>', htmlToInclude);

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

            <script type="module" src="http://localhost:5173/src/main.tsx"></script>
            ${htmlToInclude}
          </body>
        </html>`;
  }
};
