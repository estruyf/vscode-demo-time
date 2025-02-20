import { QuickPickItem } from "vscode";
import { Action } from "../models";

export const getActionTemplate = (selectedAction: QuickPickItem): any => {
  const action = selectedAction.label;

  /**
   * File actions
   */
  if (action === Action.Open) {
    return {
      action: Action.Open,
      path: "",
    };
  }

  if (action === Action.Create) {
    return {
      action: Action.Create,
      path: "",
      contentPath: "",
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
      path: "",
      dest: "",
      overwrite: false,
    };
  }

  if (action === Action.Copy) {
    return {
      action: Action.Copy,
      path: "",
      dest: "",
      overwrite: false,
    };
  }

  if (action === Action.DeleteFile) {
    return {
      action: Action.DeleteFile,
      path: "",
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
      path: "",
      contentPath: "",
      patch: "",
    };
  }

  /**
   * Markdown actions
   */
  if (action === Action.MarkdownPreview) {
    return {
      action: Action.MarkdownPreview,
      path: "",
    };
  }

  /**
   * Text actions
   */
  if (action === Action.Highlight) {
    return {
      action: Action.Highlight,
      path: "",
      startPlaceholder: "",
      endPlaceholder: "",
    };
  }

  if (action === Action.PositionCursor) {
    return {
      action: Action.PositionCursor,
      path: "",
      position: "",
    };
  }

  if (action === Action.Insert) {
    return {
      action: Action.Insert,
      path: "",
      startPlaceholder: "",
      contentPath: "",
    };
  }

  if (action === Action.Replace) {
    return {
      action: Action.Replace,
      path: "",
      startPlaceholder: "",
      endPlaceholder: "",
      contentPath: "",
    };
  }

  if (action === Action.Write) {
    return {
      action: Action.Write,
      content: "",
      path: "",
      position: "",
    };
  }

  if (action === Action.Unselect) {
    return {
      action: Action.Unselect,
      path: "",
    };
  }

  if (action === Action.Delete) {
    return {
      action: Action.Delete,
      path: "",
      startPlaceholder: "",
      endPlaceholder: "",
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
        key: "",
        value: "",
      },
    };
  }

  /**
   * Terminal actions
   */
  if (action === Action.ExecuteTerminalCommand) {
    return {
      action: Action.ExecuteTerminalCommand,
      command: "",
    };
  }

  if (action === Action.ExecuteScript) {
    return {
      action: Action.ExecuteScript,
      id: "",
      path: "",
      command: "node",
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
      command: "",
    };
  }

  if (action === Action.SetState) {
    return {
      action: Action.SetState,
      state: {
        key: "",
        value: "",
      },
    };
  }

  if (action === Action.ShowInfoMessage) {
    return {
      action: Action.ShowInfoMessage,
      message: "",
    };
  }

  if (action === Action.OpenWebsite) {
    return {
      action: Action.OpenWebsite,
      url: "",
      openInVSCode: false,
    };
  }

  /**
   * Extensibility actions
   */
  if (action === Action.Snippet) {
    return {
      action: Action.Snippet,
      contentPath: "",
      args: {},
    };
  }

  return;
};
