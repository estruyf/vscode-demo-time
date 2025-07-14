import { extensions, Uri, ViewColumn } from 'vscode';
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
import { DemoFileProvider, Extension } from '../services';
import { COMMAND, Config, WebViewMessages } from '../constants';

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
      commands.registerCommand(COMMAND.openConfigEditor, () => {
        commands.executeCommand(
          'vscode.openWith',
          window.activeTextEditor?.document.uri,
          ConfigEditorProvider.viewType,
        );
      }),
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

    webviewPanel.webview.onDidReceiveMessage(
      async (message: { command: string; requestId?: string; payload?: any }) => {
        const { command, requestId, payload } = message;

        if (command === WebViewMessages.toVscode.configEditor.getContents) {
          const content = document.getText();
          const contents = DemoFileProvider.parseFileContent(content, document.uri);
          webviewPanel.webview.postMessage({
            command: 'configEditorContents',
            requestId: requestId,
            payload: contents,
          });
        } else if (command === WebViewMessages.toVscode.runCommand) {
          const { command: cmd, args } = payload || {};
          if (!cmd) {
            return;
          }

          if (args) {
            commands.executeCommand(cmd, args);
          } else {
            commands.executeCommand(cmd);
          }
          return;
        } else if (command === WebViewMessages.toVscode.configEditor.openSource) {
          ConfigEditorProvider.openInTextEditor(document.uri);
          return;
        } else if (command === WebViewMessages.toVscode.configEditor.saveFile) {
          const { config } = payload || {};
          if (!config) {
            return;
          }

          const demo = DemoFileProvider.formatFileContent(config, document.uri);
          if (!demo) {
            window.showErrorMessage('Failed to parse the demo configuration.');
          }

          await DemoFileProvider.saveFile(document.uri.fsPath, demo);
          return;
        } else {
          console.warn(`Unknown message command: ${command}`);
        }
      },
    );
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

  private static openInTextEditor(uri?: Uri) {
    uri = uri || window.activeTextEditor?.document.uri;
    commands.executeCommand('vscode.openWith', uri, 'default');
  }
}
