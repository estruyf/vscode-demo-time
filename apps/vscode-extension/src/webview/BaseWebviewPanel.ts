import { MessageHandlerData } from '@estruyf/vscode';
import { Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import { Extension, Notifications } from '../services';
import { getWebviewHtml } from '../utils';
import { Config } from '@demotime/common';
import { WebviewType } from '../models';

export class BaseWebview {
  public static id: WebviewType | undefined;
  public static title: string | undefined;
  protected static webview: WebviewPanel | null = null;
  protected static isDisposed = true;

  protected static get isOpen(): boolean {
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

    this.webview.webview.html = (await getWebviewHtml(this.id, this.webview.webview)) || '';

    this.webview.onDidDispose(this.onDispose);

    this.webview.webview.onDidReceiveMessage(this.messageListener);
  }

  protected static async messageListener(_: MessageHandlerData<any>) {}

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
