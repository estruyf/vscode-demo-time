import { WebviewType } from '../models';
import { Extension } from '../services';

export const getWebviewHtml = async (type: WebviewType) => {
  console.log(`Loading webview HTML for type: ${type}`);
  const extensions = Extension.getInstance();
  if (!extensions.isProductionMode) {
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
              <div id="root" data-view-type="${type}"></div>
              <script type="module" src="http://localhost:5173/src/main.tsx"></script>
            </body>
          </html>`;
  }

  const URL = `https://config-beta.demotime.show`;
  try {
    const response = await fetch(URL, {
      headers: {
        'Content-Type': 'text/html',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch settings webview: HTTP ${response.status} ${response.statusText}`,
      );
      return `<html><body><h2>Unable to load settings view (HTTP ${response.status}). Please check your network connection or try again later.</h2></body></html>`;
    }

    const html = await response.text();
    // Patch relative asset URLs to absolute URLs using the base URL
    const baseUrl = URL.replace(/\/$/, '');
    const patchedHtml = html
      .replace(/(src|href)=["'](\/assets\/[^"']+)["']/g, (match, attr, path) => {
        return `${attr}="${baseUrl}${path}"`;
      })
      .replace(/href=["']\/vite\.svg["']/g, `href="${baseUrl}/vite.svg"`)
      .replace(`id="root"`, `id="root" data-view-type="${type}"`);

    return patchedHtml.toString();
  } catch (error) {
    console.error('Error fetching settings webview:', error);
    return `<html><body><h2>Unable to load settings view. Please check your network connection or try again later.</h2></body></html>`;
  }
};
