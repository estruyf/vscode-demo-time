import { Uri, window, commands } from 'vscode';
import { Extension } from '../services/Extension';
import { ContextKeys } from '../constants';
import {
  getAbsolutePath,
  getTheme,
  getWebviewWorkspaceUrl,
  setContext,
  togglePresentationView,
} from '../utils';
import { DemoRunner, Slides } from '../services';
import { COMMAND, WebViewMessages, Config } from '@demotime/common';
import { BaseWebview } from '../webview/BaseWebviewPanel';
import { WebviewType } from '../models';

export class Preview extends BaseWebview {
  public static id: WebviewType = 'preview';

  private static hasClickListener = false;
  private static hasPreviousSlide = false;
  private static hasNextSlide = false;
  private static nextSlideTitle: string | undefined = undefined;
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

  public static getNextSlideTitle(): string | undefined {
    return Preview.nextSlideTitle;
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

  public static async show(fileUri: string, css?: string, slide?: number) {
    if (Preview.crntFile !== fileUri) {
      Preview.currentSlideIndex = 0;
    }

    if (slide && typeof slide === 'number') {
      Preview.currentSlideIndex = slide;
    }

    Preview.crntFile = fileUri ?? null;
    Preview.crntCss = css ?? null;

    if (Preview.isOpen) {
      // Use the fileUri argument for triggerUpdate, as it's the most current.
      if (Preview.webview?.webview && fileUri) {
        const fileWebviewPath = getWebviewWorkspaceUrl(Preview.webview?.webview, fileUri);
        Preview.triggerUpdate(fileWebviewPath, slide);

        if (css) {
          const cssWebviewPath = getWebviewWorkspaceUrl(Preview.webview?.webview, css);
          Preview.postMessage(WebViewMessages.toWebview.updateStyles, cssWebviewPath);
        } else {
          Preview.postMessage(WebViewMessages.toWebview.updateStyles, undefined);
        }

        Preview.reveal();
      }
    } else {
      await Preview.create();
      // After creating, if fileUri is available, trigger update
      if (fileUri && Preview.webview?.webview) {
        // Use fileUri from argument
        const fileWebviewPath = getWebviewWorkspaceUrl(Preview.webview.webview, fileUri);
        Preview.triggerUpdate(fileWebviewPath, slide); // Convert string to Uri
      }
    }
  }

  public static triggerUpdate(fileUri?: Uri | string, slide?: number, reset: boolean = false) {
    if (!fileUri || !Preview.webview?.webview) {
      return;
    }

    if (typeof fileUri !== 'string') {
      fileUri = Preview.webview.webview.asWebviewUri(fileUri).toString();
    }

    // Ensure fileUri is a Uri object
    if (Preview.isOpen && Preview.webview?.webview) {
      slide = slide !== undefined && slide > 0 ? slide - 1 : slide;
      const slideNr = slide !== undefined ? slide : reset ? 0 : Preview.currentSlideIndex;
      const payload = {
        fileUriString: fileUri,
        slideIndex: slideNr,
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
    super.messageListener(message);

    const { command, requestId, payload } = message;

    if (!command || !Preview.webview?.webview) {
      return;
    }

    if (command === WebViewMessages.toVscode.getSetting && requestId) {
      const setting = Extension.getInstance().getSetting(payload);
      Preview.postRequestMessage(command, requestId, setting);
    } else if (command === WebViewMessages.toVscode.preview.getTotalSlides && requestId) {
      const totalSlides = await Slides.getTotalSlides();
      Preview.postRequestMessage(command, requestId, totalSlides);
    } else if (
      command === WebViewMessages.toVscode.preview.getGlobalSlideIndex &&
      requestId &&
      payload
    ) {
      // payload: { filePath, localSlideIdx }
      const { filePath, localSlideIdx } = payload;
      const globalIdx = await Slides.getGlobalSlideIndex(filePath, localSlideIdx);
      Preview.postRequestMessage(command, requestId, globalIdx);
    } else if (command === WebViewMessages.toVscode.preview.getSlide && requestId) {
      const currentFile = Preview.crntFile;
      const path =
        currentFile && Preview.webview?.webview
          ? getWebviewWorkspaceUrl(Preview.webview.webview, currentFile)
          : null;
      Preview.postRequestMessage(command, requestId, {
        path,
        slideIndex: Preview.currentSlideIndex,
      });
    } else if (command === WebViewMessages.toVscode.parseFileUri && requestId && payload) {
      const fileWebviewPath = getWebviewWorkspaceUrl(Preview.webview?.webview, payload);
      Preview.postRequestMessage(command, requestId, fileWebviewPath);
    } else if (command === WebViewMessages.toVscode.getStyles && requestId) {
      const cssWebviewPath = Preview.crntCss
        ? getWebviewWorkspaceUrl(Preview.webview?.webview, Preview.crntCss)
        : undefined;
      Preview.postRequestMessage(command, requestId, cssWebviewPath);
    } else if (command === WebViewMessages.toVscode.getTheme && requestId) {
      try {
        const themeName = payload || '';
        const theme = await getTheme(themeName);
        Preview.postRequestMessage(command, requestId, theme);
      } catch (e) {
        // This can happen in a Dev Container where the theme is not available
        Preview.postRequestMessage(command, requestId, null);
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
    } else if (command === WebViewMessages.toVscode.getPresentationStarted) {
      const isPresentationMode = DemoRunner.getIsPresentationMode();
      Preview.postRequestMessage(command, requestId, isPresentationMode);
    } else if (command === WebViewMessages.toVscode.setHasClickListener) {
      Preview.hasClickListener = payload.listening ?? false;
    } else if (command === WebViewMessages.toVscode.hasNextSlide) {
      Preview.hasNextSlide = payload;
    } else if (command === WebViewMessages.toVscode.hasPreviousSlide) {
      Preview.hasPreviousSlide = payload;
      setContext(ContextKeys.hasPreviousSlide, payload);
    } else if (command === WebViewMessages.toVscode.nextSlideTitle) {
      Preview.nextSlideTitle = payload;
    } else if (command === WebViewMessages.toVscode.openFile && payload) {
      const fileUri = getAbsolutePath(payload);
      await window.showTextDocument(fileUri, { preview: false });
    } else if (command === WebViewMessages.toVscode.updateSlideIndex) {
      Preview.currentSlideIndex = payload;
    } else if (command === WebViewMessages.toVscode.slideReady) {
      Preview.reveal();
    }
  }

  protected static getJsFiles(): (Uri | string)[] {
    const extension = Extension.getInstance();
    const extPath = Uri.file(extension.extensionPath);
    return [Uri.joinPath(extPath, 'assets', 'slides', 'tailwind.js')];
  }

  protected static getModuleFiles(): (Uri | string)[] {
    const extension = Extension.getInstance();
    const workspaceFolder = extension.workspaceFolder;

    let moduleUrl = [];
    const webComponents = extension.getSetting<string[]>(Config.webcomponents.scripts);
    if (webComponents) {
      for (const webComponent of webComponents) {
        if (webComponent.startsWith('http')) {
          moduleUrl.push(webComponent);
        } else if (workspaceFolder) {
          moduleUrl.push(Uri.joinPath(workspaceFolder.uri, webComponent));
        }
      }
    }
    return moduleUrl;
  }

  protected static getCssFiles(): (Uri | string)[] {
    const extension = Extension.getInstance();
    const workspaceFolder = extension.workspaceFolder;

    let styleUrl = [];
    const customTheme = extension.getSetting<string>(Config.slides.customTheme);
    if (customTheme) {
      if (customTheme.startsWith('http')) {
        styleUrl.push(customTheme);
      } else if (workspaceFolder) {
        styleUrl.push(Uri.joinPath(workspaceFolder.uri, customTheme));
      }
    }
    return styleUrl;
  }
}
