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
import {
  DemoFileProvider,
  DemoRunner,
  EngageTimeService,
  Extension,
  Logger,
  Notifications,
} from '../services';
import { General } from '../constants';
import {
  checkSnippetArgs,
  getDemoApiData,
  getRelPath,
  getThemes,
  getWebviewHtml,
  openFile,
  openFilePicker,
  writeFile,
} from '../utils';
import { ActionTreeItem } from './ActionTreeviewProvider';
import { SettingsView } from '../settingsView/SettingsView';
import { COMMAND, Config, WebViewMessages } from '@demotime/common';

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

    const html = await getWebviewHtml('config-editor', webviewPanel.webview);
    webviewPanel.webview.html = html || '';

    ConfigEditorProvider.fileViews.set(document.uri.toString(), webviewPanel);

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
        } else if (command === WebViewMessages.toVscode.configEditor.engageTime.getPolls) {
          await getPolls(webviewPanel, command, requestId, payload);
        } else {
          console.warn(`Unknown message command: ${command}`);
        }
      },
    );

    async function getPolls(
      webviewPanel: WebviewPanel,
      command: string,
      requestId: string | undefined,
      payload: { sessionId: string },
    ) {
      if (!requestId) {
        return;
      }

      const { sessionId } = payload;
      const polls = await EngageTimeService.getPolls(sessionId);
      webviewPanel.webview.postMessage({
        command,
        requestId,
        payload: polls,
      });
    }

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
     * Handles running a demo step from the config editor webview.
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

    async function handleGetThemes(webviewPanel: WebviewPanel, requestId: string | undefined) {
      const themes = await getThemes();
      webviewPanel.webview.postMessage({
        command: WebViewMessages.toVscode.configEditor.getThemes,
        requestId: requestId,
        payload: themes.map((theme) => theme.label),
      });
    }

    async function handleCheckStepQueue(webviewPanel: WebviewPanel, requestId: string | undefined) {
      const pendingSteps = ConfigEditorProvider.pendingStepOpens.get(document.uri.toString());
      webviewPanel.webview.postMessage({
        command: WebViewMessages.toVscode.configEditor.checkStepQueue,
        requestId: requestId,
        payload: pendingSteps || null,
      });
    }

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
