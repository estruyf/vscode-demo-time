import { commands, Uri, Webview, WebviewPanel, workspace, window, ViewColumn } from "vscode";
import { Subscription } from "../models";
import { Extension } from "../services/Extension";
import { COMMAND, Config, EXTENSION_NAME, WebViewMessages } from "../constants";
import { MessageHandlerData } from "@estruyf/vscode";
import { FileProvider } from "../services/FileProvider";
import { DemoRunner } from "../services/DemoRunner";
import { DemoStatusBar } from "../services/DemoStatusBar";
import { NotesService } from "../services/NotesService";
import { readFile } from "../utils";

export class PresenterView {
  private static webview: WebviewPanel | null = null;
  private static isDisposed = true;
  private static isDetached = false;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.showPresenterView, PresenterView.show));
  }

  public static get isOpen(): boolean {
    return !PresenterView.isDisposed;
  }

  public static show() {
    if (PresenterView.isOpen) {
      PresenterView.reveal();
    } else {
      PresenterView.create();
    }
  }

  public static reveal(hasData = false) {
    if (PresenterView.webview) {
      PresenterView.webview.reveal();
    }
  }

  public static close() {
    PresenterView.webview?.dispose();
  }

  public static async create() {
    const extensionUri = Extension.getInstance().extensionPath;

    // Create the preview webview
    PresenterView.webview = window.createWebviewPanel(
      "demoTime:presenterView",
      `${Config.title}: Presenter View`,
      ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        enableCommandUris: true,
      }
    );

    PresenterView.isDisposed = false;
    PresenterView.isDetached = false;

    PresenterView.webview.iconPath = {
      dark: Uri.joinPath(Uri.file(extensionUri), "assets", "logo", "demotime-bg.svg"),
      light: Uri.joinPath(Uri.file(extensionUri), "assets", "logo", "demotime-bg.svg"),
    };

    PresenterView.webview.webview.html = await PresenterView.getWebviewContent(PresenterView.webview.webview);

    PresenterView.webview.onDidDispose(async () => {
      PresenterView.isDisposed = true;
      PresenterView.isDetached = false;
    });

    PresenterView.webview.webview.onDidReceiveMessage(PresenterView.messageListener);
  }

  private static async messageListener(message: any) {
    const { command, requestId, payload } = message;

    if (!command) {
      return;
    }

    if (command === WebViewMessages.toVscode.getSetting && requestId) {
      const setting = Extension.getInstance().getSetting(payload);
      PresenterView.postRequestMessage(command, requestId, setting);
    } else if (command === WebViewMessages.toVscode.getDemoFiles) {
      const demoFiles = await FileProvider.getFiles();
      PresenterView.postRequestMessage(command, requestId, demoFiles);
    } else if (command === WebViewMessages.toVscode.getRunningDemos) {
      const executingFile = await DemoRunner.getExecutedDemoFile();
      PresenterView.postRequestMessage(command, requestId, executingFile);
    } else if (command === WebViewMessages.toVscode.getNextDemo) {
      const nextDemo = DemoStatusBar.getNextDemo();
      PresenterView.postRequestMessage(command, requestId, nextDemo);
    } else if (command === WebViewMessages.toVscode.runCommand && payload) {
      const { command: cmd, args } = payload;
      if (!cmd) {
        return;
      }

      if ((cmd as string).startsWith(EXTENSION_NAME)) {
        await commands.executeCommand(`workbench.action.focusActivityBar`);
      }

      if (args) {
        commands.executeCommand(cmd, args);
      } else {
        commands.executeCommand(cmd);
      }
    } else if (command === WebViewMessages.toVscode.getCountdownStarted) {
      const startTime = DemoStatusBar.getCountdownStarted();
      PresenterView.postRequestMessage(command, requestId, startTime);
    } else if (command === WebViewMessages.toVscode.getPresentationStarted) {
      const isPresentationMode = DemoRunner.getIsPresentationMode;
      PresenterView.postRequestMessage(command, requestId, isPresentationMode);
    } else if (command === WebViewMessages.toVscode.detach) {
      const panel = PresenterView.webview;
      if (panel?.viewColumn === ViewColumn.One && !PresenterView.isDetached) {
        PresenterView.isDetached = true;
        commands.executeCommand("workbench.action.moveEditorToNewWindow");
      }
    } else if (command === WebViewMessages.toVscode.openNotes && payload) {
      const { path } = payload;
      if (path) {
        NotesService.openNotes(path);
      }
    }
  }

  public static async postMessage(command: string, payload: any) {
    PresenterView.webview?.webview.postMessage({
      command,
      payload,
    } as MessageHandlerData<any>);
  }

  private static async postRequestMessage(command: string, requestId: string, payload: any) {
    PresenterView.webview?.webview.postMessage({
      command,
      requestId,
      payload,
    } as MessageHandlerData<any>);
  }

  private static async getWebviewContent(webview: Webview) {
    const jsFile = "main.bundle.js";
    const localServerUrl = "http://localhost:9000";

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

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${extension.isProductionMode ? `<link href="${cssUrl}" rel="stylesheet">` : ""}
    </head>
    <body>
      <div id="root"></div>
  
      ${scriptUrl.map((url) => `<script src="${url}"></script>`).join("\n")}

      <img style="display:none" src="https://api.visitorbadge.io/api/combined?path=https:%2f%2fgithub.com%2festruyf%2fvscode-demo-time&labelColor=%23202736&countColor=%23FFD23F&slug=presenter-view" alt="Presenter view usage" />
    </body>
    </html>`;
  }
}
