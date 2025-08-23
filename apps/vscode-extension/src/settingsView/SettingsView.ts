import { commands, window, WebviewPanel, ViewColumn, Uri } from 'vscode';
import { Subscription } from '../models';
import { Extension } from '../services';
import { COMMAND, Config } from '../constants';
import { openFilePicker, sleep } from '../utils';
import { WebViewMessages } from '@demotime/common';

export class SettingsView {
  private static webview: WebviewPanel | null = null;
  private static isDisposed = true;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.showSettings, SettingsView.show));
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

    if (command === WebViewMessages.toVscode.settingsView.getSettings) {
      await SettingsView.getAllSettings(command, requestId);
    } else if (command === WebViewMessages.toVscode.settingsView.saveSettings) {
      await SettingsView.saveSettings(command, requestId, payload);
    } else if (command === WebViewMessages.toVscode.configEditor.filePicker) {
      await SettingsView.selectFile(command, requestId, payload);
    }
  }

  private static async selectFile(
    command: string,
    requestId: string,
    payload?: { fileTypes: string[] },
  ) {
    const filePath = await openFilePicker(payload?.fileTypes);
    if (!filePath) {
      SettingsView.webview?.webview.postMessage({
        command: command,
        requestId: requestId,
        payload: null,
      });
      return;
    }

    SettingsView.webview?.webview.postMessage({
      command: command,
      requestId: requestId,
      payload: filePath,
    });
  }

  private static async saveSettings(
    command: string,
    requestId: string,
    payload: Record<string, any>,
  ) {
    try {
      const ext = Extension.getInstance();
      const settings = payload;

      for (const [key, value] of Object.entries(settings)) {
        await ext.setSetting(key, value);
        await sleep(100); // Adding a small delay to ensure settings are saved properly
      }

      SettingsView.webview?.webview.postMessage({
        command: command,
        requestId: requestId,
        payload: true,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      SettingsView.webview?.webview.postMessage({
        command: command,
        requestId: requestId,
        payload: false,
      });
    }
  }

  private static async getAllSettings(command: string, requestId: string) {
    const ext = Extension.getInstance();
    const settingsObject = {
      defaultFileType: ext.getSetting(Config.defaultFileType),
      previousEnabled: ext.getSetting(Config.presentationMode.previousEnabled),
      highlightBorderColor: ext.getSetting(Config.highlight.borderColor),
      highlightBackground: ext.getSetting(Config.highlight.background),
      highlightBlur: ext.getSetting(Config.highlight.blur),
      highlightOpacity: ext.getSetting(Config.highlight.opacity),
      highlightZoomEnabled: ext.getSetting(Config.highlight.zoom),
      showClock: ext.getSetting(Config.clock.show),
      timer: ext.getSetting(Config.clock.timer),
      insertTypingMode: ext.getSetting(Config.insert.typingMode),
      insertTypingSpeed: ext.getSetting(Config.insert.typingSpeed),
      hackerTyperChunkSize: ext.getSetting(Config.insert.hackerTyperChunkSize),
      'api.enabled': ext.getSetting(Config.api.enabled),
      'api.port': ext.getSetting(Config.api.port),
      customTheme: ext.getSetting(Config.slides.customTheme),
      slideHeaderTemplate: ext.getSetting(Config.slides.slideHeaderTemplate),
      slideFooterTemplate: ext.getSetting(Config.slides.slideFooterTemplate),
      customWebComponents: ext.getSetting(Config.webcomponents.scripts),
      nextActionBehaviour: ext.getSetting(Config.demoRunner.nextActionBehaviour),
      openInConfigEditor: ext.getSetting(Config.configEditor.openInConfigEditor),
    };

    const response = {
      command,
      requestId,
      payload: settingsObject,
    };

    if (SettingsView.webview) {
      SettingsView.webview.webview.postMessage(response);
    } else {
      window.showErrorMessage('Settings view is not open.');
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
        .replace(`id="root"`, `id="root" data-view-type="settings"`);

      return patchedHtml.toString();
    } catch (error) {
      console.error('Error fetching settings webview:', error);
      return `<html><body><h2>Unable to load settings view. Please check your network connection or try again later.</h2></body></html>`;
    }
  }
}
