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
  if (action === Action.openPowerPoint) {
    return {
      action: Action.openPowerPoint,
    };
  }

  if (action === Action.openKeynote) {
    return {
      action: Action.openKeynote,
    };
  }

  /**
   * GitHub Copilot actions
   */
  if (action === Action.openChat) {
    return {
      action: Action.openChat,
    };
  }
  if (action === Action.newChat) {
    return {
      action: Action.newChat,
    };
  }
  if (action === Action.askChat) {
    return {
      action: Action.askChat,
      message: '',
    };
  }
  if (action === Action.editChat) {
    return {
      action: Action.editChat,
      message: '',
    };
  }
  if (action === Action.agentChat) {
    return {
      action: Action.agentChat,
      message: '',
    };
  }
  if (action === Action.closeChat) {
    return {
      action: Action.closeChat,
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

  // Demo Time actions
  if (action === Action.RunDemoById) {
    return {
      action: Action.RunDemoById,
      id: '',
    };
  }

  return;
};
