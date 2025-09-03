import { parse } from './../../../../node_modules/zod/src/v4/classic/parse';
import { commands, Uri } from 'vscode';
import { Subscription, WebviewType } from '../models';
import { DemoCreator, DemoFileProvider, Extension } from '../services';
import { COMMAND, WebViewMessages, Config } from '@demotime/common';
import { BaseWebview } from '../webview/BaseWebviewPanel';
import { getAbsolutePath, getRelPath, parseWinPath, readFile, sortFiles } from '../utils';
import { Preview } from '../preview/Preview';

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
    super.messageListener(message);
    const { command, requestId, payload } = message;

    if (!command) {
      return;
    }

    if (command === WebViewMessages.toVscode.overview.getFiles) {
      handleGetFiles(requestId);
    } else if (command === WebViewMessages.toVscode.overview.openConfig) {
      handleOpenConfig(payload);
    } else if (command === WebViewMessages.toVscode.overview.openConfigStep) {
      handleOpenConfigStep(payload);
    } else if (command === WebViewMessages.toVscode.overview.openSlide) {
      handleOpenSlide(payload);
    }

    async function handleGetFiles(requestId: string | undefined) {
      let demoFiles = await DemoFileProvider.getFiles();
      if (!demoFiles) {
        return;
      }

      const files = sortFiles(demoFiles);

      Overview.webview?.webview.postMessage({
        command: WebViewMessages.toVscode.overview.getFiles,
        requestId: requestId,
        payload: {
          demos: demoFiles,
          fileNames: files,
        },
      });
    }

    async function handleOpenConfig(payload: string) {
      if (!payload) {
        return;
      }

      const uri = Uri.parse(payload);
      commands.executeCommand(COMMAND.openConfigEditor, uri);
    }

    async function handleOpenConfigStep(payload: {
      demoFilePath: string;
      stepIndex: number;
      originalLabel: string;
    }) {
      if (!payload || !payload.demoFilePath) {
        return;
      }

      DemoCreator.openDemoFile(payload, true);
    }

    async function handleOpenSlide(payload: { filePath: string; slideIndex: number }) {
      if (!payload || !payload.filePath) {
        return;
      }

      Preview.show(parseWinPath(payload.filePath), undefined, payload.slideIndex || 0);
    }
  }
}
