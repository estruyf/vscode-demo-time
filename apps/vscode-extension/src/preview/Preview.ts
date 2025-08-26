import { Uri, window, commands } from 'vscode';
import { Extension } from '../services/Extension';
import { ContextKeys } from '../constants';
import {
  getAbsolutePath,
  getTheme,
  getWebviewWorkspaceUrl,
  readFile,
  setContext,
  togglePresentationView,
} from '../utils';
import { DemoRunner } from '../services';
import { COMMAND, WebViewMessages, Config } from '@demotime/common';
import { BaseWebview } from '../webview/BaseWebviewPanel';
import { WebviewType } from '../models';

export class Preview extends BaseWebview {
  public static id: WebviewType = 'preview';

  private static hasClickListener = false;
  private static hasPreviousSlide = false;
  private static hasNextSlide = false;
  private static crntFile: string | null = null;
  private static crntCss: string | null = null;
  private static currentSlideIndex: number = 0;

  public static register() {
    const subscriptions = Extension.getInstance().subscriptions;

    subscriptions.push(
      commands.registerCommand(COMMAND.togglePresentationView, togglePresentationView),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.closePresentationView, () => togglePresentationView(false)),
    );
  }

  public static getCurrentSlideIndex(): number {
    return Preview.currentSlideIndex;
  }

  public static setCurrentSlideIndex(index: number): void {
    Preview.currentSlideIndex = Math.max(index, -1);
  }

  public static isListening(): boolean {
    if (!Preview.isOpen) {
      return false;
    }

    return Preview.hasClickListener;
  }

  public static checkIfHasNextSlide(): boolean {
    if (!Preview.isOpen) {
      return false;
    }
    return Preview.hasNextSlide;
  }

  public static checkIfHasPreviousSlide(): boolean {
    if (!Preview.isOpen) {
      return false;
    }
    return Preview.hasPreviousSlide;
  }

  public static async show(fileUri: string, css?: string) {
    if (Preview.crntFile !== fileUri) {
      Preview.currentSlideIndex = 0;
    }

    Preview.crntFile = fileUri ?? null;
    Preview.crntCss = css ?? null;

    if (Preview.isOpen) {
      // Use the fileUri argument for triggerUpdate, as it's the most current.
      if (Preview.webview?.webview && fileUri) {
        const fileWebviewPath = getWebviewWorkspaceUrl(Preview.webview?.webview, fileUri);
        Preview.triggerUpdate(fileWebviewPath);

        if (css) {
          const cssWebviewPath = getWebviewWorkspaceUrl(Preview.webview?.webview, css);
          Preview.postMessage(WebViewMessages.toWebview.updateStyles, cssWebviewPath);
        } else {
          Preview.postMessage(WebViewMessages.toWebview.updateStyles, undefined);
        }
      }
    } else {
      await Preview.create();
      // After creating, if fileUri is available, trigger update
      if (fileUri && Preview.webview?.webview) {
        // Use fileUri from argument
        const fileWebviewPath = getWebviewWorkspaceUrl(Preview.webview.webview, fileUri);
        Preview.triggerUpdate(fileWebviewPath); // Convert string to Uri
      }
    }
  }

  public static triggerUpdate(fileUri?: Uri | string, reset: boolean = false) {
    if (!fileUri || !Preview.webview?.webview) {
      return;
    }

    if (typeof fileUri !== 'string') {
      fileUri = Preview.webview.webview.asWebviewUri(fileUri).toString();
    }

    // Ensure fileUri is a Uri object
    if (Preview.isOpen && Preview.webview?.webview) {
      const payload = {
        fileUriString: fileUri,
        slideIndex: reset ? 0 : Preview.currentSlideIndex,
      };
      Preview.postMessage(WebViewMessages.toWebview.triggerUpdate, payload);
    }
  }

  protected static onDispose(): void {
    Preview.isDisposed = true;
    Preview.hasClickListener = false;
    Preview.hasPreviousSlide = false;
    Preview.hasNextSlide = false;
  }

  protected static async messageListener(message: any) {
    const { command, requestId, payload } = message;

    if (!command || !Preview.webview?.webview) {
      return;
    }

    if (command === WebViewMessages.toVscode.getSetting && requestId) {
      const setting = Extension.getInstance().getSetting(payload);
      Preview.postRequestMessage(command, requestId, setting);
    } else if (command === WebViewMessages.toVscode.getFileUri && requestId) {
      const fileWebviewPath = getWebviewWorkspaceUrl(Preview.webview?.webview, Preview.crntFile);
      Preview.postRequestMessage(WebViewMessages.toVscode.getFileUri, requestId, fileWebviewPath);
    } else if (command === WebViewMessages.toVscode.parseFileUri && requestId && payload) {
      const fileWebviewPath = getWebviewWorkspaceUrl(Preview.webview?.webview, payload);
      Preview.postRequestMessage(WebViewMessages.toVscode.getFileUri, requestId, fileWebviewPath);
    } else if (command === WebViewMessages.toVscode.getStyles && requestId) {
      const cssWebviewPath = Preview.crntCss
        ? getWebviewWorkspaceUrl(Preview.webview?.webview, Preview.crntCss)
        : undefined;
      Preview.postRequestMessage(WebViewMessages.toVscode.getStyles, requestId, cssWebviewPath);
    } else if (command === WebViewMessages.toVscode.getTheme && requestId) {
      try {
        const themeName = payload || '';
        const theme = await getTheme(themeName);
        Preview.postRequestMessage(WebViewMessages.toVscode.getTheme, requestId, theme);
      } catch (e) {
        // This can happen in a Dev Container where the theme is not available
        Preview.postRequestMessage(WebViewMessages.toVscode.getTheme, requestId, null);
      }
    } else if (command === WebViewMessages.toVscode.updateTitle && payload) {
      Preview.webview.title = `${Config.title}: ${payload}`;
    } else if (command === WebViewMessages.toVscode.getPreviousEnabled && requestId) {
      const previousEnabled =
        Extension.getInstance().getSetting<boolean>(Config.presentationMode.previousEnabled) ||
        false;
      Preview.postRequestMessage(
        WebViewMessages.toVscode.getPreviousEnabled,
        requestId,
        previousEnabled,
      );
    } else if (command === WebViewMessages.toVscode.runCommand && payload) {
      await commands.executeCommand(payload);
    } else if (command === WebViewMessages.toVscode.getPresentationStarted) {
      const isPresentationMode = DemoRunner.getIsPresentationMode();
      Preview.postRequestMessage(command, requestId, isPresentationMode);
    } else if (command === WebViewMessages.toVscode.getFileContents && payload) {
      try {
        const fileContents = await readFile(getAbsolutePath(payload));
        Preview.postRequestMessage(command, requestId, fileContents);
      } catch (e) {
        Preview.postRequestMessage(command, requestId, null);
      }
    } else if (command === WebViewMessages.toVscode.setHasClickListener) {
      Preview.hasClickListener = payload.listening ?? false;
    } else if (command === WebViewMessages.toVscode.hasNextSlide) {
      Preview.hasNextSlide = payload;
    } else if (command === WebViewMessages.toVscode.hasPreviousSlide) {
      Preview.hasPreviousSlide = payload;
      setContext(ContextKeys.hasPreviousSlide, payload);
    } else if (command === WebViewMessages.toVscode.openFile && payload) {
      const fileUri = getAbsolutePath(payload);
      await window.showTextDocument(fileUri, { preview: false });
    } else if (command === WebViewMessages.toVscode.updateSlideIndex) {
      Preview.currentSlideIndex = payload;
    } else if (command === WebViewMessages.toVscode.slideReady) {
      Preview.reveal();
    }
  }
}
