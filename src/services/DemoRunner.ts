import { PresenterView } from './../presenterView/PresenterView';
import { COMMAND, Config, ContextKeys, StateKeys, WebViewMessages } from '../constants';
import {
  Action,
  Demo,
  DemoFileCache,
  DemoFile,
  IImagePreview,
  ISlidePreview,
  Step,
  Subscription,
  Version,
} from '../models';
import { Extension } from './Extension';
import {
  Position,
  Range,
  Selection,
  Terminal,
  TextDocument,
  TextEditor,
  TextEditorRevealType,
  Uri,
  WorkspaceEdit,
  WorkspaceFolder,
  commands,
  env,
  window,
  workspace,
} from 'vscode';
import { FileProvider } from './FileProvider';
import { DemoPanel } from '../panels/DemoPanel';
import {
  getVariables,
  getFileContents,
  getLineInsertionSpeed,
  getLineRange,
  getPositionAndRange,
  insertContent,
  insertLineByLine,
  insertVariables,
  replaceContent,
  sleep,
  getNextDemoFile,
  getPreviousDemoFile,
  removeDemoDuplicates,
  writeText,
  getUserInput,
  clearVariablesState,
  setContext,
  writeFile,
  applyPatch,
  updateConfig,
  togglePresentationView,
  removeDemosForCurrentPosition,
} from '../utils';
import { ActionTreeItem } from '../providers/ActionTreeviewProvider';
import { DecoratorService } from './DecoratorService';
import { Notifications } from './Notifications';
import { parse as jsonParse } from 'jsonc-parser';
import { Logger } from './Logger';
import { NotesService } from './NotesService';
import { ScriptExecutor } from './ScriptExecutor';
import { StateManager } from './StateManager';
import { Preview } from '../preview/Preview';
import { DemoStatusBar } from './DemoStatusBar';
import { ExternalAppsService } from './ExternalAppsService';

const DEFAULT_START_VALUE = {
  filePath: '',
  version: 2 as Version,
  demo: [],
};

export class DemoRunner {
  private static isPresentationMode = false;
  private static terminal: { [id: string]: Terminal | null } = {};
  private static readonly terminalName = 'DemoTime';
  private static crntFilePath: string | undefined;
  private static crntHighlightRange: Range | undefined;
  private static crntZoom: number | undefined;
  private static crntHighlightWholeLine: boolean | undefined;
  public static currentDemo: Demo | undefined;

  /**
   * Registers the commands for the demo runner.
   */
  public static registerCommands() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(commands.registerCommand(COMMAND.start, DemoRunner.start));
    subscriptions.push(commands.registerCommand(COMMAND.previous, DemoRunner.previous));
    subscriptions.push(
      commands.registerCommand(COMMAND.togglePresentationMode, DemoRunner.togglePresentationMode),
    );
    subscriptions.push(commands.registerCommand(COMMAND.runStep, DemoRunner.startDemo));
    subscriptions.push(commands.registerCommand(COMMAND.runById, DemoRunner.runById));
    subscriptions.push(commands.registerCommand(COMMAND.reset, DemoRunner.reset));
    subscriptions.push(
      commands.registerCommand(COMMAND.toggleHighlight, DemoRunner.toggleHighlight),
    );
    subscriptions.push(
      commands.registerCommand(
        COMMAND.toggleSelectionHighlight,
        DemoRunner.toggleSelectionHighlight,
      ),
    );

