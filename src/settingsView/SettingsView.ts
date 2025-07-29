import { commands, window, WebviewPanel, ViewColumn, Uri } from "vscode";
import { Subscription } from "../models";
import { Extension } from "../services";
import { COMMAND, Config } from "../constants";

export class SettingsView {
  private static webview: WebviewPanel | null = null;
  private static isDisposed = true;
  
  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(
      commands.registerCommand(COMMAND.showSettings, SettingsView.show)
    );
  }
  
  public static get isOpen(): boolean {
    return !SettingsView.isDisposed;
  }
  
  public static show() {
    if (SettingsView.isOpen) {
      SettingsView.reveal();
    } else {
      SettingsView.create();
    }
  }
  
  public static reveal() {
    if (SettingsView.webview) {
      SettingsView.webview.reveal();
    }
  }
  
  public static async create() {
    const extensionUri = Extension.getInstance().extensionPath;
    
    // Create the preview webview
    SettingsView.webview = window.createWebviewPanel(
      'demoTime:settingsView',
      `${Config.title}: Settings View`,
      ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        enableCommandUris: true,
      },
    );
    
    SettingsView.isDisposed = false;
    
    SettingsView.webview.iconPath = {
      dark: Uri.joinPath(Uri.file(extensionUri), 'assets', 'logo', 'demotime-bg.svg'),
      light: Uri.joinPath(Uri.file(extensionUri), 'assets', 'logo', 'demotime-bg.svg'),
    };
    
    SettingsView.webview.webview.html = await SettingsView.getWebviewContent();
    
    SettingsView.webview.onDidDispose(async () => {
      SettingsView.isDisposed = true;
    });
    
    SettingsView.webview.webview.onDidReceiveMessage(SettingsView.messageListener);
  }
  
  private static async messageListener(message: any) {
    const { command, requestId, payload } = message;
    
    if (!command) {
      return;
    }
  }

  private static async getWebviewContent() {
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
            <link rel="icon" type="image/svg+xml" href="/vite.svg" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Demo Time Config Editor</title>
          </head>
          <body>
            <div id="root" data-view-type="settings"></div>
            <script type="module" src="http://localhost:5173/src/main.tsx"></script>
          </body>
        </html>`;
    }

    const URL = `https://config-beta.demotime.show`;
    const response = await fetch(URL, {
      headers: {
        'Content-Type': 'text/html',
      },
      cache: 'no-cache',
    });
    
    const html = await response.text();
    // Patch relative asset URLs to absolute URLs using the base URL
    const baseUrl = URL.replace(/\/$/, '');
    const patchedHtml = html
      .replace(/(src|href)=["'](\/assets\/[^"']+)["']/g, (match, attr, path) => {
        return `${attr}="${baseUrl}${path}"`;
      })
      .replace(/href=["']\/vite\.svg["']/g, `href="${baseUrl}/vite.svg"`)
      .replace(`id="root"`, `id="root" data-view-type="settings"`);

    return patchedHtml.toString();
  }
}