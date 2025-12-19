import { PresenterView } from '../presenterView/PresenterView';
import { ContextKeys, StateKeys } from '../constants';
import { Subscription } from '../models';
import {
  Position,
  Range,
  Selection,
  TextEditor,
  TextEditorRevealType,
  Uri,
  WorkspaceFolder,
  commands,
  env,
  window,
  workspace,
} from 'vscode';
import { DemoPanel } from '../panels/DemoPanel';
import {
  getVariables,
  getFileContents,
  getPositionAndRange,
  insertVariables,
  sleep,
  getNextDemoFile,
  getPreviousDemoFile,
  removeDemoDuplicates,
  writeText,
  getUserInput,
  clearVariablesState,
  setContext,
  writeFile,
  updateConfig,
  togglePresentationView,
  removeDemosForCurrentPosition,
  saveFiles,
} from '../utils';
import { ActionTreeItem } from '../providers/ActionTreeviewProvider';
import {
  DecoratorService,
  Notifications,
  Logger,
  NotesService,
  ScriptExecutor,
  StateManager,
  DemoStatusBar,
  ExternalAppsService,
  TerminalService,
  ChatActionsService,
  TextTypingService,
  FileActionService,
  InteractionService,
  DemoFileProvider,
  Extension,
  EngageTimeService,
  SelectionService,
  MacOSActionsService,
} from './';
import { Preview } from '../preview/Preview';
import { parse as jsonParse } from 'jsonc-parser';
import {
  COMMAND,
  WebViewMessages,
  Config,
  Action,
  Demo,
  DemoFileCache,
  DemoConfig,
  IImagePreview,
  ISlidePreview,
  Step,
  Version,
} from '@demotime/common';
import { InputService } from './InputService';
import { backupVSCodeSettings } from '../utils/backupVSCodeSettings';
import { restoreVSCodeSettings } from '../utils/restoreVSCodeSettings';
import { ScreenshotService } from './ScreenshotService';

const DEFAULT_START_VALUE = {
  filePath: '',
  version: 2 as Version,
  demo: [],
};

export class DemoRunner {
  private static isPresentationMode = false;
  private static crntFilePath: string | undefined;
  private static crntHighlightRange: Range | undefined;
  private static crntZoom: number | undefined;
  private static crntHighlightWholeLine: boolean | undefined;
  public static currentDemo: Demo | undefined;
  private static nextStepIsHighlight = false;

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
      await commands.executeCommand(COMMAND.resetCountdown);
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
    ScreenshotService.clearCache();
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

    // Filter out disabled demos for presentation mode
    // if (DemoRunner.isPresentationMode) {
    //   demos = demos.filter((d) => !d.disabled);
    // }

    if (demos.length <= 0) {
      Notifications.error('No demo steps found');
      return;
    }

    // Get the first demo step to start
    const lastDemo = executingFile.demo[executingFile.demo.length - 1];
    const lastDemoIdx = !lastDemo
      ? -1
      : demos.findIndex((d, idx) => (d.id ? d.id === lastDemo.id : idx === lastDemo.idx));

    // Find the next enabled demo and update nextDemoIdx accordingly
    let nextDemoIdx = lastDemoIdx + 1;
    let nextDemo: Demo | undefined = undefined;
    for (nextDemoIdx; nextDemoIdx < demos.length; nextDemoIdx++) {
      if (!demos[nextDemoIdx].disabled) {
        nextDemo = demos[nextDemoIdx];
        break;
      }
    }

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
      executingFile.version = nextFile.version;

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

    // Check if the next demo contains Highlight actions
    let followingDemoIdx = nextDemoIdx + 1;
    while (followingDemoIdx < demos.length && demos[followingDemoIdx].disabled) {
      followingDemoIdx++;
    }

    await DemoRunner.runSteps(demoSteps);

    DemoRunner.nextStepIsHighlight =
      followingDemoIdx < demos.length &&
      !!demos[followingDemoIdx].steps?.some((s: Step) => s.action === Action.Highlight);

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

    const demoFile = await DemoFileProvider.getFile(Uri.file(filePath));
    const demos = demoFile?.demos || [];

    if (demos.length <= 0) {
      Notifications.error('No demo steps found');
      return;
    }

