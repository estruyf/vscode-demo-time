import { OpenDialogOptions, Uri, workspace } from 'vscode';
import {
  CancellationToken,
  commands,
  CustomTextEditorProvider,
  ExtensionContext,
  TextDocument,
  WebviewPanel,
  window,
} from 'vscode';
import { Subscription } from '../models';
import { DemoFileProvider, DemoRunner, Extension, Logger } from '../services';
import { COMMAND, Config, WebViewMessages } from '../constants';
import { getThemes, parseWinPath } from '../utils';

export class ConfigEditorProvider implements CustomTextEditorProvider {
  private static readonly viewType = 'demoTime.configEditor';

  public static register() {
    const extensions = Extension.getInstance();
    const subscriptions: Subscription[] = extensions.subscriptions;
    const context = extensions.context;

    subscriptions.push(
      window.registerCustomEditorProvider(
        ConfigEditorProvider.viewType,
        new ConfigEditorProvider(context),
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
          supportsMultipleEditorsPerDocument: false,
        },
      ),
    );

    subscriptions.push(
      commands.registerCommand(
        COMMAND.openConfigInTextEditor,
        ConfigEditorProvider.openInTextEditor,
      ),
    );

    subscriptions.push(
      commands.registerCommand(COMMAND.openConfigEditor, ConfigEditorProvider.openInConfigEditor),
    );
  }

  constructor(private readonly context: ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: TextDocument,
    webviewPanel: WebviewPanel,
    _token: CancellationToken,
  ): Promise<void> {
    const openInConfigEditor = Extension.getInstance().getSetting<boolean>(
      Config.configEditor.openInConfigEditor,
    );

    if (!openInConfigEditor) {
      commands.executeCommand(`workbench.action.closeActiveEditor`);
      ConfigEditorProvider.openInTextEditor(document.uri);
      return;
    }

    webviewPanel.webview.options = {
      enableScripts: true,
    };

    const html = await this.getHtmlForWebview();
    webviewPanel.webview.html = html;

    function getContent(text?: string) {
      const content = text ?? document.getText();
      const contents = DemoFileProvider.parseFileContent(content, document.uri);
      return contents;
    }

    function updateWebview(text: string) {
      webviewPanel.webview.postMessage({
        command: WebViewMessages.toWebview.configEditor.updateConfigContents,
        payload: getContent(text),
      });
    }

    function triggerSave() {
      webviewPanel.webview.postMessage({
        command: WebViewMessages.toWebview.configEditor.triggerSave,
      });
    }

    const changeDocumentSubscription = workspace.onDidSaveTextDocument((e) => {
      if (e.uri.toString() === document.uri.toString()) {
        webviewPanel.active ? triggerSave() : updateWebview(e.getText());
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    webviewPanel.webview.onDidReceiveMessage(
      async (message: { command: string; requestId?: string; payload?: any }) => {
        const { command, requestId, payload } = message;
        if (command === WebViewMessages.toVscode.configEditor.getContents) {
          handleGetContents(webviewPanel, requestId, getContent);
        } else if (command === WebViewMessages.toVscode.runCommand) {
          await handleRunCommand(payload);
        } else if (command === WebViewMessages.toVscode.configEditor.openSource) {
          ConfigEditorProvider.openInTextEditor(document.uri);
        } else if (command === WebViewMessages.toVscode.configEditor.saveFile) {
          await handleSaveFile(payload, document, webviewPanel, requestId);
        } else if (command === WebViewMessages.toVscode.configEditor.filePicker) {
          await handleFilePicker(payload, webviewPanel, requestId);
        } else if (command === WebViewMessages.toVscode.configEditor.getThemes) {
          await handleGetThemes(webviewPanel, requestId);
        } else if (command === WebViewMessages.toVscode.configEditor.runDemoStep) {
          await handleRunDemoStep(payload, document, webviewPanel, requestId);
        } else {
          console.warn(`Unknown message command: ${command}`);
        }
      },
    );
    /**
     * Handles running a demo step from the config editor webview.
     */
    async function handleRunDemoStep(
      payload: any,
      document: TextDocument,
      webviewPanel: WebviewPanel,
      requestId: string | undefined,
    ) {
      // Example: payload could be { step: { ... } }
      if (!payload || !payload.step) {
        window.showErrorMessage('No demo step provided to run.');
        return;
      }
      try {
        Logger.info(`Running demo step from config editor: ${JSON.stringify(payload.step)}`);
        await DemoRunner.runSteps([payload.step], false);
        window.showInformationMessage('Demo step triggered from config editor.');
        // Optionally, send a response back to the webview
        webviewPanel.webview.postMessage({
          command: WebViewMessages.toVscode.configEditor.runDemoStep,
          requestId,
          payload: { success: true },
        });
      } catch (err) {
        window.showErrorMessage('Failed to run demo step.');
        webviewPanel.webview.postMessage({
          command: WebViewMessages.toVscode.configEditor.runDemoStep,
          requestId,
          payload: { success: false, error: (err as Error)?.message },
        });
      }
    }

    function handleGetContents(
      webviewPanel: WebviewPanel,
      requestId: string | undefined,
      getContent: (text?: string) => any,
    ) {
      webviewPanel.webview.postMessage({
        command: WebViewMessages.toVscode.configEditor.getContents,
        requestId: requestId,
        payload: getContent(),
      });
    }

    async function handleRunCommand(payload: any) {
      const { command: cmd, args } = payload || {};
      if (!cmd) {
        return;
      }
      if (args) {
        await commands.executeCommand(cmd, args);
      } else {
        await commands.executeCommand(cmd);
      }
    }

    async function handleSaveFile(
      payload: any,
      document: TextDocument,
      webviewPanel: WebviewPanel,
      requestId: string | undefined,
    ) {
      const { config } = payload || {};
      if (!config) {
        return;
      }
      const demo = DemoFileProvider.formatFileContent(config, document.uri);
      if (!demo) {
        window.showErrorMessage('Failed to parse the demo configuration.');
      }
      await DemoFileProvider.saveFile(document.uri.fsPath, demo, false);
      webviewPanel.webview.postMessage({
        command: WebViewMessages.toVscode.configEditor.saveFile,
        requestId: requestId,
      });
    }

    async function handleFilePicker(
      payload: any,
      webviewPanel: WebviewPanel,
      requestId: string | undefined,
    ) {
      const { fileTypes } = payload || {};
      const dialogSettings: OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: 'Select File',
      };
      if (Array.isArray(fileTypes) && fileTypes.length > 0) {
        dialogSettings.filters = {
          'Allowed Files': fileTypes.map((ext: string) => ext.replace(/^\./, '')),
        };
      }
      const uris = await window.showOpenDialog(dialogSettings);
      if (!uris || uris.length === 0) {
        webviewPanel.webview.postMessage({
          command: WebViewMessages.toVscode.configEditor.filePicker,
          requestId: requestId,
          payload: null,
        });
        return;
      }
      const extension = Extension.getInstance();
      const workspaceFolder = extension.workspaceFolder;
      let relativePath = parseWinPath(uris[0].fsPath);
      if (workspaceFolder) {
        const workspacePath = parseWinPath(workspaceFolder.uri.fsPath);
        if (relativePath.startsWith(workspacePath)) {
          relativePath = relativePath.substring(workspacePath.length + 1);
        }
      }
      webviewPanel.webview.postMessage({
        command: WebViewMessages.toVscode.configEditor.filePicker,
        requestId: requestId,
        payload: relativePath,
      });
    }

    async function handleGetThemes(webviewPanel: WebviewPanel, requestId: string | undefined) {
      const themes = await getThemes();
      webviewPanel.webview.postMessage({
        command: WebViewMessages.toVscode.configEditor.getThemes,
        requestId: requestId,
        payload: themes.map((theme) => theme.label),
      });
    }
  }

  private async getHtmlForWebview(): Promise<string> {
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
            <link rel="icon" type="image/svg+xml" href="/vite.svg" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Demo Time Config Editor</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="http://localhost:5173/src/main.tsx"></script>
          </body>
        </html>`;
    }

    const URL = `https://config-beta.demotime.show`;
    const response = await fetch(URL, {
      headers: {
        'Content-Type': 'text/html',
      },
      cache: 'no-cache',
    });
    if (!response.ok) {
      commands.executeCommand(COMMAND.openConfigInTextEditor);
      throw new Error(`Failed to fetch HTML: ${response.statusText}`);
    }
    const html = await response.text();
    // Patch relative asset URLs to absolute URLs using the base URL
    const baseUrl = URL.replace(/\/$/, '');
    const patchedHtml = html
      .replace(/(src|href)=["'](\/assets\/[^"']+)["']/g, (match, attr, path) => {
        return `${attr}="${baseUrl}${path}"`;
      })
      .replace(/href=["']\/vite\.svg["']/g, `href="${baseUrl}/vite.svg"`);

    return patchedHtml.toString();
  }

  public static openInConfigEditor(uri?: Uri) {
    uri = uri || window.activeTextEditor?.document.uri;
    commands.executeCommand('vscode.openWith', uri, ConfigEditorProvider.viewType);
  }

  public static openInTextEditor(uri?: Uri) {
    uri = uri || window.activeTextEditor?.document.uri;
    commands.executeCommand('vscode.openWith', uri, 'default');
  }
}
