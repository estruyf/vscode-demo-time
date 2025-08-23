import { Uri, Webview, WebviewPanel, window, ViewColumn, commands } from 'vscode';
import { Extension } from '../services/Extension';
import { ContextKeys } from '../constants';
import { MessageHandlerData } from '@estruyf/vscode';
import {
  getAbsolutePath,
  getTheme,
  getWebviewUrl,
  readFile,
  setContext,
  togglePresentationView,
} from '../utils';
import { DemoRunner } from '../services';
import { COMMAND, WebViewMessages, Config } from '@demotime/common';

export class Preview {
  private static webview: WebviewPanel | null = null;
  private static isDisposed = true;
  private static hasClickListener = false;
  private static hasPreviousSlide = false;
  private static hasNextSlide = false;
  private static crntFile: string | null = null;
  private static crntCss: string | null = null;
  private static currentSlideIndex: number = 0;

  public static getCurrentSlideIndex(): number {
    return Preview.currentSlideIndex;
  }

  public static setCurrentSlideIndex(index: number): void {
    Preview.currentSlideIndex = Math.max(index, -1);
  }

  public static register() {
    const subscriptions = Extension.getInstance().subscriptions;

    subscriptions.push(
      commands.registerCommand(COMMAND.togglePresentationView, togglePresentationView),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.closePresentationView, () => togglePresentationView(false)),
    );
  }

  public static get isOpen(): boolean {
    return !Preview.isDisposed;
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
        const fileWebviewPath = getWebviewUrl(Preview.webview?.webview, fileUri);
        Preview.triggerUpdate(fileWebviewPath);

        if (css) {
          const cssWebviewPath = getWebviewUrl(Preview.webview?.webview, css);
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
        const fileWebviewPath = getWebviewUrl(Preview.webview.webview, fileUri);
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

  public static reveal() {
    if (Preview.webview) {
      Preview.webview.reveal();
    }
  }

  public static close() {
    Preview.webview?.dispose();
  }

  public static async create() {
    const extensionUri = Extension.getInstance().extensionPath;

    // Create the preview webview
    Preview.webview = window.createWebviewPanel('demoTime:preview', Config.title, ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      enableCommandUris: true,
    });

    Preview.isDisposed = false;

    Preview.webview.iconPath = {
      dark: Uri.joinPath(Uri.file(extensionUri), 'assets', 'logo', 'demotime-bg.svg'),
      light: Uri.joinPath(Uri.file(extensionUri), 'assets', 'logo', 'demotime-bg.svg'),
    };

    Preview.webview.webview.html = await Preview.getWebviewContent();

    Preview.webview.onDidDispose(async () => {
      Preview.isDisposed = true;
      Preview.hasClickListener = false;
      Preview.hasPreviousSlide = false;
      Preview.hasNextSlide = false;
    });

    Preview.webview.webview.onDidReceiveMessage(Preview.messageListener);
  }

  private static async messageListener(message: any) {
    const { command, requestId, payload } = message;

    if (!command || !Preview.webview?.webview) {
      return;
    }

    if (command === WebViewMessages.toVscode.getSetting && requestId) {
      const setting = Extension.getInstance().getSetting(payload);
      Preview.postRequestMessage(command, requestId, setting);
    } else if (command === WebViewMessages.toVscode.getFileUri && requestId) {
      const fileWebviewPath = getWebviewUrl(Preview.webview?.webview, Preview.crntFile);
      Preview.postRequestMessage(WebViewMessages.toVscode.getFileUri, requestId, fileWebviewPath);
    } else if (command === WebViewMessages.toVscode.parseFileUri && requestId && payload) {
      const fileWebviewPath = getWebviewUrl(Preview.webview?.webview, payload);
      Preview.postRequestMessage(WebViewMessages.toVscode.getFileUri, requestId, fileWebviewPath);
    } else if (command === WebViewMessages.toVscode.getStyles && requestId) {
      const cssWebviewPath = Preview.crntCss
        ? getWebviewUrl(Preview.webview?.webview, Preview.crntCss)
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

  public static async postMessage(command: string, payload?: any) {
    if (Preview.isDisposed) {
      return;
    }

    Preview.webview?.webview.postMessage({
      command,
      payload,
    } as MessageHandlerData<any>);
  }

  private static async postRequestMessage(command: string, requestId: string, payload: any) {
    Preview.webview?.webview.postMessage({
      command,
      requestId,
      payload,
    } as MessageHandlerData<any>);
  }

  // private static async getWebviewContent(webview: Webview) {
  //   const jsFile = 'main.bundle.js';
  //   const localServerUrl = 'http://localhost:9001';

  //   let scriptUrl = [];
  //   let moduleUrl = [];
  //   let styleUrl = [];

  //   const extension = Extension.getInstance();
  //   const extPath = Uri.file(extension.extensionPath);

  //   if (extension.isProductionMode) {
  //     // Get the manifest file from the dist folder
  //     const manifestPath = Uri.joinPath(extPath, 'out', 'preview', 'manifest.json');
  //     const manifest = await readFile(manifestPath);
  //     const manifestJson = JSON.parse(manifest);

  //     for (const [key, value] of Object.entries<string>(manifestJson)) {
  //       if (key.endsWith('.js')) {
  //         scriptUrl.push(
  //           webview.asWebviewUri(Uri.joinPath(extPath, 'out', 'preview', value)).toString(),
  //         );
  //       }
  //     }
  //   } else {
  //     scriptUrl.push(`${localServerUrl}/${jsFile}`);
  //   }

  //   scriptUrl.push(
  //     webview.asWebviewUri(Uri.joinPath(extPath, 'assets', 'slides', 'tailwind.js')).toString(),
  //   );
  //   const workspaceFolder = extension.workspaceFolder;

  //   const webComponents = extension.getSetting<string[]>(Config.webcomponents.scripts);
  //   if (webComponents) {
  //     for (const webComponent of webComponents) {
  //       if (webComponent.startsWith('http')) {
  //         moduleUrl.push(webComponent);
  //       } else if (workspaceFolder) {
  //         moduleUrl.push(
  //           webview.asWebviewUri(Uri.joinPath(workspaceFolder.uri, webComponent)).toString(),
  //         );
  //       }
  //     }
  //   }

  //   const customTheme = extension.getSetting<string>(Config.slides.customTheme);
  //   if (customTheme) {
  //     if (customTheme.startsWith('http')) {
  //       styleUrl.push(customTheme);
  //     } else if (workspaceFolder) {
  //       styleUrl.push(
  //         webview.asWebviewUri(Uri.joinPath(workspaceFolder.uri, customTheme)).toString(),
  //       );
  //     }
  //   }

  //   const webviewUrl = getWebviewUrl(webview, '');

  //   return `<!DOCTYPE html>
  //   <html lang="en">
  //   <head>
  //     <meta charset="UTF-8">
  //     <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //   </head>
  //   <body>
  //     <div id="root" data-webview-url="${webviewUrl}"></div>

  //     ${scriptUrl.map((url) => `<script src="${url}"></script>`).join('\n')}
  //     ${moduleUrl.map((url) => `<script src="${url}" type="module"></script>`).join('\n')}

  //     ${styleUrl.map((url) => `<link rel="stylesheet" href="${url}">`).join('\n')}

  //     <img style="display:none" src="https://api.visitorbadge.io/api/combined?path=https:%2f%2fgithub.com%2festruyf%2fvscode-demo-time&labelColor=%23202736&countColor=%23FFD23F&slug=preview" alt="Preview usage" />
  //   </body>
  //   </html>`;
  // }

  private static async getWebviewContent() {
    const extensions = Extension.getInstance();
    if (!extensions.isProductionMode) {
      return `
        <!doctype html>
        <html lang="en">
          <head>
            <script type="module">
              import RefreshRuntime from "http://localhost:5173/@react-refresh"
              RefreshRuntime.injectIntoGlobalHook(window)
              window.$RefreshReg$ = () => {}
              window.$RefreshSig$ = () => (type) => type
              window.__vite_plugin_react_preamble_installed__ = true
            </script>

            <script type="module" src="http://localhost:5173/@vite/client"></script>

            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Demo Time Config Editor</title>
          </head>
          <body>
            <div id="root" data-view-type="preview"></div>
            <script type="module" src="http://localhost:5173/src/main.tsx"></script>
          </body>
        </html>`;
    }

    const URL = `https://config-beta.demotime.show`;
    try {
      const response = await fetch(URL, {
        headers: {
          'Content-Type': 'text/html',
        },
        cache: 'no-cache',
      });

      if (!response.ok) {
        console.error(
          `Failed to fetch settings webview: HTTP ${response.status} ${response.statusText}`,
        );
        return `<html><body><h2>Unable to load settings view (HTTP ${response.status}). Please check your network connection or try again later.</h2></body></html>`;
      }

      const html = await response.text();
      // Patch relative asset URLs to absolute URLs using the base URL
      const baseUrl = URL.replace(/\/$/, '');
      const patchedHtml = html
        .replace(/(src|href)=["'](\/assets\/[^"']+)["']/g, (match, attr, path) => {
          return `${attr}="${baseUrl}${path}"`;
        })
        .replace(/href=["']\/vite\.svg["']/g, `href="${baseUrl}/vite.svg"`)
        .replace(`id="root"`, `id="root" data-view-type="preview"`);

      return patchedHtml.toString();
    } catch (error) {
      console.error('Error fetching settings webview:', error);
      return `<html><body><h2>Unable to load settings view. Please check your network connection or try again later.</h2></body></html>`;
    }
  }
}
