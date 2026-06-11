import { COMMAND, Config, WebViewMessages } from '@demotime/common';
import { commands, Uri, workspace } from 'vscode';
import * as path from 'path';
import { Subscription, WebviewType } from '../models';
import { Extension } from '../services';
import { BaseWebview } from '../webview/BaseWebviewPanel';

interface ExportThemePayload {
  filename: string;
  css: string;
  setAsDefault: boolean;
}

export class ThemeBuilderView extends BaseWebview {
  public static id: WebviewType = 'theme-builder';
  public static title: string = `${Config.title}: Theme Builder`;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.showThemeBuilder, ThemeBuilderView.show));
  }

  public static show() {
    if (ThemeBuilderView.isOpen) {
      ThemeBuilderView.reveal();
    } else {
      ThemeBuilderView.create();
    }
  }

  protected static onCreate() {
    ThemeBuilderView.isDisposed = false;
  }

  protected static onDispose() {
    ThemeBuilderView.isDisposed = true;
  }

  protected static async messageListener(message: any) {
    await super.messageListener(message);
    const { command, requestId, payload } = message;

    if (!command || !requestId) {
      return;
    }

    if (command === WebViewMessages.toVscode.themeBuilder.exportTheme && payload) {
      const result = await ThemeBuilderView.exportTheme(payload as ExportThemePayload);
      ThemeBuilderView.postRequestMessage(command, requestId, result);
    }
  }

  private static async exportTheme(payload: ExportThemePayload) {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return { success: false, message: 'No workspace folder is open.' };
    }

    if (!payload?.filename || !payload?.css) {
      return { success: false, message: 'Missing theme filename or CSS contents.' };
    }

    // The webview sends a sanitized name, but never trust a path from a message.
    const filename = path.basename(payload.filename);
    const relativePath = `.demo/theme/${filename}`;
    const targetUri = Uri.joinPath(workspaceFolder.uri, '.demo', 'theme', filename);

    try {
      await workspace.fs.createDirectory(Uri.joinPath(workspaceFolder.uri, '.demo', 'theme'));
      await workspace.fs.writeFile(targetUri, new TextEncoder().encode(payload.css));

      if (payload.setAsDefault) {
        await Extension.getInstance().setSetting(Config.slides.customTheme, relativePath);
      }

      return { success: true, path: relativePath };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }
}
