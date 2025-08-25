import {
  CancellationToken,
  commands,
  CustomTextEditorProvider,
  ExtensionContext,
  TextDocument,
  WebviewPanel,
  Uri,
  window,
  workspace,
  WorkspaceEdit,
  Range,
} from 'vscode';
import { Subscription } from '../models';
import { DemoFileProvider, DemoRunner, Extension, Logger, Notifications } from '../services';
import { COMMAND, Config, General, WebViewMessages } from '../constants';
import {
  checkSnippetArgs,
  getDemoApiData,
  getRelPath,
  getThemes,
  openFile,
  openFilePicker,
  writeFile,
} from '../utils';
import { ActionTreeItem } from './ActionTreeviewProvider';
import { SettingsView } from '../settingsView/SettingsView';

export class ConfigEditorProvider implements CustomTextEditorProvider {
  private static readonly viewType = 'demoTime.configEditor';
  private static readonly fileViews: Map<string, WebviewPanel> = new Map();
  private static pendingStepOpens: Map<string, ActionTreeItem> = new Map();
  private static isManualSave = false;

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

    ConfigEditorProvider.fileViews.set(document.uri.toString(), webviewPanel);

    /**
     * Parse and return the demo file contents for the current document or for provided text.
     *
     * If `text` is omitted, the function reads the current document text via `document.getText()` and parses that.
     *
     * @param text - Optional raw file text to parse instead of the current document contents.
     * @returns The parsed configuration/AST produced by `DemoFileProvider.parseFileContent` for the document URI.
     */
    function getContent(text?: string) {
      const content = text ?? document.getText();
      const contents = DemoFileProvider.parseFileContent(content, document.uri);
      return contents;
    }

    /**
     * Sends the parsed configuration content to the webview so the config editor UI can update.
     *
     * @param text - Raw document text to parse and send to the webview; passed to the local `getContent` parser before posting.
     */
    function updateWebview(text: string) {
      webviewPanel.webview.postMessage({
        command: WebViewMessages.toWebview.configEditor.updateConfigContents,
        payload: getContent(text),
      });
    }

    /**
     * Requests the webview to perform a save of the current config unless a manual save flow is active.
     *
     * If the shared `isManualSave` flag is true, this call clears the flag and does nothing else.
     * Otherwise it posts a `triggerSave` message to the associated webview panel.
     */
    function triggerSave() {
      if (ConfigEditorProvider.isManualSave) {
        ConfigEditorProvider.isManualSave = false;
        return;
      }

      webviewPanel.webview.postMessage({
        command: WebViewMessages.toWebview.configEditor.triggerSave,
      });
    }

    const saveDocumentSubscription = workspace.onDidSaveTextDocument((e) => {
      if (e.uri.toString() === document.uri.toString()) {
        webviewPanel.active ? triggerSave() : updateWebview(e.getText());
      }
    });

