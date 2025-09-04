import { MessageHandlerData } from '@estruyf/vscode';
import { commands, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { Extension, Notifications } from '../services';
import { getAbsolutePath, getWebviewHtml, readFile } from '../utils';
import { Config, EXTENSION_NAME, WebViewMessages } from '@demotime/common';
import { WebviewType } from '../models';

export class BaseWebview {
  public static id: WebviewType | undefined;
  public static title: string | undefined;
  protected static webview: WebviewPanel | null = null;
  protected static isDisposed = true;

  public static get isOpen(): boolean {
    return !this.isDisposed;
  }

  protected static reveal() {
    if (this.webview) {
      this.webview.reveal();
    }
  }

  public static close() {
    this.webview?.dispose();
  }

  protected static onCreate() {
    this.isDisposed = false;
  }

  protected static onDispose() {
    this.isDisposed = true;
  }

  protected static getJsFiles(): (Uri | string)[] {
    return [];
  }

  protected static getModuleFiles(): (Uri | string)[] {
    return [];
  }

  protected static getCssFiles(): (Uri | string)[] {
    return [];
  }

  protected static async create() {
    if (!this.id) {
      Notifications.error('Webview ID is not set. Cannot create webview panel.');
      return;
    }

    const extensionUri = Extension.getInstance().extensionPath;

    // Create the preview webview
    this.webview = window.createWebviewPanel(
      `demoTime:${this.id}`,
      this.title || Config.title,
      ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        enableCommandUris: true,
      },
    );

    this.onCreate();

    this.webview.iconPath = {
      dark: Uri.joinPath(Uri.file(extensionUri), 'assets', 'logo', 'demotime-bg.svg'),
      light: Uri.joinPath(Uri.file(extensionUri), 'assets', 'logo', 'demotime-bg.svg'),
    };

    const jsFiles = this.getJsFiles();
    const moduleFiles = this.getModuleFiles();
    const cssFiles = this.getCssFiles();

    this.webview.webview.html =
      (await getWebviewHtml(this.id, this.webview.webview, jsFiles, moduleFiles, cssFiles)) || '';

    this.webview.onDidDispose(this.onDispose, this);

    this.webview.webview.onDidReceiveMessage(this.messageListener, this);
  }

  protected static async messageListener(message: MessageHandlerData<any>) {
    const { command, requestId, payload } = message;

    if (command === WebViewMessages.toVscode.getSetting && requestId) {
      const setting = Extension.getInstance().getSetting(payload);
      this.postRequestMessage(command, requestId, setting);
    } else if (command === WebViewMessages.toVscode.getFileContents && requestId) {
      if (typeof payload !== 'string') {
        this.postRequestMessage(command, requestId, null);
        return;
      }

      try {
        const abs = getAbsolutePath(payload);
        const fileContents = await readFile(abs);
        this.postRequestMessage(command, requestId, fileContents);
      } catch (e) {
        this.postRequestMessage(command, requestId, null);
      }
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
    }
  }

  public static async postMessage(command: string, payload?: any) {
    if (this.isDisposed) {
      return;
    }

    this.webview?.webview.postMessage({
      command,
      payload,
    } as MessageHandlerData<any>);
  }

  public static async postRequestMessage(command: string, requestId: string, payload: any) {
    if (this.isDisposed) {
      return;
    }

    this.webview?.webview.postMessage({
      command,
      requestId,
      payload,
    } as MessageHandlerData<any>);
  }
}
