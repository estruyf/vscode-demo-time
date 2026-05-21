import { StateKeys } from '../constants';
import { Preview } from '../preview/Preview';
import {
  getFileContents,
  getPositionAndRange,
  getUserInput,
  insertVariables,
  resolveOpenWebsiteUrl,
  saveFiles,
  sleep,
  togglePresentationView,
  updateConfig,
  writeFile,
  writeText,
} from '../utils';
import {
  ChatActionsService,
  DemoFileProvider,
  DesktopActionsService,
  EngageTimeService,
  ExternalAppsService,
  FileActionService,
  InputService,
  InteractionService,
  Notifications,
  ScriptExecutor,
  SelectionService,
  StateManager,
  TerminalService,
  TextTypingService,
  ZoomService,
  MacOSActionsService,
} from './';
import { backupVSCodeSettings } from '../utils/backupVSCodeSettings';
import { restoreVSCodeSettings } from '../utils/restoreVSCodeSettings';
import { parse as jsonParse } from 'jsonc-parser';
import {
  Action,
  DemoFileCache,
  IImagePreview,
  ISlidePreview,
  Step,
} from '@demotime/common';
import {
  commands,
  env,
  Position,
  Range,
  Selection,
  TextEditor,
  TextEditorRevealType,
  Uri,
  window,
  workspace,
  WorkspaceFolder,
} from 'vscode';

export interface DemoStepExecutionContext {
  variables: { [key: string]: any } | undefined;
  workspaceFolder: WorkspaceFolder;
  currentFilePath: string | undefined;
  nextStepIsHighlight: boolean;
  runById: (id: string) => Promise<void>;
  highlight: (
    textEditor: TextEditor,
    range: Range | undefined,
    position: Position | undefined,
    zoomLevel?: number,
    highlightWholeLine?: boolean,
    keepInMemory?: boolean,
    preserveZoom?: boolean,
    highlightBlur?: number,
    highlightOpacity?: number,
  ) => Promise<void>;
  unselect: (textEditor?: TextEditor) => Promise<void>;
  getExecutedDemoFile: () => Promise<DemoFileCache>;
}

export class DemoActionDispatcher {
  public static async runStep(step: Step, context: DemoStepExecutionContext): Promise<void> {
    if (!step.action) {
      return;
    }

    const { variables, workspaceFolder } = context;

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
        Notifications.error('No scene id specified');
        return;
      }
      await context.runById(step.id);
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
    } else if (step.action === Action.MuteVolume) {
      await MacOSActionsService.muteVolume();
      return;
    } else if (step.action === Action.UnmuteVolume) {
      await MacOSActionsService.unmuteVolume();
      return;
    } else if (step.action === Action.EnableCaffeine) {
      await MacOSActionsService.enableCaffeine(step.duration as number | undefined);
      return;
    } else if (step.action === Action.DisableCaffeine) {
      await MacOSActionsService.disableCaffeine();
      return;
    } else if (step.action === Action.HideDock) {
      await MacOSActionsService.hideDock();
      return;
    } else if (step.action === Action.ShowDock) {
      await MacOSActionsService.showDock();
      return;
    } else if (step.action === Action.HideDesktopIcons) {
      await DesktopActionsService.hideDesktopIcons();
      return;
    } else if (step.action === Action.ShowDesktopIcons) {
      await DesktopActionsService.showDesktopIcons();
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

      const resolvedUrl = resolveOpenWebsiteUrl(step.url, workspaceFolder);

      // By default open in external browser, unless openInVSCode is true
      if (typeof step.openInVSCode !== 'undefined' && step.openInVSCode) {
        await commands.executeCommand('workbench.action.browser.open', resolvedUrl);
        return;
      } else {
        await commands.executeCommand('vscode.open', Uri.parse(resolvedUrl));
        return;
      }
    }

    // QR code preview actions
    if (step.action === Action.ShowQR) {
      if (!step.url) {
        Notifications.error('No URL specified for showQR action');
        return;
      }

      const qrTitle = step.title;
      const qrDescription = step.description;
      const qrTopText = step.topText;
      const qrLogo = step.logo;
      const qrLayout = step.qrLayout;

      await Preview.showQr({
        url: step.url,
        topText: qrTopText,
        title: qrTitle,
        description: qrDescription,
        logo: qrLogo,
        qrLayout,
      });
    }

    if (step.action === Action.ClosePreview || step.action === Action.HideQR) {
      Preview.close();
      return;
    }

    // Zoom actions
    if (step.action === Action.ZoomIn) {
      await ZoomService.zoomIn(step.zoom);
      return;
    }

    if (step.action === Action.ZoomOut) {
      await ZoomService.zoomOut(step.zoom);
      return;
    }

    if (step.action === Action.ZoomReset) {
      await ZoomService.zoomReset();
      return;
    }

    if (step.action === Action.EnableZenMode) {
      await commands.executeCommand('workbench.action.exitZenMode');
      await commands.executeCommand('workbench.action.toggleZenMode');
      return;
    }

    if (step.action === Action.DisableZenMode) {
      await commands.executeCommand('workbench.action.exitZenMode');
      return;
    }

    // Open a new terminal
    if (step.action === Action.OpenTerminal) {
      await TerminalService.openTerminal(step.terminalId);
      return;
    }

    if (step.action === Action.FocusTerminal) {
      await TerminalService.focusTerminal();
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

    if (step.action === Action.SendKeybinding) {
      await InteractionService.pressKeybinding(step.keybinding);
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
      await context.unselect();
      return;
    }

    /**
     * EngageTime actions
     */
    if (step.action.includes('EngageTime')) {
      const currentDemoConfig = context.currentFilePath || (await context.getExecutedDemoFile()).filePath;
      const currentDemoFile = await DemoFileProvider.getFile(Uri.file(currentDemoConfig));
      if (step.action === Action.StartEngageTimeSession) {
        await EngageTimeService.startSession(currentDemoFile?.engageTime?.sessionId);
        return;
      }

      if (step.action === Action.CloseEngageTimeSession) {
        await EngageTimeService.stopSession(currentDemoFile?.engageTime?.sessionId);
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
        await EngageTimeService.showSession(currentDemoFile?.engageTime?.sessionId);
        return;
      }

      if (step.action === Action.ShowEngageTimePoll) {
        await EngageTimeService.showPoll(step.pollId, step.startOnOpen, step.closeOnOpen);
        return;
      }

      if (step.action === Action.SendEngageTimeMessage) {
        await EngageTimeService.sendMessage(
          currentDemoFile?.engageTime?.sessionId,
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

      await context.highlight(
        textEditor,
        crntRange,
        crntPosition,
        step.zoom,
        highlightWholeLine,
        true,
        context.nextStepIsHighlight,
        step.highlightBlur,
        step.highlightOpacity,
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
}