    window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.fileName === DemoRunner.crntFilePath) {
        await setContext(ContextKeys.hasCodeHighlighting, true);
      } else {
        DecoratorService.setDecorated(false);
        await setContext(ContextKeys.hasCodeHighlighting, false);
      }
    });

    DemoRunner.allowPrevious();
  }

  /**
   * Sets the current highlighting details including file path, range, and zoom level.
   *
   * @param filePath - The path of the file to highlight.
   * @param range - The range within the file to highlight.
   * @param zoom - The zoom level for the highlighting.
   * @param highlightWholeLine - Indicates whether the highlighting should be applied to the whole line.
   */
  public static setCrntHighlighting(
    filePath?: string,
    range?: Range,
    zoom?: number,
    highlightWholeLine?: boolean,
  ) {
    DemoRunner.crntFilePath = filePath;
    DemoRunner.crntHighlightRange = range;
    DemoRunner.crntZoom = zoom;
    DemoRunner.crntHighlightWholeLine = highlightWholeLine;
  }

  /**
   * Retrieves the executed demo file.
   * @returns {Promise<DemoFileCache>} The executed demo file.
   */
  public static async getExecutedDemoFile(): Promise<DemoFileCache> {
    const ext = Extension.getInstance();
    const demoFile = ext.getState<DemoFileCache>(StateKeys.executingDemoFile);
    if (!demoFile) {
      return Object.assign({}, DEFAULT_START_VALUE);
    }

    return demoFile;
  }

  /**
   * Sets the context key for enabling or disabling the "previous" functionality
   * based on the configuration setting.
   *
   * @returns {Promise<void>} A promise that resolves when the context key has been set.
   */
  public static async allowPrevious(): Promise<void> {
    const previousEnabled =
      Extension.getInstance().getSetting<boolean>(Config.presentationMode.previousEnabled) || false;
    await setContext(ContextKeys.previousEnabled, previousEnabled);
  }

  /**
   * Sets the executed demo file in the extension state.
   * @param demoFile - The demo file to be set as executed.
   */
  private static async setExecutedDemoFile(demoFile: DemoFileCache) {
    const ext = Extension.getInstance();
    await ext.setState(StateKeys.executingDemoFile, demoFile);
    PresenterView.postMessage(WebViewMessages.toWebview.updateRunningDemos, demoFile);
  }

  /**
   * Retrieves the current presentation mode status.
   *
   * @returns {boolean} A boolean indicating whether the presentation mode is active.
   */
  public static getIsPresentationMode(): boolean {
    return DemoRunner.isPresentationMode;
  }

  /**
   * Retrieves the current version of the executing demo file.
   *
   * @returns {Version} The detected version of the current demo file.
   */
  public static getCurrentVersion(): Version {
    const executingFile = Extension.getInstance().getState<DemoFileCache>(
      StateKeys.executingDemoFile,
    );
    if (!executingFile) {
      return 2;
    }

    const lastDemo = executingFile.demo[executingFile.demo.length - 1];
    if (!lastDemo) {
      return 2;
    }

    // Only old demo files without a version property should be version 1
    return typeof executingFile.version === 'number' ? (executingFile.version as Version) : 1;
  }

  /**
   * Toggles the presentation mode for the demo runner.
   * If `enable` parameter is provided, it sets the presentation mode to the specified value.
   * If `enable` parameter is not provided, it toggles the presentation mode.
   * @param enable - Optional. Specifies whether to enable or disable the presentation mode.
   * @returns A promise that resolves when the presentation mode is toggled.
   */
  private static async togglePresentationMode(enable?: boolean): Promise<void> {
    DemoRunner.isPresentationMode =
      typeof enable !== 'undefined' ? enable : !DemoRunner.isPresentationMode;
    DemoStatusBar.setPresenting(DemoRunner.isPresentationMode);
    await setContext(ContextKeys.presentation, DemoRunner.isPresentationMode);
    PresenterView.postMessage(
      WebViewMessages.toWebview.updatePresentationStarted,
      DemoRunner.isPresentationMode,
    );
    if (DemoRunner.isPresentationMode) {
      DemoPanel.updateMessage('Presentation mode enabled');
      await DemoRunner.getDemoFile(undefined, true);
      Preview.postMessage(WebViewMessages.toWebview.updateIsInPresentationMode, true);
    } else {
      DemoPanel.updateMessage();
      Preview.postMessage(WebViewMessages.toWebview.updateIsInPresentationMode, false);
    }
    DemoPanel.update();
  }

  /**
   * Resets the DemoRunner state by clearing the executing demo file path and demo array.
   */
  private static async reset(): Promise<void> {
    const ext = Extension.getInstance();
    const resetContent = Object.assign({}, DEFAULT_START_VALUE);
    await ext.setState(StateKeys.executingDemoFile, resetContent);
    await clearVariablesState();
    PresenterView.postMessage(WebViewMessages.toWebview.updateRunningDemos, resetContent);
    PresenterView.postMessage(WebViewMessages.toWebview.resetNotes, undefined);
    DemoRunner.currentDemo = undefined;
    DemoRunner.togglePresentationMode(false);
    DemoPanel.update();
    Preview.close();
  }

  /**
   * Starts the demo runner or runs the next demo step.
   *
   * @returns {Promise<void>} A promise that resolves when the demo runner has started.
   */
  private static async start(
    item: ActionTreeItem | { demoFilePath: string; description: string },
  ): Promise<void> {
    if (Preview.isListening()) {
      return;
    }

    if (Preview.checkIfHasNextSlide()) {
      await Preview.postMessage(WebViewMessages.toWebview.nextSlide);
      return;
    }

    const executingFile = await DemoRunner.getExecutedDemoFile();

    const demoFile = await DemoRunner.getDemoFile(item);
    let demos: Demo[] = demoFile?.demo.demos || [];

    if (demos.length <= 0) {
      Notifications.error('No demo steps found');
      return;
    }

    // Get the first demo step to start
    const lastDemo = executingFile.demo[executingFile.demo.length - 1];
    const lastDemoIdx = !lastDemo
      ? -1
      : demos.findIndex((d, idx) => (d.id ? d.id === lastDemo.id : idx === lastDemo.idx));
    const nextDemoIdx = lastDemoIdx + 1;
    const nextDemo = demos[nextDemoIdx];

    if (!nextDemo) {
      // Check if there is a next demo file
      const nextFile = await getNextDemoFile(demoFile);
      if (!nextFile) {
        const yesOrNo = await Notifications.info(
          'No next demo steps found. Do you want to reset?',
          'Yes',
          'No',
        );
        if (yesOrNo === 'Yes') {
          await DemoRunner.reset();
          await commands.executeCommand(COMMAND.start);
        }
        return;
      }

      // Set the current executing file to the next file
      executingFile.filePath = nextFile.filePath;
      executingFile.demo = [];
      await DemoRunner.setExecutedDemoFile(executingFile);
      // Start the next demo file
      DemoRunner.start({
        demoFilePath: nextFile.filePath,
        description: nextFile.filePath.split('/').pop(),
      });
      return;
    }

    const demoSteps = nextDemo.steps;
    if (!demoSteps) {
      return;
    }

    executingFile.demo.push({
      idx: nextDemoIdx,
      title: nextDemo.title,
      id: nextDemo.id,
    });

    executingFile.demo = removeDemoDuplicates(executingFile.demo);
    executingFile.demo = removeDemosForCurrentPosition(executingFile.demo, nextDemoIdx);

    await DemoRunner.setExecutedDemoFile(executingFile);
    DemoRunner.currentDemo = nextDemo;
    await DemoRunner.runSteps(demoSteps);
    NotesService.showNotes(nextDemo);
  }

  /**
   * Executes the previous demo step.
   *
   * @returns {Promise<void>} A promise that resolves when the previous demo step has been executed.
   */
  private static async previous(): Promise<void> {
    if (Preview.checkIfHasPreviousSlide()) {
      await Preview.postMessage(WebViewMessages.toWebview.previousSlide);
      return;
    }

    const executingFile = await DemoRunner.getExecutedDemoFile();
    const filePath = executingFile.filePath;
    if (!filePath) {
      return;
    }

    const demoFile = await FileProvider.getFile(Uri.file(filePath));
    const demos = demoFile?.demos || [];

    if (demos.length <= 0) {
      Notifications.error('No demo steps found');
      return;
    }

    // Get the previous demo step to start
    const lastDemo = executingFile.demo[executingFile.demo.length - 1];
    const demoIdxToRun = !lastDemo ? -1 : lastDemo.idx;
    const previousDemoIdx = demoIdxToRun - 1;
    const previousDemo = previousDemoIdx >= 0 ? demos[previousDemoIdx] : null;

    if (previousDemoIdx < 0 || !previousDemo) {
      const previousFile = await getPreviousDemoFile({
        filePath,
      });
      if (!previousFile) {
        Notifications.info('No previous demo steps found');
        return;
      }

      executingFile.filePath = previousFile.filePath;
      executingFile.demo = [];
      // Get the last demo step of the previous file
      const lastDemo = previousFile.demo.demos[previousFile.demo.demos.length - 1];
      const crntIdx = previousFile.demo.demos.length - 1;
      executingFile.demo.push({
        idx: crntIdx,
        title: lastDemo.title,
        id: lastDemo.id,
      });

      executingFile.demo = removeDemoDuplicates(executingFile.demo);
      executingFile.demo = removeDemosForCurrentPosition(executingFile.demo, crntIdx);

      await DemoRunner.setExecutedDemoFile(executingFile);
      DemoRunner.currentDemo = lastDemo;
      await DemoRunner.runSteps(lastDemo.steps);
      NotesService.showNotes(lastDemo);
      return;
    }

    const demoSteps = previousDemo.steps;
    if (!demoSteps) {
      return;
    }

    executingFile.demo.pop();
    executingFile.demo.push({
      idx: previousDemoIdx,
      title: previousDemo.title,
      id: previousDemo.id,
    });

    executingFile.demo = removeDemoDuplicates(executingFile.demo);
    executingFile.demo = removeDemosForCurrentPosition(executingFile.demo, previousDemoIdx);

    await DemoRunner.setExecutedDemoFile(executingFile);
    DemoRunner.currentDemo = previousDemo;
    await DemoRunner.runSteps(demoSteps);
    NotesService.showNotes(previousDemo);
  }

  /**
   * Starts the execution of a demo.
   * @param demoToRun - The demo to run.
   * @returns A promise that resolves when the demo execution is complete.
   */
  private static async startDemo(demoToRun: {
    filePath: string;
    idx: number;
    demo: Demo;
  }): Promise<void> {
    if (!demoToRun) {
      return;
    }

    if (demoToRun.demo.steps.length <= 0) {
      return;
    }

    const executingFile = await DemoRunner.getExecutedDemoFile();
    if (executingFile.filePath !== demoToRun.filePath) {
      executingFile.filePath = demoToRun.filePath;
      executingFile.demo = [];

      const demoFile = await FileProvider.getFile(Uri.file(demoToRun.filePath));
      executingFile.version = demoFile?.version || 1;
    }

    executingFile.demo.push({
      idx: demoToRun.idx,
      title: demoToRun.demo.title,
      id: demoToRun.demo.id,
    });

    executingFile.demo = removeDemoDuplicates(executingFile.demo);
    executingFile.demo = removeDemosForCurrentPosition(executingFile.demo, demoToRun.idx);

    await DemoRunner.setExecutedDemoFile(executingFile);
    DemoRunner.currentDemo = demoToRun.demo;
    await DemoRunner.runSteps(demoToRun.demo.steps);
    NotesService.showNotes(demoToRun.demo);
  }

  private static async runById(...args: string[]): Promise<void> {
    if (args.length <= 0) {
      return;
    }

    const id = args[0];
    Logger.info(`Running demo with id: ${id}`);

    // Get all the demo files
    const demoFiles = await FileProvider.getFiles();
    if (!demoFiles) {
      return;
    }

    // Find the demo file that contains the specified id
    let filePath = null;
    for (const crntFilePath in demoFiles) {
      const demos = demoFiles[crntFilePath].demos;
      const crntDemo = demos.find((demo) => demo.id === id);
      if (crntDemo) {
        filePath = crntFilePath;
        break;
      }
    }

    if (!filePath) {
      Notifications.error('No demo found with the specified id');
      return;
    }

    const executingFile = await DemoRunner.getExecutedDemoFile();
    if (executingFile.filePath !== filePath) {
      executingFile.filePath = filePath;
      executingFile.demo = [];
    }

    // Get the demo idx
    const demoIdx = demoFiles[filePath].demos.findIndex((demo) => demo.id === id);
    if (demoIdx < 0) {
      Notifications.error('No demo found with the specified id');
      return;
    }
    const demoToRun = demoFiles[filePath].demos[demoIdx];
    DemoRunner.currentDemo = demoToRun;

    executingFile.demo.push({
      idx: demoIdx,
      title: demoToRun.title,
      id: demoToRun.id,
    });

    executingFile.demo = removeDemoDuplicates(executingFile.demo);
    executingFile.demo = removeDemosForCurrentPosition(executingFile.demo, demoIdx);

    await DemoRunner.setExecutedDemoFile(executingFile);
    DemoRunner.currentDemo = demoToRun;
    await DemoRunner.runSteps(demoToRun.steps);
    NotesService.showNotes(demoToRun);
  }

  /**
   * Runs the given demo steps.
   * @param demoSteps An array of Step objects representing the steps to be executed.
   */
  private static async runSteps(demoSteps: Step[]): Promise<void> {
    // Unselect the current selection
    const textEditor = window.activeTextEditor;
    if (textEditor) {
      DecoratorService.unselect(textEditor);
    }

    // Reset the highlight
    await setContext(ContextKeys.hasCodeHighlighting, false);
    DemoRunner.setCrntHighlighting();

    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return;
    }

    let variables = await getVariables(workspaceFolder);
    if (variables && Object.keys(variables)) {
      let tempSteps = JSON.stringify(demoSteps);
      tempSteps = await insertVariables(tempSteps, variables);
      demoSteps = jsonParse(tempSteps);
    }

    // Replace the snippets in the demo steps
    const stepsToExecute: Step[] = [];
    if (demoSteps.some((step) => step.action === Action.Snippet)) {
      for (const step of demoSteps) {
        if (step.action === Action.Snippet) {
          let snippet = await getFileContents(workspaceFolder, step.contentPath);
          if (!snippet) {
            return;
          }

          // Replace the argument variables in the snippet
          const args = step.args || {};
          snippet = await insertVariables(snippet, args);

          // Replace the variables in the snippet
          if (variables && Object.keys(variables)) {
            snippet = await insertVariables(snippet, variables);
          }

          const newSteps = jsonParse(snippet);
          stepsToExecute.push(...newSteps);
        } else {
          stepsToExecute.push(step);
        }
      }
    } else {
      stepsToExecute.push(...demoSteps);
    }

    // Loop over all the demo steps and execute them.
    for (let step of stepsToExecute) {
      if (!step.action) {
        continue;
      }

      // Verify if the current step has a `STATE_` or `SCRIPT_` variable which needs to be updated
      // This can happen when the `setState` action is used during the current demo execution (previous step)
      let stepJson = JSON.stringify(step);
      if (
        (stepJson.includes(StateKeys.prefix.state) || stepJson.includes(StateKeys.prefix.script)) &&
        variables
      ) {
        stepJson = await insertVariables(stepJson, variables);
        step = jsonParse(stepJson);
      }

      // Wait for the specified timeout
      if (step.action === Action.WaitForTimeout) {
        await sleep(step.timeout || 1000);
        continue;
      } else if (step.action === Action.WaitForInput) {
        const answer = await getUserInput('Press any key to continue');
        if (answer === undefined) {
          return;
        }
        continue;
      }

      // Open external applications
      if (step.action === Action.openPowerPoint) {
        try {
          await ExternalAppsService.openPowerPoint();
        } catch (error) {
          Notifications.error(`Failed to open PowerPoint: ${(error as Error).message}`);
        }
        continue;
      } else if (step.action === Action.openKeynote) {
        try {
          await ExternalAppsService.openKeynote();
        } catch (error) {
          Notifications.error(`Failed to open Keynote: ${(error as Error).message}`);
        }
        continue;
      }

      // Update settings
      if (step.action === Action.SetSetting) {
        if (!step.setting || !step.setting.key) {
          Notifications.error('No setting key or value specified');
          continue;
        }

        const { key, value } = step.setting;
        await updateConfig(key, value === null ? undefined : value);
        continue;
      }

      if (step.action === Action.SetTheme) {
        if (!step.theme) {
          Notifications.error('No theme specified');
          continue;
        }

        await updateConfig('workbench.colorTheme', step.theme);
        continue;
      }

      if (step.action === Action.UnsetTheme) {
        await updateConfig('workbench.colorTheme', null);
        continue;
      }

      if (step.action === Action.SetPresentationView) {
        await togglePresentationView(true);
        continue;
      }

      if (step.action === Action.UnsetPresentationView) {
        await togglePresentationView(false);
        continue;
      }

      // Set state
      if (step.action === Action.SetState) {
        if (!step.state || !step.state.key || !step.state.value) {
          Notifications.error('No state key or value specified');
          return;
        }

        await StateManager.update(`${StateKeys.prefix.state}${step.state.key}`, step.state.value);
        variables = await getVariables(workspaceFolder);
        continue;
      }

      const fileUri = step.path ? Uri.joinPath(workspaceFolder.uri, step.path) : undefined;

      // Execute the specified VSCode command
      if (step.action === Action.ExecuteVSCodeCommand) {
        if (!step.command) {
          Notifications.error('No command specified');
          continue;
        }

        if (fileUri) {
          await commands.executeCommand(step.command, fileUri);
          continue;
        }

        await commands.executeCommand(step.command, step.args);
        continue;
      }

      if (step.action === Action.ShowInfoMessage) {
        if (!step.message) {
          Notifications.error('No message specified');
          continue;
        }

        window.showInformationMessage(step.message);
        continue;
      }

      if (step.action === Action.OpenWebsite) {
        if (!step.url) {
          Notifications.error('No URL specified');
          continue;
        }

        if (step.openInVSCode) {
          await commands.executeCommand('simpleBrowser.show', Uri.parse(step.url));
        } else {
          await commands.executeCommand('vscode.open', Uri.parse(step.url));
          continue;
        }
      }

      // Run the specified terminal command
      if (step.action === Action.ExecuteTerminalCommand) {
        await DemoRunner.executeTerminalCommand(step.command, step.terminalId);
        continue;
      }

      // Run the specified terminal command
      if (step.action === Action.CloseTerminal) {
        DemoRunner.closeTerminal(step.terminalId);
        continue;
      }

      if (step.action === Action.ExecuteScript) {
        await ScriptExecutor.run(step);
        variables = await getVariables(workspaceFolder);
        continue;
      }

      if (step.action === Action.Write && !step.path) {
        // Write the content at the current position
        const editor = window.activeTextEditor;
        if (!editor) {
          Notifications.error('No active text editor found');
          return;
        }

        const position = editor.selection.active;
        const content = step.content || '';

        if (!content) {
          Notifications.error('No content to write');
          return;
        }

        await writeText(editor, content, position, step.lineInsertionDelay);
        continue;
      }

      if (step.action === Action.Format) {
        await commands.executeCommand('editor.action.formatDocument');
        continue;
      }

      if (step.action === Action.Save) {
        await DemoRunner.saveFile();
      }

      if (step.action === Action.Close) {
        await commands.executeCommand('workbench.action.closeActiveEditor');
        continue;
      }

      if (step.action === Action.CloseAll) {
        await commands.executeCommand('workbench.action.closeAllEditors');
        continue;
      }

      if (step.action === Action.CopyToClipboard) {
        let content = step.content || '';
        
        // If contentPath is provided, read content from file
        if (step.contentPath) {
          const fileContent = await getFileContents(workspaceFolder, step.contentPath);
          if (!fileContent) {
            Notifications.error(`Could not read content from file: ${step.contentPath}`);
            continue;
          }
          content = fileContent;
        }

        // Replace variables in content if any
        if (variables && Object.keys(variables).length > 0) {
          content = await insertVariables(content, variables);
        }

        if (!content) {
          Notifications.error('No content to copy to clipboard');
          continue;
        }

        try {
          await env.clipboard.writeText(content);
          Notifications.info(`Copied to clipboard: ${content.length > 50 ? content.substring(0, 50) + '...' : content}`);
        } catch (error) {
          Notifications.error(`Failed to copy to clipboard: ${(error as Error).message}`);
        }
        continue;
      }

      /**
       * All the following actions require a file path.
       */
      if (!fileUri) {
        continue;
      }

      if (step.action === Action.ImagePreview) {
        const { path, theme } = step as IImagePreview;
        Preview.show(path as string, theme);
        continue;
      }

      if (step.action === Action.OpenSlide) {
        const { path } = step as ISlidePreview;
        Preview.show(path as string);
        continue;
      }

      if (step.action === Action.Open) {
        await commands.executeCommand('vscode.open', fileUri);
        continue;
      }

      if (step.action === Action.MarkdownPreview) {
        await commands.executeCommand('markdown.showPreview', fileUri);
        continue;
      }

      if (step.action === Action.Rename) {
        DemoRunner.rename(workspaceFolder, fileUri, step);
        continue;
      }

      if (step.action === Action.Copy) {
        DemoRunner.copy(workspaceFolder, fileUri, step);
        continue;
      }

      if (step.action === Action.Move) {
        DemoRunner.rename(workspaceFolder, fileUri, step);
        continue;
      }

      if (step.action === Action.DeleteFile) {
        await DemoRunner.deleteFile(workspaceFolder, fileUri);
        continue;
      }

      let content = step.content || '';
      if (step.contentPath) {
        const fileContent = await getFileContents(workspaceFolder, step.contentPath);
        if (!fileContent) {
          continue;
        }
        content = fileContent;
      }

      if (step.action === Action.Create) {
        await writeFile(fileUri, content);
        continue;
      }

      if (step.action === Action.ApplyPatch) {
        await applyPatch(fileUri, content, step.patch);
        continue;
      }

      const editor = await workspace.openTextDocument(fileUri);
      const textEditor = await window.showTextDocument(editor);

      const { crntPosition, crntRange, usesPlaceholders } = await getPositionAndRange(editor, step);

      if (step.action === Action.Unselect) {
        await DemoRunner.unselect(textEditor);
        continue;
      }

      if (step.action === Action.Highlight && (crntRange || crntPosition)) {
        let highlightWholeLine = step.highlightWholeLine;
        if (usesPlaceholders) {
          highlightWholeLine =
            typeof step.highlightWholeLine === 'undefined' ? true : step.highlightWholeLine;
        }

        await DemoRunner.highlight(
          textEditor,
          crntRange,
          crntPosition,
          step.zoom,
          highlightWholeLine,
        );
        continue;
      }

      // Code actions
      if (step.action === Action.Insert) {
        await DemoRunner.insert(
          textEditor,
          editor,
          fileUri,
          content,
          crntPosition,
          step.lineInsertionDelay,
        );
        continue;
      }

      if (step.action === Action.Write) {
        if (!content) {
          Notifications.error('No content to write');
          return;
        }

        if (!crntPosition) {
          Notifications.error('No position specified where to write the content');
          return;
        }

        await writeText(textEditor, content, crntPosition, step.lineInsertionDelay);
        continue;
      }

      if (step.action === Action.Replace) {
        await DemoRunner.replace(
          textEditor,
          editor,
          fileUri,
          content,
          crntRange,
          crntPosition,
          step.lineInsertionDelay,
        );
        continue;
      }

      if (step.action === Action.PositionCursor) {
        if (crntPosition) {
          textEditor.revealRange(
            new Range(crntPosition, crntPosition),
            TextEditorRevealType.InCenter,
          );
          textEditor.selection = new Selection(crntPosition, crntPosition);
        }
        continue;
      }

      if (step.action === Action.Delete) {
        await DemoRunner.delete(editor, fileUri, crntRange, crntPosition);
        continue;
      }
    }

    DemoPanel.update();
  }

  /**
   * Inserts content into a text editor at the specified position or range.
   * If a position is provided, the content is inserted at that position.
   * If a range is provided, the content replaces the text within that range.
   * @param textEditor The text editor where the content should be inserted.
   * @param editor The text document associated with the text editor.
   * @param fileUri The URI of the file where the content should be inserted.
   * @param content The content to be inserted.
   * @param position The position at which the content should be inserted.
   */
  private static async insert(
    textEditor: TextEditor,
    editor: TextDocument,
    fileUri: Uri,
    content: string,
    position: Position | undefined,
    lineInsertionDelay?: number,
  ): Promise<void> {
    if (!position) {
      return;
    }

    let lineContent = null;

    try {
      const line = editor.lineAt(position);
      lineContent = line.text;
    } catch (error) {
      // do nothing
    }

    const lineSpeed = getLineInsertionSpeed(lineInsertionDelay);

    let range = new Range(position, position);
    if (!lineContent) {
      // Insert the content at the specified position
      if (!lineSpeed) {
        await insertContent(fileUri, position, content);
      } else {
        const lineRange = getLineRange(editor, position);
        if (!lineRange) {
          Logger.error('Line range not found');
          return;
        }
        textEditor.revealRange(lineRange, TextEditorRevealType.InCenter);
        await insertLineByLine(fileUri, lineRange.start.line, content, lineSpeed);
      }
    } else {
      if (!lineSpeed) {
        const line = editor.lineAt(position);
        range = line.range;
        await replaceContent(fileUri, line.range, content);
      } else {
        const range = getLineRange(editor, position);
        if (!range) {
          Logger.error('Line range not found');
          return;
        }
        await replaceContent(fileUri, range, '');
        textEditor.revealRange(range, TextEditorRevealType.InCenter);
        await insertLineByLine(fileUri, range.start.line, content, lineSpeed);
      }
    }

    if (textEditor) {
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
      textEditor.selection = new Selection(range.start, range.start);
    }

    await DemoRunner.saveFile();
  }

  /**
   * Replaces the specified range or position in the text editor with the given content.
   * If a range is provided, it replaces the content within that range.
   * If a position is provided, it replaces the content within the line of that position.
   * @param textEditor The text editor in which the replacement should occur.
   * @param editor The text document associated with the text editor.
   * @param fileUri The URI of the file being edited.
   * @param content The content to replace with.
   * @param range The range within which the content should be replaced.
   * @param position The position within the line where the content should be replaced.
   */
  private static async replace(
    textEditor: TextEditor,
    editor: TextDocument,
    fileUri: Uri,
    content: string,
    range: Range | undefined,
    position: Position | undefined,
    lineInsertionDelay?: number,
  ): Promise<void> {
    if (!range && !position) {
      return;
    }

    const lineSpeed = getLineInsertionSpeed(lineInsertionDelay);

    if (range) {
      if (!lineSpeed) {
        await replaceContent(fileUri, range, content);
      } else {
        const startLine = editor.lineAt(range.start);
        const endLine = editor.lineAt(range.end);
        const start = new Position(startLine.lineNumber, 0);
        const end = new Position(endLine.lineNumber, endLine.text.length);

        await replaceContent(fileUri, new Range(start, end), '');

        textEditor.revealRange(new Range(start, end), TextEditorRevealType.InCenter);
        await insertLineByLine(fileUri, startLine.lineNumber, content, lineSpeed);
      }
    } else if (position) {
      if (!lineSpeed) {
        const line = editor.lineAt(position);
        range = line.range;

        await replaceContent(fileUri, line.range, content);
      } else {
        range = getLineRange(editor, position);

        if (!range) {
          Logger.error('Line range not found');
          return;
        }

        await replaceContent(fileUri, range, '');

        textEditor.revealRange(range, TextEditorRevealType.InCenter);
        await insertLineByLine(fileUri, range.start.line, content, lineSpeed);
      }
    }

    if (textEditor && range) {
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
      textEditor.selection = new Selection(range.start, range.start);
    }

    await DemoRunner.saveFile();
  }

  /**
   * Deletes the specified range or line in the given editor.
   * If a range is provided, it deletes the range.
   * If a position is provided, it deletes the line at that position.
   * @param editor The text document editor.
   * @param fileUri The URI of the file being edited.
   * @param range The range to delete (optional).
   * @param position The position of the line to delete (optional).
   */
  private static async delete(
    editor: TextDocument,
    fileUri: Uri,
    range: Range | undefined,
    position: Position | undefined,
  ): Promise<void> {
    if (!range && !position) {
      return;
    }

    const edit = new WorkspaceEdit();

    if (range) {
      edit.delete(fileUri, range);
    } else if (position) {
      const line = editor.lineAt(position);
      edit.delete(fileUri, line.range);
    }

    await workspace.applyEdit(edit);

    await DemoRunner.saveFile();
  }

  /**
   * Toggles the highlight decoration in the active text editor.
   *
   * This method checks if there is an active text editor and a current highlight range.
   * If the editor or range is not available, it exits early.
   *
   * If the text is not currently decorated, it highlights the specified range in the active editor.
   * Otherwise, it removes the highlight decoration.
   *
   * @returns {Promise<void>} A promise that resolves when the toggle operation is complete.
   */
  public static async toggleHighlight(): Promise<void> {
    const activeEditor = window.activeTextEditor;
    const range = DemoRunner.crntHighlightRange;
    const zoom = DemoRunner.crntZoom;
    const highlightWholeLine = DemoRunner.crntHighlightWholeLine;

    if (!activeEditor || !range) {
      return;
    }

    if (!DecoratorService.isDecorated()) {
      DemoRunner.highlight(activeEditor, range, undefined, zoom, highlightWholeLine);
    } else {
      DemoRunner.unselect(activeEditor);
    }
  }

  /**
   * Toggles the highlight of the current text selection in the active editor.
   *
   * If there is no active editor, the function returns immediately.
   * If the selection is a single line, it highlights the selection.
   * If the selection spans multiple lines, it highlights the entire range.
   * If the selection starts at the beginning of the line and ends at the end of the line,
   * it highlights the whole line.
   *
   * If the text is not currently decorated, it highlights the selection.
   * If the text is already decorated, it removes the highlight.
   *
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  public static async toggleSelectionHighlight(): Promise<void> {
    const activeEditor = window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    const selection = activeEditor.selection;
    const range = selection.isSingleLine ? selection : new Range(selection.start, selection.end);
    const endLineText = activeEditor.document.lineAt(selection.end).text;
    let highlightWholeLine =
      range.start.character === 0 && range.end.character === endLineText.length;
    if (range.start.line === range.end.line && range.start.character === range.end.character) {
      highlightWholeLine = true;
    }

    // Remove the text selection
    activeEditor.selection = new Selection(range.start, range.start);

    if (!DecoratorService.isDecorated()) {
      DemoRunner.highlight(activeEditor, range, undefined, undefined, highlightWholeLine, false);
    } else {
      DemoRunner.unselect(activeEditor);
    }
  }

  /**
   * Highlights the specified range or position in the given text editor.
   * @param textEditor - The text editor in which to highlight the range or position.
   * @param range - The range to highlight. If not provided, the position will be used to create a range.
   * @param position - The position to highlight. If not provided, the range will be used to set the selection.
   */
  public static async highlight(
    textEditor: TextEditor,
    range: Range | undefined,
    position: Position | undefined,
    zoomLevel?: number,
    highlightWholeLine?: boolean,
    keepInMemory = true,
  ): Promise<void> {
    if (!range && !position) {
      return;
    }

    if (!textEditor) {
      return;
    }

    if (!range && position) {
      range = new Range(position, position);
    }

    if (range) {
      if (keepInMemory) {
        DemoRunner.setCrntHighlighting(
          textEditor.document.fileName,
          range,
          zoomLevel,
          highlightWholeLine,
        );
        await setContext(ContextKeys.hasCodeHighlighting, true);
      }

      DecoratorService.hightlightLines(textEditor, range, zoomLevel, highlightWholeLine);
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
    }
  }

  /**
   * Unselects the current selection in the given text editor.
   * @param textEditor The text editor to perform the unselect operation on.
   */
  private static async unselect(textEditor: TextEditor): Promise<void> {
    DecoratorService.unselect(textEditor);
  }

  /**
   * Executes a terminal command.
   * @param command - The command to be executed.
   * @returns A promise that resolves when the command execution is complete.
   */
  private static async executeTerminalCommand(
    command?: string,
    terminalId?: string,
  ): Promise<void> {
    if (!command) {
      Notifications.error('No command specified');
      return;
    }

    terminalId = terminalId || DemoRunner.terminalName;
    let terminal = DemoRunner.terminal[terminalId];

    if (!terminal) {
      terminal = window.createTerminal(terminalId);
      DemoRunner.terminal[terminalId] = terminal;

      window.onDidCloseTerminal((term) => {
        if (term.name && DemoRunner.terminal[term.name]) {
          delete DemoRunner.terminal[term.name];
        }
      });
    }

    terminal.show();
    terminal.sendText(command, true);
  }

  /**
   * Closes the terminal.
   * @param terminalId - The ID of the terminal to be closed.
   * @returns A promise that resolves when the terminal is closed.
   */
  private static closeTerminal(terminalId?: string): void {
    terminalId = terminalId || DemoRunner.terminalName;
    const terminal = DemoRunner.terminal[terminalId];

    if (!terminal) {
      return;
    }

    terminal.sendText('exit', true);
    terminal.dispose();
    delete DemoRunner.terminal[terminalId];
  }

  /**
   * Renames a file within the specified workspace folder.
   *
   * @param workspaceFolder - The workspace folder containing the file to be renamed.
   * @param fileUri - The URI of the file to be renamed.
   * @param step - The step containing the destination path for the renamed file.
   * @returns A promise that resolves when the file has been renamed.
   *
   * @throws Will throw an error if the destination is not specified or if the rename operation fails.
   */
  private static async rename(
    workspaceFolder: WorkspaceFolder,
    fileUri: Uri,
    step: Step,
  ): Promise<void> {
    if (!step.dest) {
      Notifications.error('No destination specified');
      return;
    }

    try {
      const newUri = Uri.joinPath(workspaceFolder.uri, step.dest);
      await workspace.fs.rename(fileUri, newUri, { overwrite: !!step.overwrite });
    } catch (error) {
      Notifications.error((error as Error).message);
    }
  }

  /**
   * Copies a file from the specified URI to a new destination within the workspace folder.
   *
   * @param workspaceFolder - The workspace folder where the file will be copied.
   * @param fileUri - The URI of the file to be copied.
   * @param step - The step object containing the destination path.
   * @returns A promise that resolves when the copy operation is complete.
   * @throws Will throw an error if the destination is not specified or if the copy operation fails.
   */
  private static async copy(
    workspaceFolder: WorkspaceFolder,
    fileUri: Uri,
    step: Step,
  ): Promise<void> {
    if (!step.dest) {
      Notifications.error('No destination specified');
      return;
    }

    try {
      const newUri = Uri.joinPath(workspaceFolder.uri, step.dest);
      await workspace.fs.copy(fileUri, newUri, { overwrite: !!step.overwrite });
    } catch (error) {
      Notifications.error((error as Error).message);
    }
  }

  /**
   * Deletes a file from the given workspace folder.
   *
   * @param workspaceFolder - The workspace folder containing the file to be deleted.
   * @param fileUri - The URI of the file to be deleted.
   * @returns A promise that resolves when the file has been deleted.
   * @throws Will throw an error if the file deletion fails.
   */
  private static async deleteFile(workspaceFolder: WorkspaceFolder, fileUri: Uri): Promise<void> {
    try {
      await workspace.fs.delete(fileUri);
    } catch (error) {
      Notifications.error((error as Error).message);
    }
  }

  /**
   * Saves the file in the workspace.
   * @returns A promise that resolves when the file is saved.
   */
  private static async saveFile(): Promise<void> {
    await commands.executeCommand('workbench.action.files.save');
  }

  /**
   * Retrieves the demo file associated with the given ActionTreeItem.
   * @param item The ActionTreeItem representing the demo file.
   * @param triggerFirstDemo A boolean indicating whether to trigger the first demo.
   * @returns A Promise that resolves to an object containing the filePath and demo, or undefined if no demo file is found.
   */
  private static async getDemoFile(
    item?: ActionTreeItem | Uri,
    triggerFirstDemo: boolean = false,
  ): Promise<
    | {
        filePath: string;
        demo: DemoFile;
      }
    | undefined
  > {
    const demoFiles = await FileProvider.getFiles();
    const executingFile = await DemoRunner.getExecutedDemoFile();

    const itemPath = item instanceof Uri ? item.fsPath : item?.demoFilePath;

    if (item && itemPath) {
      if (!demoFiles) {
        Notifications.warning('No demo files found');
        return;
      }

      const demoFile = await FileProvider.getFile(Uri.file(itemPath));
      if (!demoFile) {
        const demoFileName = itemPath.split('/').pop();
        Notifications.warning(`No demo file found with the name ${demoFileName}`);
        return;
      }

      if (executingFile.filePath !== itemPath) {
        executingFile.filePath = itemPath;
        executingFile.demo = [];
        await DemoRunner.setExecutedDemoFile(executingFile);
      }
      return {
        filePath: itemPath,
        demo: demoFile,
      };
    } else if (!executingFile.filePath && !item && demoFiles) {
      let demoFilePath = undefined;
      if (demoFiles && Object.keys(demoFiles).length === 1) {
        demoFilePath = Object.keys(demoFiles)[0];
      } else {
        const demoFile = await FileProvider.demoQuickPick();
        if (!demoFile?.demo) {
          return;
        }

        demoFilePath = demoFile.filePath;
      }

      executingFile.filePath = demoFilePath;
      executingFile.demo = [];
      await DemoRunner.setExecutedDemoFile(executingFile);

      if (triggerFirstDemo) {
        await commands.executeCommand(COMMAND.start);
      }

      return {
        filePath: demoFilePath,
        demo: demoFiles[demoFilePath],
      };
    } else if (executingFile.filePath && !item && demoFiles) {
      const demoFile = demoFiles[executingFile.filePath];
      if (!demoFile) {
        Notifications.warning('No demo file found');
        return;
      }

      return {
        filePath: executingFile.filePath,
        demo: demoFile,
      };
    }

    return;
  }
}