    // Get the previous demo step to start
    const lastDemo = executingFile.demo[executingFile.demo.length - 1];
    const demoIdxToRun = !lastDemo ? -1 : lastDemo.idx;
    // Find the previous enabled demo step
    let previousDemoIdx = demoIdxToRun - 1;
    let previousDemo: Demo | null = null;
    while (previousDemoIdx >= 0) {
      if (!demos[previousDemoIdx].disabled) {
        previousDemo = demos[previousDemoIdx];
        break;
      }
      previousDemoIdx--;
    }

    if (previousDemoIdx < 0 || !previousDemo) {
      const previousFile = await getPreviousDemoFile({
        filePath,
      });
      if (!previousFile) {
        Notifications.infoWithProgress('No previous demo steps found');
        return;
      }

      executingFile.filePath = previousFile.filePath;
      executingFile.demo = [];
      executingFile.version = previousFile.version;

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

      const demoFile = await DemoFileProvider.getFile(Uri.file(demoToRun.filePath));
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
    const demoFiles = await DemoFileProvider.getFiles();
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

    // If in the same file and the demo appears before the last performed action, remove all actions after this demo
    if (executingFile.filePath === filePath && executingFile.demo.length > 0) {
      const lastDemo = executingFile.demo[executingFile.demo.length - 1];
      if (lastDemo && typeof lastDemo.idx === 'number' && demoIdx < lastDemo.idx) {
        // Remove all actions after demoIdx
        executingFile.demo = executingFile.demo.filter(
          (d) => typeof d.idx === 'number' && d.idx <= demoIdx,
        );
      }
    }

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
  public static async runSteps(
    demoSteps: Step[],
    needsUpdate: boolean = true,
    crntFilePath: string | undefined = undefined,
  ): Promise<void> {
    // Unselect the current selection
    DecoratorService.unselect(undefined, !DemoRunner.nextStepIsHighlight);

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
    for (let currentIndex = 0; currentIndex < stepsToExecute.length; currentIndex++) {
      const step = stepsToExecute[currentIndex];
      await DemoRunner.runStep(step, variables, workspaceFolder, crntFilePath);
    }

    if (needsUpdate) {
      DemoPanel.update();
    }
  }

  public static async runStep(
    step: Step,
    variables: { [key: string]: any } | undefined,
    workspaceFolder: WorkspaceFolder,
    crntFilePath: string | undefined,
  ): Promise<void> {
    if (!step.action) {
      return;
    }

    // Verify if the current step has a `STATE_`, `SCRIPT_`, or `DT_` variable which needs to be updated
    // This can happen when the `setState` action is used during the current demo execution (previous step)
    let stepJson = JSON.stringify(step);
    if (
      (stepJson.includes(StateKeys.prefix.state) ||
        stepJson.includes(StateKeys.prefix.script) ||
        stepJson.includes(StateKeys.prefix.clipboard)) &&
      variables
    ) {
      if (stepJson.includes(StateKeys.prefix.clipboard)) {
        variables[StateKeys.prefix.clipboard] = await env.clipboard.readText();
      }
      stepJson = await insertVariables(stepJson, variables, false);
      step = jsonParse(stepJson);
    }

    // Check if the step is disabled
    if (step.disabled) {
      return;
    }

    // GitHub Copilot actions
    if (step.action === Action.OpenChat) {
      await ChatActionsService.openChat();
      return;
    } else if (step.action === Action.NewChat) {
      await ChatActionsService.newChat();
      return;
    } else if (step.action === Action.AskChat) {
      await ChatActionsService.askChat(step);
      return;
    } else if (step.action === Action.EditChat) {
      await ChatActionsService.editChat(step);
      return;
    } else if (step.action === Action.AgentChat) {
      await ChatActionsService.agentChat(step);
      return;
    } else if (step.action === Action.CustomChat) {
      await ChatActionsService.customChat(step);
      return;
    } else if (step.action === Action.CloseChat) {
      await ChatActionsService.closeChat();
      return;
    } else if (step.action === Action.CancelChat) {
      await ChatActionsService.cancelChat();
      return;
    }

    // Demo Time actions
    if (step.action === Action.RunDemoById) {
      if (!step.id) {
        Notifications.error('No demo id specified');
        return;
      }
      await DemoRunner.runById(step.id);
      return;
    }

    // macOS specific actions
    if (step.action === Action.EnableFocusMode) {
      await MacOSActionsService.enableFocusMode();
      return;
    } else if (step.action === Action.DisableFocusMode) {
      await MacOSActionsService.disableFocusMode();
      return;
    } else if (step.action === Action.HideMenubar) {
      await MacOSActionsService.hideMenubar();
      return;
    } else if (step.action === Action.ShowMenubar) {
      await MacOSActionsService.showMenubar();
      return;
    }

    // Wait for the specified timeout
    if (step.action === Action.WaitForTimeout) {
      await sleep(step.timeout || 1000);
      return;
    } else if (step.action === Action.WaitForInput) {
      const answer = await getUserInput('Press any key to continue', step.message);
      if (answer === undefined) {
        return;
      }
      return;
    } else if (step.action === Action.Pause) {
      await InputService.pause();
    }

    // Open external applications
    if (step.action === Action.OpenPowerPoint) {
      try {
        await ExternalAppsService.openPowerPoint();
      } catch (error) {
        Notifications.error(`Failed to open PowerPoint: ${(error as Error).message}`);
      }
      return;
    } else if (step.action === Action.OpenKeynote) {
      try {
        await ExternalAppsService.openKeynote();
      } catch (error) {
        Notifications.error(`Failed to open Keynote: ${(error as Error).message}`);
      }
      return;
    }

    // Update settings
    if (step.action === Action.BackupSettings) {
      await backupVSCodeSettings();
      return;
    }

    if (step.action === Action.RestoreSettings) {
      await restoreVSCodeSettings();
      return;
    }

    if (step.action === Action.SetSetting) {
      if (!step.setting || !step.setting.key) {
        Notifications.error('No setting key or value specified');
        return;
      }

      const { key, value } = step.setting;
      await updateConfig(key, value === null ? undefined : value);
      return;
    }

    if (step.action === Action.SetTheme) {
      if (!step.theme) {
        Notifications.error('No theme specified');
        return;
      }

      await updateConfig('workbench.colorTheme', step.theme);
      return;
    }

    if (step.action === Action.UnsetTheme) {
      await updateConfig('workbench.colorTheme', null);
      return;
    }

    if (step.action === Action.SetPresentationView) {
      await togglePresentationView(true);
      return;
    }

    if (step.action === Action.UnsetPresentationView) {
      await togglePresentationView(false);
      return;
    }

    // Set state
    if (step.action === Action.SetState) {
      if (!step.state || !step.state.key || !step.state.value) {
        Notifications.error('No state key or value specified');
        return;
      }

      await StateManager.update(`${StateKeys.prefix.state}${step.state.key}`, step.state.value);
      return;
    }

    const fileUri = step.path ? Uri.joinPath(workspaceFolder.uri, step.path) : undefined;

    // Execute the specified VSCode command
    if (step.action === Action.ExecuteVSCodeCommand) {
      if (!step.command) {
        Notifications.error('No command specified');
        return;
      }

      if (fileUri) {
        await commands.executeCommand(step.command, fileUri);
        return;
      }

      await commands.executeCommand(step.command, step.args);
      return;
    }

    if (step.action === Action.ShowInfoMessage) {
      if (!step.message) {
        Notifications.error('No message specified');
        return;
      }

      window.showInformationMessage(step.message);
      return;
    }

    if (step.action === Action.OpenWebsite) {
      if (!step.url) {
        Notifications.error('No URL specified');
        return;
      }

      // By default open in the Simple Browser, unless specified otherwise
      if (typeof step.openInVSCode === 'undefined' || step.openInVSCode) {
        await commands.executeCommand('simpleBrowser.show', Uri.parse(step.url));
      } else {
        await commands.executeCommand('vscode.open', Uri.parse(step.url));
        return;
      }
    }

    // Open a new terminal
    if (step.action === Action.OpenTerminal) {
      await TerminalService.openTerminal(step.terminalId);
      return;
    }

    // Run the specified terminal command
    if (step.action === Action.ExecuteTerminalCommand) {
      await TerminalService.executeCommand(step);
      return;
    }

    // Run the specified terminal command
    if (step.action === Action.CloseTerminal) {
      await TerminalService.closeTerminal(step.terminalId);
      return;
    }

    if (step.action === Action.ExecuteScript) {
      await ScriptExecutor.run(step);
      return;
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
      return;
    }

    if (step.action === Action.Format) {
      await commands.executeCommand('editor.action.formatDocument');
      return;
    }

    if (step.action === Action.Save) {
      await saveFiles();
      return;
    }

    if (step.action === Action.Close) {
      await commands.executeCommand('workbench.action.closeActiveEditor');
      return;
    }

    if (step.action === Action.CloseAll) {
      await commands.executeCommand('workbench.action.closeAllEditors');
      return;
    }

    if (step.action === Action.TypeText) {
      await InteractionService.typeText(step.content, step.insertTypingSpeed);
      return;
    }

    if (step.action === Action.PressEnter) {
      await InteractionService.pressEnter();
      return;
    }

    if (step.action === Action.PressTab) {
      await InteractionService.pressTab();
      return;
    }

    if (step.action === Action.PressArrowLeft) {
      await InteractionService.pressArrowLeft();
      return;
    }

    if (step.action === Action.PressArrowRight) {
      await InteractionService.pressArrowRight();
      return;
    }

    if (step.action === Action.PressArrowUp) {
      await InteractionService.pressArrowUp();
      return;
    }

    if (step.action === Action.PressArrowDown) {
      await InteractionService.pressArrowDown();
      return;
    }

    if (step.action === Action.PressEscape) {
      await InteractionService.pressEscape();
      return;
    }

    if (step.action === Action.PressBackspace) {
      await InteractionService.pressBackspace();
      return;
    }

    if (step.action === Action.PressDelete) {
      await InteractionService.pressDelete();
      return;
    }

    if (step.action === Action.CopyToClipboard) {
      await InteractionService.copyToClipboard({
        content: step.content,
        contentPath: step.contentPath,
        variables,
        workspaceFolder,
      });
      return;
    }

    if (step.action === Action.CopyFromSelection) {
      await InteractionService.copyFromSelection();
      return;
    }

    if (step.action === Action.PasteFromClipboard) {
      await InteractionService.pasteFromClipboard();
      return;
    }

    if (step.action === Action.Unselect) {
      await DemoRunner.unselect();
      return;
    }

    /**
     * EngageTime actions
     */
    if (step.action.includes('EngageTime')) {
      const crntDemoConfig = crntFilePath || (await DemoRunner.getExecutedDemoFile()).filePath;
      const crntDemoFile = await DemoFileProvider.getFile(Uri.file(crntDemoConfig));
      if (step.action === Action.StartEngageTimeSession) {
        await EngageTimeService.startSession(crntDemoFile?.engageTime?.sessionId);
        return;
      }

      if (step.action === Action.CloseEngageTimeSession) {
        await EngageTimeService.stopSession(crntDemoFile?.engageTime?.sessionId);
        return;
      }

      if (step.action === Action.StartEngageTimePoll) {
        await EngageTimeService.startPoll(step.pollId);
        return;
      }

      if (step.action === Action.CloseEngageTimePoll) {
        await EngageTimeService.stopPoll(step.pollId);
        return;
      }

      if (step.action === Action.ShowEngageTimeSession) {
        await EngageTimeService.showSession(crntDemoFile?.engageTime?.sessionId);
        return;
      }

      if (step.action === Action.ShowEngageTimePoll) {
        await EngageTimeService.showPoll(step.pollId, step.startOnOpen);
        return;
      }

      if (step.action === Action.SendEngageTimeMessage) {
        await EngageTimeService.sendMessage(
          crntDemoFile?.engageTime?.sessionId,
          step.type,
          step.title,
          step.message,
        );
        return;
      }
    }

    /**
     * All the following actions require a file path.
     */
    if (!fileUri) {
      return;
    }

    if (step.action === Action.ImagePreview) {
      const { path, theme } = step as IImagePreview;
      Preview.show(path as string, theme);
      return;
    }

    if (step.action === Action.OpenSlide) {
      const { path } = step as ISlidePreview;
      Preview.setCurrentSlideIndex(0); // Reset the slide index
      Preview.show(path as string, undefined, step.slide);
      return;
    }

    if (step.action === Action.Open) {
      FileActionService.open(fileUri, typeof step.focusTop === 'undefined' || step.focusTop);
      return;
    }

    if (step.action === Action.MarkdownPreview) {
      await commands.executeCommand('markdown.showPreview', fileUri);
      return;
    }

    if (step.action === Action.Copy) {
      FileActionService.copy(workspaceFolder, fileUri, step);
      return;
    }

    if (step.action === Action.Move || step.action === Action.Rename) {
      FileActionService.rename(workspaceFolder, fileUri, step);
      return;
    }

    if (step.action === Action.DeleteFile) {
      await FileActionService.delete(fileUri);
      return;
    }

    let content = step.content || '';
    if (step.contentPath) {
      const fileContent = await getFileContents(workspaceFolder, step.contentPath);
      if (typeof fileContent !== 'string') {
        return;
      }
      content = fileContent;
    }

    if (step.action === Action.Create) {
      await writeFile(fileUri, content);
      return;
    }

    if (step.action === Action.ApplyPatch) {
      await TextTypingService.applyPatch(fileUri, content, step);
      return;
    }

    const editor = await workspace.openTextDocument(fileUri);
    const textEditor = await window.showTextDocument(editor);

    const { crntPosition, crntRange, usesPlaceholders } = await getPositionAndRange(editor, step);

    if (step.action === Action.Highlight && (crntRange || crntPosition)) {
      let highlightWholeLine = step.highlightWholeLine;
      if (usesPlaceholders) {
        highlightWholeLine =
          typeof step.highlightWholeLine === 'undefined' ? true : step.highlightWholeLine;
      } else if (crntRange && step.position) {
        // If the position is "0,0:0,0" format, turn off highlightWholeLine
        if (
          typeof step.position === 'string' &&
          /^\d+,\d+:\d+,\d+$/.test(step.position.replace(/\s/g, ''))
        ) {
          highlightWholeLine = false;
        }
      }

      await DemoRunner.highlight(
        textEditor,
        crntRange,
        crntPosition,
        step.zoom,
        highlightWholeLine,
        true,
        DemoRunner.nextStepIsHighlight,
      );
      return;
    }

    if (step.action === Action.Selection && (crntRange || crntPosition)) {
      await SelectionService.select(textEditor, crntRange, crntPosition, step.zoom);
      return;
    }

    // Code actions
    if (step.action === Action.Insert) {
      await TextTypingService.insert(textEditor, editor, fileUri, content, crntPosition, step);
      return;
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
      return;
    }

    if (step.action === Action.Replace) {
      await TextTypingService.replace(
        textEditor,
        editor,
        fileUri,
        content,
        crntRange,
        crntPosition,
        step,
      );
      return;
    }

    if (step.action === Action.PositionCursor) {
      if (crntPosition) {
        textEditor.revealRange(
          new Range(crntPosition, crntPosition),
          TextEditorRevealType.InCenter,
        );
        textEditor.selection = new Selection(crntPosition, crntPosition);
      }
      return;
    }

    if (step.action === Action.Delete) {
      await TextTypingService.delete(editor, fileUri, crntRange, crntPosition);
      return;
    }
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
   * @param zoomLevel - The zoom level to apply.
   * @param highlightWholeLine - Whether to highlight the whole line.
   * @param keepInMemory - Whether to keep the highlight in memory.
   * @param preserveZoom - Whether to preserve the current zoom level when moving to the next highlight.
   */
  public static async highlight(
    textEditor: TextEditor,
    range: Range | undefined,
    position: Position | undefined,
    zoomLevel?: number,
    highlightWholeLine?: boolean,
    keepInMemory = true,
    preserveZoom = false,
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

    if (highlightWholeLine === undefined) {
      highlightWholeLine = true;
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

      DecoratorService.hightlightLines(
        textEditor,
        range,
        zoomLevel,
        highlightWholeLine,
        preserveZoom,
      );
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
    }
  }

  /**
   * Unselects the current selection in the given text editor.
   * @param textEditor The text editor to perform the unselect operation on.
   */
  private static async unselect(textEditor?: TextEditor): Promise<void> {
    DecoratorService.unselect(textEditor);
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
        demo: DemoConfig;
        version?: Version;
      }
    | undefined
  > {
    const demoFiles = await DemoFileProvider.getFiles();
    const executingFile = await DemoRunner.getExecutedDemoFile();

    const itemPath = item instanceof Uri ? item.fsPath : item?.demoFilePath;

    if (item && itemPath) {
      if (!demoFiles) {
        Notifications.warning('No demo files found');
        return;
      }

      const demoFile = await DemoFileProvider.getFile(Uri.file(itemPath));
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
        const demoFile = await DemoFileProvider.demoQuickPick();
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
