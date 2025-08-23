import { commands, Uri, Webview, WebviewPanel, window, ViewColumn } from 'vscode';
import { Subscription } from '../models';
import { Extension } from '../services/Extension';
import { General } from '../constants';
import { MessageHandlerData } from '@estruyf/vscode';
import { DemoFileProvider } from '../services/DemoFileProvider';
import { DemoRunner } from '../services/DemoRunner';
import { DemoStatusBar } from '../services/DemoStatusBar';
import { NotesService } from '../services/NotesService';
import { openFile, readFile } from '../utils';
import { COMMAND, Config, EXTENSION_NAME, WebViewMessages } from '@demotime/common';

export class PresenterView {
  private static webview: WebviewPanel | null = null;
  private static isDisposed = true;
  private static isDetached = false;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.showPresenterView, PresenterView.show));
  }

  public static get isOpen(): boolean {
    return !PresenterView.isDisposed;
  }

  public static show() {
    if (PresenterView.isOpen) {
      PresenterView.reveal();
    } else {
      PresenterView.create();
    }
  }

  public static reveal(hasData = false) {
    if (PresenterView.webview) {
      PresenterView.webview.reveal();
    }
  }

  public static close() {
    PresenterView.webview?.dispose();
  }

  public static async create() {
    const extensionUri = Extension.getInstance().extensionPath;

    // Create the preview webview
    PresenterView.webview = window.createWebviewPanel(
      'demoTime:presenterView',
      `${Config.title}: Presenter View`,
      ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        enableCommandUris: true,
      },
    );

    PresenterView.isDisposed = false;
    PresenterView.isDetached = false;

    PresenterView.webview.iconPath = {
      dark: Uri.joinPath(Uri.file(extensionUri), 'assets', 'logo', 'demotime-bg.svg'),
      light: Uri.joinPath(Uri.file(extensionUri), 'assets', 'logo', 'demotime-bg.svg'),
    };

    PresenterView.webview.webview.html = await PresenterView.getWebviewContent(
      PresenterView.webview.webview,
    );

    PresenterView.webview.onDidDispose(async () => {
      PresenterView.isDisposed = true;
      PresenterView.isDetached = false;
    });

    PresenterView.webview.webview.onDidReceiveMessage(PresenterView.messageListener);
  }

  private static async messageListener(message: any) {
    const { command, requestId, payload } = message;

    if (!command) {
      return;
    }

    if (command === WebViewMessages.toVscode.getSetting && requestId) {
      const setting = Extension.getInstance().getSetting(payload);
      PresenterView.postRequestMessage(command, requestId, setting);
    } else if (command === WebViewMessages.toVscode.getTimer && requestId) {
      const timer = await DemoStatusBar.getTimer();
      PresenterView.postRequestMessage(command, requestId, timer);
    } else if (command === WebViewMessages.toVscode.getDemoFiles) {
      const demoFiles = await DemoFileProvider.getFiles();
      PresenterView.postRequestMessage(command, requestId, demoFiles);
    } else if (command === WebViewMessages.toVscode.getRunningDemos) {
      const executingFile = await DemoRunner.getExecutedDemoFile();
      PresenterView.postRequestMessage(command, requestId, executingFile);
    } else if (command === WebViewMessages.toVscode.getCurrentDemo) {
      PresenterView.postRequestMessage(command, requestId, DemoRunner.currentDemo);
    } else if (command === WebViewMessages.toVscode.getNextDemo) {
      const nextDemo = DemoStatusBar.getNextDemo();
      PresenterView.postRequestMessage(command, requestId, nextDemo);
    } else if (command === WebViewMessages.toVscode.runCommand && payload) {
      const { command: cmd, args } = payload;
      if (!cmd) {
        return;
      }

      if ((cmd as string).startsWith(EXTENSION_NAME)) {
        await commands.executeCommand(`workbench.action.focusActivityBar`);
      }

      if (args) {
        commands.executeCommand(cmd, args);
      } else {
        commands.executeCommand(cmd);
      }
    } else if (command === WebViewMessages.toVscode.getCountdownStarted) {
      const startTime = DemoStatusBar.getCountdownStarted();
      PresenterView.postRequestMessage(command, requestId, startTime);
    } else if (command === WebViewMessages.toVscode.getPresentationStarted) {
      const isPresentationMode = DemoRunner.getIsPresentationMode();
      PresenterView.postRequestMessage(command, requestId, isPresentationMode);
    } else if (command === WebViewMessages.toVscode.detach) {
      const panel = PresenterView.webview;
      if (panel?.viewColumn === ViewColumn.One && !PresenterView.isDetached) {
        PresenterView.isDetached = true;
        commands.executeCommand('workbench.action.moveEditorToNewWindow');
      }
    } else if (command === WebViewMessages.toVscode.openNotes && payload) {
      await commands.executeCommand(`workbench.action.focusActivityBar`);

      const { path } = payload;
      if (path) {
        NotesService.openNotes(path);
      }
    } else if (command === WebViewMessages.toVscode.getNotes && payload) {
      const { path } = payload;
      if (path) {
        const workspaceFolder = Extension.getInstance().workspaceFolder;
        const version = DemoRunner.getCurrentVersion();
        const notesPath = workspaceFolder
          ? version === 2
            ? Uri.joinPath(workspaceFolder.uri, path)
            : Uri.joinPath(workspaceFolder.uri, General.demoFolder, path)
          : undefined;
        if (notesPath) {
          const notes = await readFile(notesPath);
          PresenterView.postRequestMessage(command, requestId, notes);
          return;
        }
      }
      PresenterView.postRequestMessage(command, requestId, undefined);
    } else if (command === WebViewMessages.toVscode.openFile && payload) {
      await openFile(payload);
    }
  }

  public static async postMessage(command: string, payload: any) {
    if (PresenterView.isDisposed) {
      return;
    }

    PresenterView.webview?.webview.postMessage({
      command,
      payload,
    } as MessageHandlerData<any>);
  }

  private static async postRequestMessage(command: string, requestId: string, payload: any) {
    PresenterView.webview?.webview.postMessage({
      command,
      requestId,
      payload,
    } as MessageHandlerData<any>);
  }

  // private static async getWebviewContent(webview: Webview) {
  //   const jsFile = 'main.bundle.js';
  //   const localServerUrl = 'http://localhost:9000';

  //   let scriptUrl = [];

  //   const extension = Extension.getInstance();
  //   if (extension.isProductionMode) {
  //     // Get the manifest file from the dist folder
  //     const extPath = Uri.file(extension.extensionPath);
  //     const manifestPath = Uri.joinPath(extPath, 'out', 'presenter', 'manifest.json');
  //     const manifest = await readFile(manifestPath);
  //     const manifestJson = JSON.parse(manifest);

  //     for (const [key, value] of Object.entries<string>(manifestJson)) {
  //       if (key.endsWith('.js')) {
  //         scriptUrl.push(
  //           webview.asWebviewUri(Uri.joinPath(extPath, 'out', 'presenter', value)).toString(),
  //         );
  //       }
  //     }
  //   } else {
  //     scriptUrl.push(`${localServerUrl}/${jsFile}`);
  //   }

  //   return `<!DOCTYPE html>
  //   <html lang="en">
  //   <head>
  //     <meta charset="UTF-8">
  //     <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //   </head>
  //   <body>
  //     <div id="root"></div>

  //     ${scriptUrl.map((url) => `<script src="${url}"></script>`).join('\n')}

  //     <img style="display:none" src="https://api.visitorbadge.io/api/combined?path=https:%2f%2fgithub.com%2festruyf%2fvscode-demo-time&labelColor=%23202736&countColor=%23FFD23F&slug=presenter-view" alt="Presenter view usage" />
  //   </body>
  //   </html>`;
  // }

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
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Demo Time Config Editor</title>
          </head>
          <body>
            <div id="root" data-view-type="presenter"></div>
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
        .replace(`id="root"`, `id="root" data-view-type="presenters"`);

      return patchedHtml.toString();
    } catch (error) {
      console.error('Error fetching settings webview:', error);
      return `<html><body><h2>Unable to load settings view. Please check your network connection or try again later.</h2></body></html>`;
    }
  }
}