    const changeDocumentSubscription = workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        updateWebview(e.document.getText());
      }
    });

    webviewPanel.onDidDispose(() => {
      ConfigEditorProvider.fileViews.delete(document.uri.toString());
      ConfigEditorProvider.pendingStepOpens.delete(document.uri.toString());
      saveDocumentSubscription.dispose();
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
        } else if (command === WebViewMessages.toVscode.configEditor.updateConfig) {
          await updateConfig(payload, document);
        } else if (command === WebViewMessages.toVscode.configEditor.saveFile) {
          await handleSaveFile(payload, document, webviewPanel, requestId);
        } else if (command === WebViewMessages.toVscode.configEditor.filePicker) {
          await handleFilePicker(payload, webviewPanel, requestId);
        } else if (command === WebViewMessages.toVscode.configEditor.getThemes) {
          await handleGetThemes(webviewPanel, requestId);
        } else if (command === WebViewMessages.toVscode.configEditor.runDemoStep) {
          await handleRunDemoStep(payload, document, webviewPanel, requestId);
        } else if (command === WebViewMessages.toVscode.configEditor.checkStepQueue) {
          await handleCheckStepQueue(webviewPanel, requestId);
        } else if (command === WebViewMessages.toVscode.configEditor.openSettings) {
          SettingsView.show();
        } else if (command === WebViewMessages.toVscode.openFile && payload) {
          openFile(payload);
        } else if (command === WebViewMessages.toVscode.configEditor.checkSnippetArgs && payload) {
          await handleCheckSnippetArgs(payload, webviewPanel, command, requestId);
        } else if (command === WebViewMessages.toVscode.configEditor.getDemoIds) {
          await handleGetDemoIds(webviewPanel, command, requestId);
        } else if (command === WebViewMessages.toVscode.configEditor.createNotes) {
          await handleCreateNotes(webviewPanel, command, requestId, payload);
        } else {
          console.warn(`Unknown message command: ${command}`);
        }
      },
    );

    /**
     * Creates a notes file in the workspace from webview-provided content and notifies the webview of the result.
     *
     * If `payload.path` or `payload.content` is missing, or no workspace folder is available, this posts an undefined payload back to the webview and shows an error notification. On success, writes the file under the configured demo folder, opens the file in the editor, and posts the relative path back to the webview. All runtime errors are caught, logged, and communicated to the webview as a failure (undefined payload).
     *
     * @param payload - Object with `path` (relative path under the demo folder) and `content` (file contents) describing the note to create.
     */
    async function handleCreateNotes(
      webviewPanel: WebviewPanel,
      command: string,
      requestId: string | undefined,
      payload?: { path: string; content: string },
    ) {
      if (!payload?.path || !payload?.content) {
        webviewPanel.webview.postMessage({
          command,
          requestId,
          payload: undefined,
        });
        Notifications.error('Failed to create notes: Path or content is missing.');
        return;
      }
      try {
        const wsFolder = Extension.getInstance().workspaceFolder;
        if (!wsFolder) {
          webviewPanel.webview.postMessage({
            command,
            requestId,
            payload: undefined,
          });
          Notifications.error('No workspace folder found. Cannot create notes.');
          return;
        }

        const fileUri = Uri.joinPath(wsFolder.uri, General.demoFolder, payload.path);
        await writeFile(fileUri, payload.content);
        const relPath = getRelPath(fileUri.fsPath);
        await openFile(relPath);
        webviewPanel.webview.postMessage({
          command,
          requestId,
          payload: relPath,
        });
      } catch (error) {
        webviewPanel.webview.postMessage({
          command,
          requestId,
          payload: undefined,
        });
        Logger.error(`Failed to create notes: ${(error as Error).message}`);
      }
    }

    /**
     * Fetch demo metadata from the remote API and post it to the webview as a response.
     *
     * On success posts `{ command, requestId, payload: apiData }`. On failure logs the error
     * and posts `{ command, requestId, payload: [] }`.
     *
     * @param command - The webview message command to use when sending the response.
     * @param requestId - Optional request identifier used to correlate the response with the original request.
     * @returns A promise that resolves once the response has been posted to the webview.
     */
    async function handleGetDemoIds(
      webviewPanel: WebviewPanel,
      command: string,
      requestId: string | undefined,
    ) {
      try {
        const apiData = await getDemoApiData();
        webviewPanel.webview.postMessage({
          command,
          requestId,
          payload: apiData,
        });
      } catch (error) {
        console.error('Failed to get demo IDs:', error);
        webviewPanel.webview.postMessage({
          command,
          requestId,
          payload: [],
        });
      }
    }

    /**
     * Execute a single demo step requested by the config editor webview.
     *
     * Parses `payload.step`, runs it via DemoRunner, and posts a success/failure message
     * back to the originating webview panel. Displays an information message on success
     * or an error message on failure.
     *
     * @param payload - Object expected to contain a `step` property describing the demo step to run.
     * @param webviewPanel - The webview panel to post the result message to.
     * @param requestId - Optional request identifier to include in the response message so the webview can correlate replies.
     */
    async function handleRunDemoStep(
      payload: any,
      _: TextDocument,
      webviewPanel: WebviewPanel,
      requestId: string | undefined,
    ) {
      // Example: payload could be { step: { ... } }
      if (!payload?.step) {
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

    /**
     * Send the current parsed configuration contents to the webview as a `getContents` response.
     *
     * Posts a message to the provided webview panel using the `configEditor.getContents` command.
     *
     * @param requestId - Optional request identifier used to correlate this response with the original request.
     * @param getContent - Callable that returns the content payload to send; invoked without arguments.
     */
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

    /**
     * Executes a VS Code command specified in the incoming payload.
     *
     * The payload should be an object with a `command` property (string) and an optional `args` property
     * which will be passed to the command as a single argument. If `command` is missing the function
     * returns early. Resolves once `commands.executeCommand` completes.
     *
     * @param payload - Object containing `command` (required) and optional `args` to forward to the command.
     * @returns A promise that resolves when the command execution finishes.
     */
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

    /**
     * Replace the given TextDocument's entire contents with the formatted `config`.
     *
     * If `config` or `document` is not provided, the function is a no-op.
     *
     * The `config` object is formatted using DemoFileProvider.formatFileContent(document.uri)
     * and then used to replace the whole document text via a WorkspaceEdit.
     *
     * @param config - The configuration object to serialize and write into the document.
     * @param document - The target TextDocument to replace.
     * @returns A promise that resolves to `true` if the edit was applied, `false` if not,
     *          or `undefined` when the function early-returns due to missing inputs.
     */
    async function updateConfig(config: any, document?: TextDocument) {
      if (!config || !document) {
        return;
      }

      const edit = new WorkspaceEdit();
      const demo = DemoFileProvider.formatFileContent(config, document.uri);
      const lastLine = document.lineCount - 1;
      const lastChar = document.lineAt(lastLine).text.length;
      edit.replace(document.uri, new Range(0, 0, lastLine, lastChar), demo);

      return workspace.applyEdit(edit);
    }

    /**
     * Save the provided config payload into the given TextDocument, trigger a workspace save, and notify the webview of completion.
     *
     * Formats `payload.config` via DemoFileProvider and replaces the entire document content with the formatted result (newlines escaped for the workspace edit).
     * Marks the provider as a manual save (ConfigEditorProvider.isManualSave = true), executes the global save command, and posts a save-complete message back to the webview.
     * If formatting fails, shows an error message and aborts without performing the save or posting success.
     *
     * @param payload - Object expected to contain a `config` property with the demo configuration to save.
     * @param document - The TextDocument to be replaced with the formatted configuration.
     * @param webviewPanel - The WebviewPanel to which the save result message will be posted.
     * @param requestId - Optional request identifier propagated back to the webview for correlating responses.
     * @returns A promise that resolves when the save flow (edit + save command + notification) has been initiated.
     */
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
      ConfigEditorProvider.isManualSave = true; // Indicate that this is a manual save
      // await DemoFileProvider.saveFile(document.uri.fsPath, demo.replace(/\r?\n/g, '\\n'), false);

      const fullRange = new Range(
        document.positionAt(0),
        document.positionAt(document.getText().length),
      );
      const edit = new WorkspaceEdit();
      edit.replace(document.uri, fullRange, demo.replace(/\r?\n/g, '\\n'));

      await commands.executeCommand(`workbench.action.files.save`);
      webviewPanel.webview.postMessage({
        command: WebViewMessages.toVscode.configEditor.saveFile,
        requestId: requestId,
      });
    }

    /**
     * Opens a file picker (optionally filtered by `payload.fileTypes`) and posts the chosen path back to the webview.
     *
     * If the user cancels, posts a `null` payload. The message uses the `WebViewMessages.toVscode.configEditor.filePicker`
     * command and includes the original `requestId` when present so the webview can correlate the response.
     *
     * @param payload - Optional object that may include a `fileTypes` filter passed to the file picker.
     * @param requestId - Optional identifier echoed back in the response to correlate requests and replies.
     */
    async function handleFilePicker(
      payload: any,
      webviewPanel: WebviewPanel,
      requestId: string | undefined,
    ) {
      const filePath = await openFilePicker(payload?.fileTypes);
      if (!filePath) {
        webviewPanel.webview.postMessage({
          command: WebViewMessages.toVscode.configEditor.filePicker,
          requestId: requestId,
          payload: null,
        });
        return;
      }

      webviewPanel.webview.postMessage({
        command: WebViewMessages.toVscode.configEditor.filePicker,
        requestId: requestId,
        payload: filePath,
      });
    }

    /**
     * Fetches available themes and posts their labels to the given webview.
     *
     * Posts a message with command `configEditor.getThemes` and a payload containing an array of theme labels.
     *
     * @param webviewPanel - Target webview panel to receive the message.
     * @param requestId - Optional request identifier echoed back to correlate responses with the requestor.
     */
    async function handleGetThemes(webviewPanel: WebviewPanel, requestId: string | undefined) {
      const themes = await getThemes();
      webviewPanel.webview.postMessage({
        command: WebViewMessages.toVscode.configEditor.getThemes,
        requestId: requestId,
        payload: themes.map((theme) => theme.label),
      });
    }

    /**
     * Checks for a pending "open step" item for the document associated with the enclosing editor and posts it to the provided webview.
     *
     * The message payload is the pending ActionTreeItem if present, or `null` when none is queued. The original `requestId`
     * (if any) is forwarded so the webview can correlate the response.
     *
     * @param webviewPanel - The webview panel to which the check result will be posted.
     * @param requestId - Optional request identifier forwarded to the webview for correlation.
     */
    async function handleCheckStepQueue(webviewPanel: WebviewPanel, requestId: string | undefined) {
      const pendingSteps = ConfigEditorProvider.pendingStepOpens.get(document.uri.toString());
      webviewPanel.webview.postMessage({
        command: WebViewMessages.toVscode.configEditor.checkStepQueue,
        requestId: requestId,
        payload: pendingSteps || null,
      });
    }

    /**
     * Validates snippet arguments and sends the result back to the webview.
     *
     * Calls checkSnippetArgs(payload) and posts its result to the provided webview panel under the given
     * command and requestId. If validation fails, posts a payload of `undefined`. Errors are caught and
     * not rethrown.
     *
     * @param payload - Data to be validated by `checkSnippetArgs` (shape depends on snippet requirements).
     * @param command - Message command name to use when posting the response back to the webview.
     * @param requestId - Optional correlation identifier echoed back with the response.
     */
    async function handleCheckSnippetArgs(
      payload: any,
      webviewPanel: WebviewPanel,
      command: string,
      requestId: string | undefined,
    ) {
      try {
        const args = await checkSnippetArgs(payload);
        webviewPanel.webview.postMessage({
          command,
          requestId: requestId,
          payload: args,
        });
      } catch (error) {
        console.error('Failed to check snippet args:', error);
        webviewPanel.webview.postMessage({
          command,
          requestId: requestId,
          payload: undefined,
        });
      }
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

  public static openStepInEditor(fileUri: Uri, item: ActionTreeItem) {
    if (!fileUri || !item) {
      return;
    }

    const panel = ConfigEditorProvider.fileViews.get(fileUri.toString());
    if (panel?.active) {
      panel.reveal();
      panel.webview.postMessage({
        command: WebViewMessages.toWebview.configEditor.openStep,
        payload: item,
      });
    } else {
      if (!ConfigEditorProvider.pendingStepOpens) {
        ConfigEditorProvider.pendingStepOpens = new Map<string, ActionTreeItem>();
      }
      ConfigEditorProvider.pendingStepOpens.set(fileUri.toString(), item);
      ConfigEditorProvider.openInConfigEditor(fileUri);
    }
  }
}
