import { commands } from 'vscode';
import { Subscription, WebviewType } from '../models';
import { DemoFileProvider, Extension } from '../services';
import { COMMAND, WebViewMessages, Config } from '@demotime/common';
import { BaseWebview } from '../webview/BaseWebviewPanel';
import { getAbsolutePath, readFile, sortFiles } from '../utils';

export class Overview extends BaseWebview {
  public static id: WebviewType = 'overview';
  public static title: string = `${Config.title}: Overview`;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.showOverview, Overview.show));
  }

  public static show() {
    if (Overview.isOpen) {
      Overview.reveal();
    } else {
      Overview.create();
    }
  }

  protected static onCreate() {
    Overview.isDisposed = false;
  }

  protected static onDispose() {
    Overview.isDisposed = true;
  }

  protected static async messageListener(message: any) {
    const { command, requestId, payload } = message;

    if (!command) {
      return;
    }

    if (command === WebViewMessages.toVscode.configEditor.getContents) {
      handleGetContents(requestId);
    } else if (command === WebViewMessages.toVscode.getFileContents && payload) {
      try {
        const fileContents = await readFile(getAbsolutePath(payload));
        Overview.webview?.webview.postMessage({
          command: WebViewMessages.toVscode.configEditor.getContents,
          requestId: requestId,
          payload: fileContents,
        });
      } catch (e) {
        Overview.webview?.webview.postMessage({
          command: WebViewMessages.toVscode.configEditor.getContents,
          requestId: requestId,
          payload: null,
        });
      }
    }

    async function handleGetContents(requestId: string | undefined) {
      let demoFiles = await DemoFileProvider.getFiles();
      if (!demoFiles) {
        return;
      }

      const files = sortFiles(demoFiles);

      Overview.webview?.webview.postMessage({
        command: WebViewMessages.toVscode.configEditor.getContents,
        requestId: requestId,
        payload: {
          demos: files,
          fileNames: sortFiles(demoFiles),
        },
      });
    }
  }
}
