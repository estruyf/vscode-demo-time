import {
  ConfigurationTarget,
  Uri,
  window,
  commands,
  workspace,
  FileSystemWatcher,
  ViewColumn,
} from 'vscode';
import { Extension } from '../services/Extension';
import { ContextKeys } from '../constants';
import {
  getAbsolutePath,
  getRelPath,
  getTheme,
  getWebviewWorkspaceUrl,
  parseWinPath,
  resolveSlideCodeFiles,
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
  getSlideIndexForSource,
  ReducedMotionPreference,
  Slide,
  SlideIncludes,
  SlideParser,
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
  private static crntEmbed: { url: string; title: string } | null = null;
  private static currentSlideIndex: number = 0;
  /**
   * The files that code blocks on the slides show, to update the preview when they change
   */
  private static codeFiles = new Set<string>();
  private static codeFilesTimer: NodeJS.Timeout | undefined;
  /**
   * The files that the current slide file includes with `src`, to reload the preview when they change
   */
  private static includeFiles = new Set<string>();
  private static includeFilesTimer: NodeJS.Timeout | undefined;
  private static fileWatcher: FileSystemWatcher | undefined;
  /**
   * The slides of the current file with the file they come from, when it includes other files
   */
  private static deck: { rootPath: string; slides: Pick<Slide, 'source'>[] } | undefined;

  public static register() {
    const subscriptions = Extension.getInstance().subscriptions;

    subscriptions.push(
      commands.registerCommand(COMMAND.togglePresentationView, togglePresentationView),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.closePresentationView, () => togglePresentationView(false)),
    );
    // Runs from the context menu of the slide preview, which passes the `data-vscode-context` of the slide
    subscriptions.push(
      commands.registerCommand(
        COMMAND.showSlideContents,
        async (context?: { slidePath?: string; slideIndex?: number }) => {
          if (context?.slidePath) {
            await SlidePreviewSync.revealSource(context.slidePath, context.slideIndex ?? 0);
          }
        },
      ),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.toggleSlideThumbnails, () =>
        Preview.toggleSetting(Config.slides.previewThumbnails),
      ),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.toggleSlideNotes, () =>
        Preview.toggleSetting(Config.slides.previewNotes),
      ),
    );
    subscriptions.push(
      workspace.onDidChangeConfiguration((e) => {
        if (
          Preview.isOpen &&
          e.affectsConfiguration(`${Config.root}.${Config.slides.previewThumbnails}`)
        ) {
          Preview.postMessage(
            WebViewMessages.toWebview.preview.updateThumbnails,
            Preview.isSettingEnabled(Config.slides.previewThumbnails),
          );
        }
        if (
          Preview.isOpen &&
          e.affectsConfiguration(`${Config.root}.${Config.slides.previewNotes}`)
        ) {
          Preview.postMessage(
            WebViewMessages.toWebview.preview.updateNotesPane,
            Preview.isSettingEnabled(Config.slides.previewNotes),
          );
        }
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
   * Whether a pane of the slide preview, like the slide thumbnails, is turned on in the settings.
   * @param key The setting of the pane, which is on by default
   */
  private static isSettingEnabled(key: string): boolean {
    return Extension.getInstance().getSetting<boolean>(key) !== false;
  }

  /**
   * Turns a pane of the preview on or off, in the place where its setting is defined.
   * @param key The setting of the pane
   */
  private static async toggleSetting(key: string) {
    const inspected = workspace.getConfiguration(Config.root).inspect<boolean>(key);
    let target = ConfigurationTarget.Global;
    if (inspected?.workspaceFolderValue !== undefined) {
      target = ConfigurationTarget.WorkspaceFolder;
    } else if (inspected?.workspaceValue !== undefined) {
      target = ConfigurationTarget.Workspace;
    }
    await Extension.getInstance().setSetting(key, !Preview.isSettingEnabled(key), target);
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
   * Whether the preview shows the slides of a file: the current file, or a file it includes with
   * `src`.
   */
  public static hasSlidesOf(fileUri: Uri): boolean {
    if (Preview.isShowingFile(fileUri)) {
      return true;
    }

    const path = getRelPath(parseWinPath(fileUri.fsPath));
    return !!Preview.deck?.slides.some(({ source }) => source?.path === path);
  }

  /**
   * Gets the slide of the preview for a slide of the current file, or of a file it includes with
   * `src`.
   * @param fileUri The file of the slide
   * @param slideIndex The 0-based index of the slide in its file
   * @param last For a slide with a `src`, gets its last included slide instead of the first one
   * @returns The 0-based slide index in the preview, or `undefined` when the preview doesn't show
   * the slide
   */
  public static getPreviewSlideIndex(
    fileUri: Uri,
    slideIndex: number,
    last = false,
  ): number | undefined {
    const isCrntFile = Preview.isShowingFile(fileUri);
    if (!Preview.deck) {
      return isCrntFile ? slideIndex : undefined;
    }

    const rootPath = Preview.deck.rootPath;
    const path = isCrntFile ? rootPath : getRelPath(parseWinPath(fileUri.fsPath));
    return getSlideIndexForSource(Preview.deck.slides, rootPath, { path, index: slideIndex }, last);
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

  /**
   * @param options.beside Opens the preview next to the active editor and keeps the focus there,
   * so you see the slides while you edit them. A preview that is already open in another editor
   * group stays there.
   */
  public static async show(
    fileUri: string,
    css?: string,
    slide?: number,
    options?: { beside?: boolean },
  ) {
    if (Preview.crntFile !== fileUri) {
      Preview.currentSlideIndex = 0;
      Preview.deck = undefined;
      Preview.includeFiles.clear();
    }

    if (slide !== undefined && typeof slide === 'number') {
      Preview.currentSlideIndex = slide > 0 ? slide - 1 : 0;
    }

    Preview.crntFile = fileUri ?? null;
    Preview.crntCss = css ?? null;
    Preview.crntEmbed = null;

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

        Preview.revealForShow(options?.beside);
      }
    } else {
      await Preview.create(
        options?.beside ? { viewColumn: ViewColumn.Beside, preserveFocus: true } : undefined,
      );
      // After creating, if fileUri is available, trigger update
      if (fileUri && Preview.webview?.webview) {
        // Use fileUri from argument
        const fileWebviewPath = getWebviewWorkspaceUrl(Preview.webview.webview, fileUri);
        Preview.triggerUpdate(fileWebviewPath, slide); // Convert string to Uri
      }
    }
  }

  private static revealForShow(beside?: boolean) {
    if (!beside) {
      Preview.reveal();
      return;
    }

    // Move the preview out of the group of the active editor, so it doesn't cover the editor
    const activeColumn = window.activeTextEditor?.viewColumn;
    const isInActiveGroup = !!activeColumn && Preview.webview?.viewColumn === activeColumn;
    Preview.reveal(true, isInActiveGroup ? ViewColumn.Beside : undefined);
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
    Preview.crntEmbed = null;

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

  /**
   * Shows a web page in the preview. Unlike the integrated browser, the preview keeps the
   * keyboard focus in VS Code, so the next and previous keybindings (and clickers) keep working.
   */
  public static async showEmbed(url: string, title: string) {
    Preview.crntFile = null;
    Preview.crntEmbed = { url, title };
    Preview.deck = undefined;
    Preview.includeFiles.clear();
    // The embed has no slides or click steps, so next and previous go to the scenes
    Preview.hasClickListener = false;
    Preview.hasPreviousClickStep = false;
    Preview.hasPreviousSlide = false;
    Preview.hasNextSlide = false;
    Preview.updateHasPreviousContext();
    Preview.updateSlideNotes(undefined);

    if (Preview.isOpen) {
      Preview.postMessage(WebViewMessages.toWebview.showEmbed, Preview.crntEmbed);
      Preview.reveal();
    } else {
      // The webview requests the embed with `getSlide` once it is loaded
      await Preview.create();
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
    Preview.hasPreviousClickStep = false;
    Preview.hasPreviousSlide = false;
    Preview.hasNextSlide = false;
    Preview.updateSlideNotes(undefined);
    Preview.fileWatcher?.dispose();
    Preview.fileWatcher = undefined;
    Preview.codeFiles.clear();
    Preview.includeFiles.clear();
    Preview.deck = undefined;
    clearTimeout(Preview.codeFilesTimer);
    clearTimeout(Preview.includeFilesTimer);
  }

  /**
   * Watches the files that code blocks on the slides show, and tells the preview to load them
   * again when they change.
   */
  private static watchCodeFiles(uris: Uri[]) {
    uris.forEach((uri) => Preview.codeFiles.add(parseWinPath(uri.fsPath)));
    if (Preview.codeFiles.size > 0) {
      Preview.watchFiles();
    }
  }

  /**
   * Reads the files that the slides include with `src`. The preview reloads when they change, and
   * keeps the file and index of its slides to sync with the editor.
   */
  protected static async resolveSlideIncludes(
    payload: unknown,
  ): Promise<SlideIncludes | undefined> {
    const includes = await super.resolveSlideIncludes(payload);
    const content = (payload as { content?: unknown } | undefined)?.content;
    const isCrntFile =
      !!includes && Preview.isShowingFile(getAbsolutePath(parseWinPath(includes.filePath)));
    if (!includes || !isCrntFile || typeof content !== 'string') {
      return includes;
    }

    Preview.deck = {
      rootPath: includes.filePath,
      slides: new SlideParser({ includes }).parseSlides(content).map(({ source }) => ({ source })),
    };

    const wsFolder = Extension.getInstance().workspaceFolder;
    Preview.includeFiles = new Set(
      wsFolder
        ? Object.keys(includes.files).map((filePath) =>
            parseWinPath(Uri.joinPath(wsFolder.uri, filePath).fsPath),
          )
        : [],
    );
    if (Preview.includeFiles.size > 0) {
      Preview.watchFiles();
    }
    return includes;
  }

  /**
   * Watches the files of the code blocks and slide includes of the slides.
   */
  private static watchFiles() {
    if (Preview.fileWatcher) {
      return;
    }

    const onChange = (uri: Uri) => {
      const filePath = parseWinPath(uri.fsPath);
      if (Preview.codeFiles.has(filePath)) {
        clearTimeout(Preview.codeFilesTimer);
        Preview.codeFilesTimer = setTimeout(() => {
          Preview.postMessage(WebViewMessages.toWebview.preview.codeFilesChanged);
        }, 200);
      }

      // Loads the slides again, which reads the included files
      if (Preview.includeFiles.has(filePath)) {
        clearTimeout(Preview.includeFilesTimer);
        Preview.includeFilesTimer = setTimeout(() => {
          if (Preview.crntFile && Preview.webview?.webview) {
            Preview.triggerUpdate(
              getWebviewWorkspaceUrl(Preview.webview.webview, Preview.crntFile),
            );
          }
        }, 200);
      }
    };

    const watcher = workspace.createFileSystemWatcher('**/*');
    watcher.onDidChange(onChange);
    watcher.onDidCreate(onChange);
    watcher.onDidDelete(onChange);
    Preview.fileWatcher = watcher;
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
        embed: Preview.crntEmbed,
      });
    } else if (command === WebViewMessages.toVscode.preview.resolveCodeFiles && requestId) {
      const content = typeof payload === 'string' ? payload : '';
      const slideFile = Preview.crntFile;
      const slideUri =
        slideFile && !slideFile.startsWith('http')
          ? getAbsolutePath(parseWinPath(slideFile))
          : undefined;
      try {
        const { markdown, uris } = await resolveSlideCodeFiles(content, slideUri);
        Preview.watchCodeFiles(uris);
        Preview.postRequestMessage(command, requestId, markdown);
      } catch {
        Preview.postRequestMessage(command, requestId, content);
      }
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
      const previousEnabled = await DemoRunner.isPreviousEnabled();
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
    } else if (
      command === WebViewMessages.toVscode.preview.moveSlide &&
      payload?.path &&
      typeof payload.fromIndex === 'number' &&
      typeof payload.toIndex === 'number'
    ) {
      const moved = await Slides.moveSlide(payload.path, payload.fromIndex, payload.toIndex);
      if (requestId) {
        Preview.postRequestMessage(command, requestId, moved);
      }
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
