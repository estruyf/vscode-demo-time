import { commands, Uri, ViewColumn } from 'vscode';
import { Subscription, WebviewType } from '../models';
import { Extension } from '../services/Extension';
import { General } from '../constants';
import { DemoFileProvider } from '../services/DemoFileProvider';
import { DemoRunner } from '../services/DemoRunner';
import { DemoStatusBar } from '../services/DemoStatusBar';
import { NotesService } from '../services/NotesService';
import { openFile, readFile } from '../utils';
import { COMMAND, Config, EXTENSION_NAME, WebViewMessages } from '@demotime/common';
import { BaseWebview } from '../webview/BaseWebviewPanel';

export class PresenterView extends BaseWebview {
  public static id: WebviewType = 'presenter';
  public static title: string = `${Config.title}: Presenter`;

  private static isDetached = false;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.showPresenterView, PresenterView.show));
  }

  public static show() {
    if (PresenterView.isOpen) {
      PresenterView.reveal();
    } else {
      PresenterView.create();
    }
  }

  protected static onCreate() {
    PresenterView.isDisposed = false;
    PresenterView.isDetached = false;
  }

  protected static onDispose() {
    PresenterView.isDisposed = true;
    PresenterView.isDetached = false;
  }

  protected static async messageListener(message: any) {
    super.messageListener(message);
    const { command, requestId, payload } = message;

    if (!command) {
      return;
    }

    if (command === WebViewMessages.toVscode.getTimer && requestId) {
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
}
