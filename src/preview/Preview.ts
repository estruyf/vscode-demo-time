import { Uri, Webview, WebviewPanel, window, ViewColumn } from "vscode";
import { Extension } from "../services/Extension";
import { WebViewMessages } from "../constants";
import { MessageHandlerData } from "@estruyf/vscode";
import { getTheme, getWebviewUrl, readFile } from "../utils";

export class Preview {
  private static webview: WebviewPanel | null = null;
  private static isDisposed = true;
  private static crntFile: string | null = null;
  private static crntCss: string | null = null;

  public static register() {}

  public static get isOpen(): boolean {
    return !Preview.isDisposed;
  }

  public static show(fileUri: string, css?: string) {
    Preview.crntFile = fileUri || null;
    Preview.crntCss = css || null;

    if (Preview.isOpen) {
      Preview.reveal();

      Preview.postMessage(WebViewMessages.toWebview.updateStyles, css);

      if (Preview.webview?.webview) {
        const fileWebviewPath = getWebviewUrl(Preview.webview?.webview, fileUri);
        Preview.postMessage(WebViewMessages.toWebview.updateFileUri, fileWebviewPath);
      }
    } else {
      Preview.create();
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
    Preview.webview = window.createWebviewPanel("demoTime:preview", `Demo Time: Preview`, ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      enableCommandUris: true,
    });

    Preview.isDisposed = false;

    Preview.webview.iconPath = {
      dark: Uri.joinPath(Uri.file(extensionUri), "assets", "logo", "demotime-bg.svg"),
      light: Uri.joinPath(Uri.file(extensionUri), "assets", "logo", "demotime-bg.svg"),
    };

    Preview.webview.webview.html = await Preview.getWebviewContent(Preview.webview.webview);

    Preview.webview.onDidDispose(async () => {
      Preview.isDisposed = true;
    });

    Preview.webview.webview.onDidReceiveMessage(Preview.messageListener);
  }

  private static async messageListener(message: any) {
    const { command, requestId, payload } = message;

    if (!command || !Preview.webview?.webview) {
      return;
    }

    if (command === WebViewMessages.toVscode.getFileUri && requestId) {
      const fileWebviewPath = getWebviewUrl(Preview.webview?.webview, Preview.crntFile);
      Preview.postRequestMessage(WebViewMessages.toVscode.getFileUri, requestId, fileWebviewPath);
      return;
    } else if (command === WebViewMessages.toVscode.getStyles && requestId) {
      Preview.postRequestMessage(WebViewMessages.toVscode.getFileUri, requestId, Preview.crntCss);
      return;
    } else if (command === WebViewMessages.toVscode.getTheme && requestId) {
      const theme = await getTheme();
      Preview.postRequestMessage(WebViewMessages.toVscode.getTheme, requestId, theme);
      return;
    }
  }

  public static async postMessage(command: string, payload: any) {
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

  private static async getWebviewContent(webview: Webview) {
    const jsFile = "preview.bundle.js";
    const localServerUrl = "http://localhost:9001";

    let scriptUrl = [];
    let cssUrl = null;

    const extension = Extension.getInstance();
    if (extension.isProductionMode) {
      // Get the manifest file from the dist folder
      const extPath = Uri.file(extension.extensionPath);
      const manifestPath = Uri.joinPath(extPath, "out", "webview", "manifest.json");
      const manifest = await readFile(manifestPath);
      const manifestJson = JSON.parse(manifest);

      for (const [key, value] of Object.entries<string>(manifestJson)) {
        if (key.endsWith(".js")) {
          scriptUrl.push(webview.asWebviewUri(Uri.joinPath(extPath, "out", "webview", value)).toString());
        }
      }
    } else {
      scriptUrl.push(`${localServerUrl}/${jsFile}`);
    }

    const webviewUrl = getWebviewUrl(webview, "");

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${extension.isProductionMode ? `<link href="${cssUrl}" rel="stylesheet">` : ""}
    </head>
    <body>
      <div id="root" data-webview-url="${webviewUrl}"></div>
  
      ${scriptUrl.map((url) => `<script src="${url}"></script>`).join("\n")}

      <img style="display:none" src="https://api.visitorbadge.io/api/combined?path=https:%2f%2fgithub.com%2festruyf%2fvscode-demo-time&labelColor=%23202736&countColor=%23FFD23F&slug=preview" alt="Preview usage" />
    </body>
    </html>`;
  }
}
