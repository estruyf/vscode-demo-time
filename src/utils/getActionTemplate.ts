import { QuickPickItem } from "vscode";
import { Action } from "../models";

export const getActionTemplate = (selectedAction: QuickPickItem): any => {
  const action = selectedAction.label;

  /**
   * File actions
   */
  if (action === Action.Open) {
    return {
      action: "open",
      path: "",
    };
  }

  if (action === Action.Create) {
    return {
      action: "create",
      path: "",
      contentPath: "",
    };
  }

  if (action === Action.Save) {
    return {
      action: "save",
    };
  }

  if (action === Action.Rename || action === Action.Move) {
    return {
      action: "rename",
      path: "",
      dest: "",
      overwrite: false,
    };
  }

  if (action === Action.Copy) {
    return {
      action: "copy",
      path: "",
      dest: "",
      overwrite: false,
    };
  }

  if (action === Action.DeleteFile) {
    return {
      action: "deleteFile",
      path: "",
    };
  }

  if (action === Action.Close) {
    return {
      action: "close",
    };
  }

  if (action === Action.CloseAll) {
    return {
      action: "closeAll",
    };
  }

  /**
   * Patch actions
   */
  if (action === Action.ApplyPatch) {
    return {
      action: "applyPatch",
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
      action: "markdownPreview",
      path: "",
    };
  }

  /**
   * Text actions
   */
  if (action === Action.Highlight) {
    return {
      action: "highlight",
      path: "",
      startPlaceholder: "",
      endPlaceholder: "",
    };
  }

  if (action === Action.PositionCursor) {
    return {
      action: "positionCursor",
      path: "",
      position: "",
    };
  }

  if (action === Action.Insert) {
    return {
      action: "insert",
      path: "",
      startPlaceholder: "",
      contentPath: "",
    };
  }

  if (action === Action.Replace) {
    return {
      action: "replace",
      path: "",
      startPlaceholder: "",
      endPlaceholder: "",
      contentPath: "",
    };
  }

  if (action === Action.Write) {
    return {
      action: "write",
      content: "",
      path: "",
      position: "",
    };
  }

  if (action === Action.Unselect) {
    return {
      action: "unselect",
      path: "<relative path to the file>",
    };
  }

  if (action === Action.Delete) {
    return {
      action: "delete",
      path: "",
      startPlaceholder: "",
      endPlaceholder: "",
    };
  }

  if (action === Action.Format) {
    return {
      action: "format",
    };
  }

  /**
   * Settings actions
   */
  if (action === Action.SetSetting) {
    return {
      action: "setSetting",
      setting: {
        key: "<setting key>",
        value: "<value>",
      },
    };
  }

  /**
   * Terminal actions
   */
  if (action === Action.ExecuteTerminalCommand) {
    return {
      action: "executeTerminalCommand",
      command: "<command to execute>",
    };
  }

  if (action === Action.CloseTerminal) {
    return {
      action: "closeTerminal",
    };
  }

  /**
   * Timeout actions
   */
  if (action === Action.WaitForTimeout) {
    return {
      action: "waitForTimeout",
      duration: 0,
    };
  }

  if (action === Action.WaitForInput) {
    return {
      action: "waitForInput",
    };
  }

  /**
   * VSCode actions
   */
  if (action === Action.ExecuteVSCodeCommand) {
    return {
      action: "executeVSCodeCommand",
      command: "<VSCode command>",
    };
  }

  if (action === Action.ShowInfoMessage) {
    return {
      action: "showInfoMessage",
      message: "<message>",
    };
  }

  /**
   * Extensibility actions
   */
  if (action === Action.Snippet) {
    return {
      action: "snippet",
      contentPath: "",
      args: {},
    };
  }

  return;
};
