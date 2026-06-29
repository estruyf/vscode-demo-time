import { PresenterView } from '../presenterView/PresenterView';
import { ContextKeys, General, StateKeys } from '../constants';
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
  window,
} from 'vscode';
import { DemoPanel } from '../panels/DemoPanel';
import {
  getVariables,
  getFileContents,
  insertVariables,
  getNextDemoFile,
  getPreviousDemoFile,
  removeDemoDuplicates,
  clearVariablesState,
  setContext,
  removeDemosForCurrentPosition,
  parseSnippetContent,
} from '../utils';
import { ActionTreeItem } from '../providers/ActionTreeviewProvider';
import {
  DecoratorService,
  Notifications,
  Logger,
  NotesService,
  TextTypingService,
  DemoFileProvider,
  Extension,
  AnalyticsService,
  AnalyticsCommands,
  SponsorService,
  RedactionService,
  DemoActionDispatcher,
  DemoAutoProceedService,
} from './';
import { DemoStatusBar } from './DemoStatusBar';
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
  Step,
  Version,
  getDemosFromConfig,
  normalizeDemoConfig,
} from '@demotime/common';
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
  private static currentDemoIndex: number = 0;
  private static currentStepIndex: number = 0;

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
    subscriptions.push(commands.registerCommand(COMMAND.runSingleMove, DemoRunner.runSingleMove));
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
    subscriptions.push(
      commands.registerCommand(COMMAND.toggleAutoProceed, DemoRunner.toggleAutoProceed),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.pauseAutoProceed, () =>
        DemoRunner.setAutoProceedPaused(true),
      ),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.resumeAutoProceed, () =>
        DemoRunner.setAutoProceedPaused(false),
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
   * Retrieves the executed act file.
   * @returns {Promise<DemoFileCache>} The executed act file.
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
   * Sets the executed act file in the extension state.
   * @param demoFile - The act file to be set as executed.
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

  public static getIsAutoProceedPaused(): boolean {
    return DemoAutoProceedService.getIsAutoProceedPaused();
  }

  public static getIsAutoProceedActive(): boolean {
    return DemoAutoProceedService.getIsAutoProceedActive();
  }

  public static getIsLoopEnabled(): boolean {
    return DemoAutoProceedService.getIsLoopEnabled();
  }

  public static getAutoProceedCountdown(): number {
    return DemoAutoProceedService.getAutoProceedCountdown();
  }

  public static async onSlideIndexUpdated(_slideIndex: number): Promise<void> {
    await DemoAutoProceedService.onSlideIndexUpdated(DemoRunner.currentDemo);
  }

  private static async syncAutoProceedForCurrentDemo(): Promise<void> {
    await DemoAutoProceedService.syncAutoProceedForDemo(DemoRunner.currentDemo);
  }

  private static async setAutoProceedPaused(paused: boolean): Promise<void> {
    await DemoAutoProceedService.setAutoProceedPaused(paused, DemoRunner.currentDemo);
  }

  private static async toggleAutoProceed(): Promise<void> {
    await DemoAutoProceedService.toggleAutoProceed(DemoRunner.currentDemo);
  }

  /**
   * Retrieves the current version of the executing act file.
   *
   * @param filePathOrUri - Optional file path or URI to check for version (useful for custom editors)
   * @returns {Version} The detected version of the current act file.
   */
  public static async getCurrentVersion(filePathOrUri?: string | Uri): Promise<Version> {
    // First, try to get version from the provided file path/URI
    if (filePathOrUri) {
      const uri = typeof filePathOrUri === 'string' ? Uri.file(filePathOrUri) : filePathOrUri;
      if (uri.fsPath && uri.fsPath.includes(`/${General.demoFolder}/`)) {
        const demoFile = await DemoFileProvider.getFile(uri);
        if (demoFile && demoFile.version) {
          return demoFile.version;
        }
      }
    }

    // Fall back to active text editor
    const editor = window.activeTextEditor;
    const crntOpenFileUri = editor?.document.uri;
    if (crntOpenFileUri?.fsPath && crntOpenFileUri.fsPath.includes(`/${General.demoFolder}/`)) {
      const demoFile = await DemoFileProvider.getFile(crntOpenFileUri);
      if (demoFile && demoFile.version) {
        return demoFile.version;
      }
    }

    const executingFile = Extension.getInstance().getState<DemoFileCache>(
      StateKeys.executingDemoFile,
    );
    if (!executingFile) {
      return 3;
    }

    const lastDemo = executingFile.demo[executingFile.demo.length - 1];
    if (!lastDemo) {
      return 3;
    }

    // Only old act file without a version property should be version 1
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
      await AnalyticsCommands.startRecording();
      RedactionService.enable();
      DemoPanel.updateMessage('Presentation mode enabled');
      await DemoRunner.getDemoFile(undefined, true);
      Preview.postMessage(WebViewMessages.toWebview.updateIsInPresentationMode, true);
    } else {
      await AnalyticsCommands.stopRecording();
      RedactionService.disable();
      DemoPanel.updateMessage();
      Preview.postMessage(WebViewMessages.toWebview.updateIsInPresentationMode, false);
      await commands.executeCommand(COMMAND.resetCountdown);
    }
    DemoPanel.update();
  }

  /**
   * Resets the DemoRunner state by clearing the executing act file path and demo array.
   */
  private static async reset(): Promise<void> {
    // End any active analytics session
    if (AnalyticsService.isRecording()) {
      await AnalyticsService.endSession();
    }

    await DemoAutoProceedService.resetState();

    const ext = Extension.getInstance();
    const resetContent = Object.assign({}, DEFAULT_START_VALUE);
    await ext.setState(StateKeys.executingDemoFile, resetContent);
    await clearVariablesState();
    PresenterView.postMessage(WebViewMessages.toWebview.updateRunningDemos, resetContent);
    PresenterView.postMessage(WebViewMessages.toWebview.resetNotes, undefined);
    DemoRunner.currentDemo = undefined;
    DemoRunner.currentDemoIndex = 0;
    DemoRunner.currentStepIndex = 0;
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
    if (TextTypingService.IsTyping) {
      Logger.info('DemoRunner.start called while typing. Ignoring.');
      return;
    }

    if (Preview.isListening()) {
      return;
    }

    if (Preview.checkIfHasNextSlide()) {
      if (DemoAutoProceedService.getAutoProceedSource() === 'slide') {
        DemoAutoProceedService.clearAutoProceedTimers();
      }
      await Preview.postMessage(WebViewMessages.toWebview.nextSlide);
      return;
    }

    // Cancel any running auto-proceed timer (manual advance or new scene)
    DemoAutoProceedService.clearAutoProceedTimers();

    const executingFile = await DemoRunner.getExecutedDemoFile();

    const demoFile = await DemoRunner.getDemoFile(item);
    // Normalize ActConfig or DemoConfig -> Demo[] shape for backward compatibility
    const fileDemo = demoFile?.demo;
    DemoAutoProceedService.setLoopEnabled(!!fileDemo?.loop);
    const demos: Demo[] = getDemosFromConfig(fileDemo);

    // Filter out disabled demos for presentation mode
    // if (DemoRunner.isPresentationMode) {
    //   demos = demos.filter((d) => !d.disabled);
    // }

    if (demos.length <= 0) {
      await DemoAutoProceedService.deactivate();
      Notifications.error('No moves found');
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
      // Auto-loop: restart from the first scene if configured
      if (fileDemo?.loop) {
        const enabledDemos = demos.filter((d) => !d.disabled);
        const missingTimings: Demo[] = [];
        for (const demo of enabledDemos) {
          if (!(await DemoAutoProceedService.hasSceneAutoLoopTiming(demo))) {
            missingTimings.push(demo);
          }
        }
        if (missingTimings.length > 0) {
          Notifications.error(
            `Auto-loop blocked: ${missingTimings.length} scene(s) missing 'autoAdvanceAfter': ${missingTimings.map((d) => `"${d.title}"`).join(', ')}`,
          );
          return;
        }
        executingFile.demo = [];
        await DemoRunner.setExecutedDemoFile(executingFile);
        DemoRunner.start(item);
        return;
      }

      await DemoAutoProceedService.deactivate();

      // Check if there is a next act file
      const nextFile = await getNextDemoFile(demoFile);
      if (!nextFile) {
        const yesOrNo = await Notifications.info(
          'No next moves found. Do you want to reset?',
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
      // Start the next act file
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
    DemoRunner.currentDemoIndex = nextDemoIdx;

    // Start analytics session if this is the first demo and analytics is enabled
    if (
      SponsorService.getSponsorStatus() &&
      !AnalyticsService.isRecording() &&
      lastDemoIdx === -1
    ) {
      const config = AnalyticsService.getConfig();
      if (config.enabled) {
        await AnalyticsService.startSession(
          demoFile?.demo.title || 'Presentation',
          true, // Default to dry run, can be changed via command
        );
      }
    }

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

    await DemoRunner.syncAutoProceedForCurrentDemo();
  }

  /**
   * Executes the previous demo step.
   *
   * @returns {Promise<void>} A promise that resolves when the previous demo step has been executed.
   */
  private static async previous(): Promise<void> {
    if (TextTypingService.IsTyping) {
      Logger.info('DemoRunner.previous called while typing. Ignoring.');
      return;
    }

    if (Preview.checkIfHasPreviousSlide()) {
      await Preview.postMessage(WebViewMessages.toWebview.previousSlide);
      return;
    }

    // Cancel any running auto-proceed timer when going back
    await DemoAutoProceedService.deactivate();

    const executingFile = await DemoRunner.getExecutedDemoFile();
    const filePath = executingFile.filePath;
    if (!filePath) {
      return;
    }

    const demoFile = await DemoFileProvider.getFile(Uri.file(filePath));
    const demos = getDemosFromConfig(demoFile);

    if (demos.length <= 0) {
      Notifications.error('No moves found');
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
        Notifications.infoWithProgress('No previous moves found');
        return;
      }

      executingFile.filePath = previousFile.filePath;
      executingFile.demo = [];
      executingFile.version = previousFile.version;

      // Get the last demo step of the previous file
      const prevDemos = getDemosFromConfig(previousFile.demo as any);
      const lastDemo = prevDemos[prevDemos.length - 1];
      const crntIdx = prevDemos.length - 1;
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
    if (TextTypingService.IsTyping) {
      Logger.info('DemoRunner.startDemo called while typing. Ignoring.');
      return;
    }

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

    // Get all the act files
    const demoFiles = await DemoFileProvider.getFiles();
    if (!demoFiles) {
      return;
    }

    // Find the act file that contains the specified id
    let filePath = null;
    for (const crntFilePath in demoFiles) {
      const demos = getDemosFromConfig(demoFiles[crntFilePath] as any);
      const crntDemo = demos.find((demo) => demo.id === id);
      if (crntDemo) {
        filePath = crntFilePath;
        break;
      }
    }

    if (!filePath) {
      Notifications.error('No scene found with the specified id');
      return;
    }

    const executingFile = await DemoRunner.getExecutedDemoFile();
    if (executingFile.filePath !== filePath) {
      executingFile.filePath = filePath;
      executingFile.demo = [];
    }

    // Get the scene idx (normalize ActConfig or DemoConfig -> Demo[])
    const targetFile = demoFiles[filePath];
    const targetDemos: Demo[] = getDemosFromConfig(targetFile as any);

    const demoIdx = targetDemos.findIndex((demo) => demo.id === id);
    if (demoIdx < 0) {
      Notifications.error('No scene found with the specified id');
      return;
    }
    const demoToRun = targetDemos[demoIdx];
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
   * Runs a single move from CodeLens.
   */
  private static async runSingleMove(args: {
    filePath: string;
    sceneIdx: number;
    step: Step;
  }): Promise<void> {
    if (TextTypingService.IsTyping) {
      Logger.info('DemoRunner.runSingleMove called while typing. Ignoring.');
      return;
    }

    if (!args?.step) {
      return;
    }

    await DemoRunner.runSteps([args.step], false);
  }

  /**
   * Runs the given move.
   * @param demoSteps An array of Step objects representing the steps to be executed.
   */
  public static async runSteps(
    demoSteps: Step[],
    needsUpdate: boolean = true,
    crntFilePath: string | undefined = undefined,
  ): Promise<void> {
    if (TextTypingService.IsTyping) {
      Logger.info('DemoRunner.runSteps called while typing. Ignoring.');
      return;
    }

    // End the segment successfully
    if (AnalyticsService.isRecording()) {
      AnalyticsService.endSegment();
    }

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

    // Replace the snippets in the moves
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

          const newSteps = parseSnippetContent(snippet, step.contentPath || '');
          stepsToExecute.push(...newSteps);
        } else {
          stepsToExecute.push(step);
        }
      }
    } else {
      stepsToExecute.push(...demoSteps);
    }

    // Loop over all the moves and execute them.
    for (let currentIndex = 0; currentIndex < stepsToExecute.length; currentIndex++) {
      const step = stepsToExecute[currentIndex];
      DemoRunner.currentStepIndex = currentIndex;

      // Start tracking this step for analytics
      if (AnalyticsService.isRecording() && DemoRunner.currentDemo) {
        const executingFile = await DemoRunner.getExecutedDemoFile();
        const demoFile = await DemoFileProvider.getFile(Uri.file(executingFile.filePath));
        await AnalyticsService.startSegment(
          executingFile.filePath, // Act file path
          demoFile?.title || 'Untitled Act', // Act title
          DemoRunner.currentDemo, // Scene (demo)
          DemoRunner.currentDemoIndex, // Scene index
        );
      }

      try {
        await DemoRunner.runStep(step, variables, workspaceFolder, crntFilePath);
      } catch (error) {
        // Record error in analytics
        if (AnalyticsService.isRecording()) {
          AnalyticsService.recordError(
            'action',
            error instanceof Error ? error.message : String(error),
            `Step ${currentIndex}: ${step.action}`,
          );
          AnalyticsService.endSegment();
        }
        throw error;
      }
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
    if (TextTypingService.IsTyping) {
      Logger.info('DemoRunner.runStep called while typing. Ignoring.');
      return;
    }

    await DemoActionDispatcher.runStep(step, {
      variables,
      workspaceFolder,
      currentFilePath: crntFilePath,
      nextStepIsHighlight: DemoRunner.nextStepIsHighlight,
      runById: DemoRunner.runById,
      highlight: DemoRunner.highlight,
      unselect: DemoRunner.unselect,
      getExecutedDemoFile: DemoRunner.getExecutedDemoFile,
    });
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
   * @param highlightBlur - Optional blur effect for non-highlighted text (overrides global setting).
   * @param highlightOpacity - Optional opacity for non-highlighted text (overrides global setting).
   */
  public static async highlight(
    textEditor: TextEditor,
    range: Range | undefined,
    position: Position | undefined,
    zoomLevel?: number,
    highlightWholeLine?: boolean,
    keepInMemory = true,
    preserveZoom = false,
    highlightBlur?: number,
    highlightOpacity?: number,
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

      // Track highlight in analytics
      if (AnalyticsService.isRecording()) {
        AnalyticsService.recordHighlight(
          textEditor.document.fileName,
          range.start.line + 1, // Convert to 1-based
          range.end.line + 1,
          zoomLevel,
        );
      }

      DecoratorService.hightlightLines(
        textEditor,
        range,
        zoomLevel,
        highlightWholeLine,
        preserveZoom,
        highlightBlur,
        highlightOpacity,
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
   * Retrieves the act file associated with the given ActionTreeItem.
   * @param item The ActionTreeItem representing the act file.
   * @param triggerFirstDemo A boolean indicating whether to trigger the first demo.
   * @returns A Promise that resolves to an object containing the filePath and demo, or undefined if no act file is found.
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
        Notifications.warning('No act files found');
        return;
      }

      const demoFile = await DemoFileProvider.getFile(Uri.file(itemPath));
      if (!demoFile) {
        const demoFileName = itemPath.split('/').pop();
        Notifications.warning(`No act file found with the name ${demoFileName}`);
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
        demo: normalizeDemoConfig(demoFiles[demoFilePath]) || demoFiles[demoFilePath],
      };
    } else if (executingFile.filePath && !item && demoFiles) {
      const demoFile = demoFiles[executingFile.filePath];
      if (!demoFile) {
        Notifications.warning('No act file found');
        return;
      }

      return {
        filePath: executingFile.filePath,
        demo: normalizeDemoConfig(demoFile) || demoFile,
      };
    }

    return;
  }
}
