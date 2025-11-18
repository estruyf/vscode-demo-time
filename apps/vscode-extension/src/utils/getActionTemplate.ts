import { Action } from '@demotime/common';
import { QuickPickItem } from 'vscode';

export const getActionTemplate = (selectedAction: QuickPickItem): any => {
  const action = selectedAction.label;

  /**
   * File actions
   */
  if (action === Action.Open) {
    return {
      action: Action.Open,
      path: '',
    };
  }

  if (action === Action.Create) {
    return {
      action: Action.Create,
      path: '',
      contentPath: '',
    };
  }

  if (action === Action.Save) {
    return {
      action: Action.Save,
    };
  }

  if (action === Action.Rename || action === Action.Move) {
    return {
      action: Action.Rename,
      path: '',
      dest: '',
      overwrite: false,
    };
  }

  if (action === Action.Copy) {
    return {
      action: Action.Copy,
      path: '',
      dest: '',
      overwrite: false,
    };
  }

  if (action === Action.DeleteFile) {
    return {
      action: Action.DeleteFile,
      path: '',
    };
  }

  if (action === Action.Close) {
    return {
      action: Action.Close,
    };
  }

  if (action === Action.CloseAll) {
    return {
      action: Action.CloseAll,
    };
  }

  /**
   * Patch actions
   */
  if (action === Action.ApplyPatch) {
    return {
      action: Action.ApplyPatch,
      path: '',
      contentPath: '',
      patch: '',
    };
  }

  /**
   * Preview actions
   */
  if (action === Action.OpenSlide) {
    return {
      action: Action.OpenSlide,
      path: '',
    };
  }

  if (action === Action.MarkdownPreview) {
    return {
      action: Action.MarkdownPreview,
      path: '',
    };
  }

  if (action === Action.ImagePreview) {
    return {
      action: Action.ImagePreview,
      path: '',
    };
  }

  /**
   * Text actions
   */
  if (action === Action.Highlight) {
    return {
      action: Action.Highlight,
      path: '',
      startPlaceholder: '',
      endPlaceholder: '',
    };
  }

  if (action === Action.Selection) {
    return {
      action: Action.Selection,
      path: '',
      startPlaceholder: '',
      endPlaceholder: '',
    };
  }

  if (action === Action.PositionCursor) {
    return {
      action: Action.PositionCursor,
      path: '',
      position: '',
    };
  }

  if (action === Action.Insert) {
    return {
      action: Action.Insert,
      path: '',
      startPlaceholder: '',
      contentPath: '',
    };
  }

  if (action === Action.Replace) {
    return {
      action: Action.Replace,
      path: '',
      startPlaceholder: '',
      endPlaceholder: '',
      contentPath: '',
    };
  }

  if (action === Action.Write) {
    return {
      action: Action.Write,
      content: '',
      path: '',
      position: '',
    };
  }

  if (action === Action.Unselect) {
    return {
      action: Action.Unselect,
      path: '',
    };
  }

  if (action === Action.Delete) {
    return {
      action: Action.Delete,
      path: '',
      startPlaceholder: '',
      endPlaceholder: '',
    };
  }

  if (action === Action.Format) {
    return {
      action: Action.Format,
    };
  }

  /**
   * Settings actions
   */
  if (action === Action.SetSetting) {
    return {
      action: Action.SetSetting,
      setting: {
        key: '',
        value: '',
      },
    };
  }

  if (action === Action.SetTheme) {
    return {
      action: Action.SetTheme,
      theme: '',
    };
  }

  if (action === Action.UnsetTheme) {
    return {
      action: Action.UnsetTheme,
    };
  }

  if (action === Action.SetPresentationView) {
    return {
      action: Action.SetPresentationView,
    };
  }

  if (action === Action.UnsetPresentationView) {
    return {
      action: Action.UnsetPresentationView,
    };
  }

  if (action === Action.BackupSettings) {
    return {
      action: Action.BackupSettings,
    };
  }

  if (action === Action.RestoreSettings) {
    return {
      action: Action.RestoreSettings,
    };
  }

  /**
   * Terminal actions
   */
  if (action === Action.ExecuteTerminalCommand) {
    return {
      action: Action.ExecuteTerminalCommand,
      command: '',
    };
  }

  if (action === Action.OpenTerminal) {
    return {
      action: Action.OpenTerminal,
      terminalId: '',
    };
  }

  if (action === Action.ExecuteScript) {
    return {
      action: Action.ExecuteScript,
      id: '',
      path: '',
      command: 'node',
    };
  }

  if (action === Action.CloseTerminal) {
    return {
      action: Action.CloseTerminal,
    };
  }

  /**
   * Timeout actions
   */
  if (action === Action.WaitForTimeout) {
    return {
      action: Action.WaitForTimeout,
      timeout: 0,
    };
  }

  if (action === Action.WaitForInput) {
    return {
      action: Action.WaitForInput,
    };
  }

  if (action === Action.Pause) {
    return {
      action: Action.Pause,
    };
  }

  /**
   * VSCode actions
   */
  if (action === Action.ExecuteVSCodeCommand) {
    return {
      action: Action.ExecuteVSCodeCommand,
      command: '',
    };
  }

  if (action === Action.SetState) {
    return {
      action: Action.SetState,
      state: {
        key: '',
        value: '',
      },
    };
  }

  if (action === Action.ShowInfoMessage) {
    return {
      action: Action.ShowInfoMessage,
      message: '',
    };
  }

  if (action === Action.OpenWebsite) {
    return {
      action: Action.OpenWebsite,
      url: '',
      openInVSCode: false,
    };
  }

  /**
   * Extensibility actions
   */
  if (action === Action.Snippet) {
    return {
      action: Action.Snippet,
      contentPath: '',
      args: {},
    };
  }

  /**
   * External applications
   */
  if (action === Action.OpenPowerPoint) {
    return {
      action: Action.OpenPowerPoint,
    };
  }

  if (action === Action.OpenKeynote) {
    return {
      action: Action.OpenKeynote,
    };
  }

  /**
   * GitHub Copilot actions
   */
  if (action === Action.OpenChat) {
    return {
      action: Action.OpenChat,
    };
  }
  if (action === Action.NewChat) {
    return {
      action: Action.NewChat,
    };
  }
  if (action === Action.AskChat) {
    return {
      action: Action.AskChat,
      message: '',
    };
  }
  if (action === Action.EditChat) {
    return {
      action: Action.EditChat,
      message: '',
    };
  }
  if (action === Action.AgentChat) {
    return {
      action: Action.AgentChat,
      message: '',
    };
  }
  if (action === Action.CustomChat) {
    return {
      action: Action.CustomChat,
      mode: '',
      message: '',
    };
  }
  if (action === Action.CloseChat) {
    return {
      action: Action.CloseChat,
    };
  }

  // Interaction actions
  if (action === Action.TypeText) {
    return {
      action: Action.TypeText,
      content: '',
    };
  }

  if (action === Action.CopyToClipboard) {
    return {
      action: Action.CopyToClipboard,
      content: '',
    };
  }

  if (action === Action.PasteFromClipboard) {
    return {
      action: Action.PasteFromClipboard,
    };
  }

  if (action === Action.PressEnter) {
    return {
      action: Action.PressEnter,
    };
  }

  if (action === Action.PressTab) {
    return {
      action: Action.PressTab,
    };
  }

  if (action === Action.PressArrowLeft) {
    return {
      action: Action.PressArrowLeft,
    };
  }

  if (action === Action.PressArrowRight) {
    return {
      action: Action.PressArrowRight,
    };
  }

  if (action === Action.PressArrowUp) {
    return {
      action: Action.PressArrowUp,
    };
  }

  if (action === Action.PressArrowDown) {
    return {
      action: Action.PressArrowDown,
    };
  }

  if (action === Action.PressEscape) {
    return {
      action: Action.PressEscape,
    };
  }

  if (action === Action.PressBackspace) {
    return {
      action: Action.PressBackspace,
    };
  }

  if (action === Action.PressDelete) {
    return {
      action: Action.PressDelete,
    };
  }

  // Demo Time actions
  if (action === Action.RunDemoById) {
    return {
      action: Action.RunDemoById,
      id: '',
    };
  }

  // EngageTime actions
  if (action === Action.StartEngageTimeSession) {
    return {
      action: Action.StartEngageTimeSession,
    };
  }

  if (action === Action.StartEngageTimePoll) {
    return {
      action: Action.StartEngageTimePoll,
      pollId: '',
    };
  }

  if (action === Action.CloseEngageTimeSession) {
    return {
      action: Action.CloseEngageTimeSession,
    };
  }

  if (action === Action.CloseEngageTimePoll) {
    return {
      action: Action.CloseEngageTimePoll,
      pollId: '',
    };
  }

  if (action === Action.ShowEngageTimePoll) {
    return {
      action: Action.ShowEngageTimePoll,
      pollId: '',
    };
  }

  if (action === Action.ShowEngageTimeSession) {
    return {
      action: Action.ShowEngageTimeSession,
    };
  }

  if (action === Action.SendEngageTimeMessage) {
    return {
      action: Action.SendEngageTimeMessage,
      type: '',
      title: '',
      message: '',
    };
  }

  return;
};
