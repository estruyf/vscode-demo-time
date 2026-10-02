import { Uri, window, commands, workspace } from 'vscode';
import { Extension } from '../services/Extension';
import { ContextKeys } from '../constants';
import {
  getAbsolutePath,
  getTheme,
  getWebviewWorkspaceUrl,
  parseWinPath,
  setContext,
  togglePresentationView,
} from '../utils';
import {
  AnalyticsService,
  DemoRunner,
  DemoStatusBar,
  NotesService,
  SlideOverflowService,
  SlidePreviewSync,
  Slides,
} from '../services';
import {
  COMMAND,
  WebViewMessages,
  Config,
  Action,
  SlideNotes,
  getReducedMotionPreference,
  ReducedMotionPreference,
} from '@demotime/common';
import { BaseWebview } from '../webview/BaseWebviewPanel';
import { WebviewType } from '../models';
import { PresenterView } from '../presenterView/PresenterView';

export class Preview extends BaseWebview {
  public static id: WebviewType = 'preview';

  private static hasClickListener = false;
  private static hasPreviousClickStep = false;
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
    subscriptions.push(
      workspace.onDidChangeConfiguration((e) => {
        if (
          Preview.isOpen &&
          (e.affectsConfiguration(`${Config.root}.${Config.slides.reducedMotion}`) ||
            e.affectsConfiguration('workbench.reduceMotion'))
        ) {
          Preview.postMessage(
            WebViewMessages.toWebview.preview.updateReducedMotion,
            Preview.getReducedMotion(),
          );
        }
      }),
    );
  }

  /**
   * The reduced motion preference of the slides, from the Demo Time and VS Code settings.
   */
  public static getReducedMotion(): ReducedMotionPreference {
    return getReducedMotionPreference(
      Extension.getInstance().getSetting<string>(Config.slides.reducedMotion),
      workspace.getConfiguration('workbench').get<string>('reduceMotion'),
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

  public static updateAutoProceedState(payload: { managedByExtension: boolean }): void {
    if (!Preview.isOpen) {
      return;
    }

    Preview.postMessage(WebViewMessages.toWebview.updateAutoProceedState, payload);
  }

  public static isCurrentFile(fileUri: string): boolean {
    if (!Preview.crntFile) {
      return false;
    }
    return Preview.crntFile === fileUri;
  }

  /**
   * Checks if the preview shows the given file. The preview path can be relative to the workspace,
   * with or without a leading `/` or `./`.
   */
  public static isShowingFile(fileUri: Uri): boolean {
    if (!Preview.crntFile || Preview.crntFile.startsWith('http')) {
      return false;
    }
    return getAbsolutePath(parseWinPath(Preview.crntFile)).fsPath === fileUri.fsPath;
  }

  /**
   * Shows another slide of the current file, without loading the file again.
   * @param slideIndex The 0-based slide index
   */
  public static goToSlide(slideIndex: number) {
    if (!Preview.isOpen) {
      return;
    }

    Preview.currentSlideIndex = slideIndex;
    Preview.postMessage(WebViewMessages.toWebview.preview.goToSlide, slideIndex);
  }

  public static isListening(): boolean {
    if (!Preview.isOpen) {
      return false;
    }

    return Preview.hasClickListener;
  }

  public static checkIfHasPreviousClickStep(): boolean {
    if (!Preview.isOpen) {
      return false;
    }

    return Preview.hasPreviousClickStep;
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

    if (slide !== undefined && typeof slide === 'number') {
      Preview.currentSlideIndex = slide > 0 ? slide - 1 : 0;
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

  public static async showQr({
    url,
    topText,
    title,
    description,
    logo,
    qrLayout,
  }: {
    url: string;
    topText?: string;
    title?: string;
    description?: string;
    logo?: string;
    qrLayout?: 'default' | 'reversed' | 'minimal' | 'stacked' | 'text-left' | 'text-right';
  }) {
    // Ensure the preview is open (without showing a specific file)
    if (!Preview.isOpen) {
      const separator = url.includes('?') ? '&' : '?';
      await Preview.show(
        `${url}${separator}qrTopText=${encodeURIComponent(topText || '')}&qrTitle=${encodeURIComponent(title || '')}&qrDescription=${encodeURIComponent(description || '')}&qrLogo=${encodeURIComponent(logo || '')}&qrLayout=${encodeURIComponent(qrLayout || 'default')}`,
      );
    } else {
      Preview.postMessage(WebViewMessages.toWebview.showQR, {
        url: url,
        topText: topText,
        title: title,
        description: description,
        logo: logo,
        qrLayout: qrLayout,
      });
      Preview.reveal();
    }
    return;
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
    Preview.hasPreviousClickStep = false;
    Preview.hasPreviousSlide = false;
    Preview.hasNextSlide = false;
    Preview.updateSlideNotes(undefined);
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
    } else if (
      command === WebViewMessages.toVscode.preview.getSlidePlaceholders &&
      requestId &&
      payload
    ) {
      // payload: { filePath, localSlideIdx }
      const { filePath, localSlideIdx } = payload;
      const placeholders = await Slides.getSlidePlaceholders(
        filePath,
        localSlideIdx,
        DemoRunner.currentDemo,
      );
      Preview.postRequestMessage(command, requestId, placeholders);
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
    } else if (command === WebViewMessages.toVscode.preview.getReducedMotion && requestId) {
      Preview.postRequestMessage(command, requestId, Preview.getReducedMotion());
    } else if (command === WebViewMessages.toVscode.getPresentationStarted) {
      const isPresentationMode = DemoRunner.getIsPresentationMode();
      Preview.postRequestMessage(command, requestId, isPresentationMode);
    } else if (command === WebViewMessages.toVscode.setHasClickListener) {
      Preview.hasClickListener = payload?.listening ?? false;
      Preview.hasPreviousClickStep = payload?.hasPrevious ?? false;
      Preview.updateHasPreviousContext();
    } else if (command === WebViewMessages.toVscode.hasNextSlide) {
      Preview.hasNextSlide = payload;
    } else if (command === WebViewMessages.toVscode.hasPreviousSlide) {
      Preview.hasPreviousSlide = payload;
      Preview.updateHasPreviousContext();
    } else if (command === WebViewMessages.toVscode.nextSlideTitle) {
      Preview.nextSlideTitle = payload;
      Preview.sendSlideData(payload);
    } else if (command === WebViewMessages.toVscode.openFile && payload) {
      const fileUri = getAbsolutePath(payload);
      await window.showTextDocument(fileUri, { preview: false });
    } else if (command === WebViewMessages.toVscode.updateSlideIndex) {
      Preview.currentSlideIndex = payload;
      await DemoRunner.onSlideIndexUpdated(payload);
    } else if (command === WebViewMessages.toVscode.slideReady) {
      Preview.reveal(true);
    } else if (command === WebViewMessages.toVscode.preview.setSlideHidden && payload?.path) {
      await Slides.setSlideHidden(payload.path, payload.slideIndex, !!payload.hidden);
    } else if (command === WebViewMessages.toVscode.preview.setSlideNotes && payload?.path) {
      await Slides.setSlideNotes(payload.path, payload.slideIndex, payload.notes || '');
    } else if (command === WebViewMessages.toVscode.preview.revealSource && payload?.path) {
      await SlidePreviewSync.revealSource(payload.path, payload.slideIndex ?? 0);
    } else if (command === WebViewMessages.toVscode.preview.slideOverflow && payload?.path) {
      await SlideOverflowService.update(
        payload.path,
        Array.isArray(payload.overflows) ? payload.overflows : [],
      );
    } else if (command === WebViewMessages.toVscode.preview.updateSlideNotes) {
      Preview.updateSlideNotes(payload);
    } else if (command === WebViewMessages.toVscode.preview.runById) {
      // Only runs scenes by id (dt-action), so slides can't execute arbitrary commands
      const id = typeof payload === 'string' ? payload.trim() : '';
      if (id) {
        await commands.executeCommand(COMMAND.runById, id);
      }
    } else if (command === WebViewMessages.toVscode.preview.recordOpenSlide) {
      // Record slide change in analytics if recording
      if (
        AnalyticsService.isRecording() &&
        payload !== undefined &&
        payload.filePath &&
        typeof payload.slideIndex === 'number'
      ) {
        AnalyticsService.recordSlideOpen(payload.filePath, payload.slideIndex, payload.slideTitle);
      }
    }
  }

  /**
   * The previous keybinding also needs to work when the slide has a click step to go back to.
   */
  private static updateHasPreviousContext() {
    setContext(
      ContextKeys.hasPreviousSlide,
      Preview.hasPreviousSlide || Preview.hasPreviousClickStep,
    );
  }

  /**
   * Stores the notes of the current slide, and shows them in the presenter view.
   */
  private static updateSlideNotes(slideNotes: SlideNotes | undefined) {
    NotesService.setSlideNotes(slideNotes);
    PresenterView.postMessage(
      WebViewMessages.toWebview.presenter.slideNotes,
      NotesService.getSlideNotes(),
    );
  }

  private static async sendSlideData(nextSlideTitle?: string) {
    if (!PresenterView.isOpen) {
      return;
    }

    let hasNextSlide = Preview.checkIfHasNextSlide();
    const demo = hasNextSlide ? DemoRunner.currentDemo : DemoStatusBar.getNextDemo();

    if (!hasNextSlide) {
      const slideStep = demo?.steps.find((step) => step.action === Action.OpenSlide && step.path);
      if (slideStep) {
        hasNextSlide = true;
      }
    }

    nextSlideTitle = hasNextSlide ? Preview.getNextSlideTitle() : 'undefined';
    console.log('Preview sending slide data to PresenterView', { hasNextSlide, nextSlideTitle });
    if (hasNextSlide) {
      PresenterView.postMessage(
        WebViewMessages.toWebview.presenter.nextSlide,
        nextSlideTitle || '',
      );
    } else {
      PresenterView.postMessage(WebViewMessages.toWebview.presenter.nextSlide, undefined);
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
