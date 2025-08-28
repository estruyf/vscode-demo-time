import { Action } from '@demotime/common';
import { QuickPickItem, QuickPickItemKind } from 'vscode';

export const getActionOptions = (): QuickPickItem[] => {
  const actions: QuickPickItem[] = [];

  /**
   * File actions
   */
  actions.push({
    label: 'File',
    description: 'File actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.Open,
    description: 'Open a file',
  } as QuickPickItem);

  actions.push({
    label: Action.Create,
    description: 'Create a file',
  } as QuickPickItem);

  actions.push({
    label: Action.Save,
    description: 'Save the current file',
  } as QuickPickItem);

  actions.push({
    label: Action.Rename,
    description: 'Rename a file',
  } as QuickPickItem);

  actions.push({
    label: Action.Move,
    description: 'Move a file',
  } as QuickPickItem);

  actions.push({
    label: Action.Copy,
    description: 'Copy a file',
  } as QuickPickItem);

  actions.push({
    label: Action.DeleteFile,
    description: 'Delete a file',
  } as QuickPickItem);

  actions.push({
    label: Action.Close,
    description: 'Close the current file',
  } as QuickPickItem);

  actions.push({
    label: Action.CloseAll,
    description: 'Close all files',
  } as QuickPickItem);

  /**
   * Patch actions
   */
  actions.push({
    label: 'Patch',
    description: 'Patch actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.ApplyPatch,
    description: 'Apply a patch',
  } as QuickPickItem);

  /**
   * Preview actions
   */
  actions.push({
    label: 'Preview',
    description: 'Preview actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.OpenSlide,
    description: 'Open a slide',
  } as QuickPickItem);

  actions.push({
    label: Action.MarkdownPreview,
    description: 'Preview a markdown file',
  } as QuickPickItem);

  actions.push({
    label: Action.ImagePreview,
    description: 'Preview an image',
  } as QuickPickItem);

  /**
   * Text/Code actions
   */
  actions.push({
    label: 'Text/Code',
    description: 'Text/Code actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.Highlight,
    description: 'Highlight text',
  } as QuickPickItem);

  actions.push({
    label: Action.Insert,
    description: 'Insert text',
  } as QuickPickItem);

  actions.push({
    label: Action.Replace,
    description: 'Replace text',
  } as QuickPickItem);

  actions.push({
    label: Action.Write,
    description: 'Write single line of text',
  } as QuickPickItem);

  actions.push({
    label: Action.Format,
    description: 'Format the content of the active file',
  } as QuickPickItem);

  actions.push({
    label: Action.Unselect,
    description: 'Unselect text',
  } as QuickPickItem);

  actions.push({
    label: Action.PositionCursor,
    description: 'Position the cursor',
  } as QuickPickItem);

  actions.push({
    label: Action.Delete,
    description: 'Delete text',
  } as QuickPickItem);

  /**
   * Settings actions
   */
  actions.push({
    label: 'Settings',
    description: 'Settings actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.SetSetting,
    description: 'Set a setting',
  } as QuickPickItem);

  actions.push({
    label: Action.SetTheme,
    description: 'Set the theme',
  });

  actions.push({
    label: Action.UnsetTheme,
    description: 'Unset the theme',
  });

  actions.push({
    label: Action.SetPresentationView,
    description: 'Set the presentation view',
  });

  actions.push({
    label: Action.UnsetPresentationView,
    description: 'Unset the presentation view',
  });

  /**
   * Terminal actions
   */
  actions.push({
    label: 'Terminal',
    description: 'Terminal actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.ExecuteTerminalCommand,
    description: 'Execute a terminal command',
  } as QuickPickItem);

  actions.push({
    label: Action.OpenTerminal,
    description: 'Open a new terminal',
  } as QuickPickItem);

  actions.push({
    label: Action.ExecuteScript,
    description: 'Execute a script',
  } as QuickPickItem);

  actions.push({
    label: Action.CloseTerminal,
    description: 'Close the terminal',
  } as QuickPickItem);

  /**
   * Timeout actions
   */
  actions.push({
    label: 'Timeout',
    description: 'Timeout actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.WaitForTimeout,
    description: 'Wait for a timeout',
  } as QuickPickItem);

  actions.push({
    label: Action.WaitForInput,
    description: 'Wait for user input',
  } as QuickPickItem);

  actions.push({
    label: Action.Pause,
    description: 'Pause until you trigger the next step',
  } as QuickPickItem);

  /**
   * VSCode actions
   */
  actions.push({
    label: 'VSCode',
    description: 'VSCode actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.ExecuteVSCodeCommand,
    description: 'Execute a VSCode command',
  } as QuickPickItem);

  actions.push({
    label: Action.ShowInfoMessage,
    description: 'Show an info message',
  } as QuickPickItem);

  actions.push({
    label: Action.SetState,
    description: 'Set a state',
  } as QuickPickItem);

  actions.push({
    label: Action.OpenWebsite,
    description: 'Open a website in the browser or the editor',
  } as QuickPickItem);

  /**
   * Extensibility actions
   */
  actions.push({
    label: 'Snippet',
    description: 'Snippet actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.Snippet,
    description: 'Insert a snippet',
  } as QuickPickItem);

  /**
   * External applications actions
   */
  actions.push({
    label: 'External Applications',
    description: 'External applications actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.OpenPowerPoint,
    description: 'Open PowerPoint',
  } as QuickPickItem);

  actions.push({
    label: Action.OpenKeynote,
    description: 'Open Keynote',
  } as QuickPickItem);

  // GitHub Copilot actions
  actions.push({
    label: 'GitHub Copilot',
    description: 'GitHub Copilot actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.OpenChat,
    description: 'Open the GitHub Copilot Chat',
  } as QuickPickItem);

  actions.push({
    label: Action.NewChat,
    description: 'Start a new chat in GitHub Copilot',
  } as QuickPickItem);

  actions.push({
    label: Action.AskChat,
    description: 'Ask a question in GitHub Copilot Chat',
  } as QuickPickItem);

  actions.push({
    label: Action.EditChat,
    description: 'Start an edit chat in GitHub Copilot Chat',
  } as QuickPickItem);

  actions.push({
    label: Action.AgentChat,
    description: 'Start an agent chat in GitHub Copilot Chat',
  } as QuickPickItem);

  actions.push({
    label: Action.CloseChat,
    description: 'Close the GitHub Copilot Chat',
  } as QuickPickItem);

  // Interaction actions
  actions.push({
    label: 'Interaction',
    description: 'Interaction actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.TypeText,
    description: 'Type text',
  } as QuickPickItem);

  actions.push({
    label: Action.CopyToClipboard,
    description: 'Copy text to clipboard',
  } as QuickPickItem);

  actions.push({
    label: Action.PasteFromClipboard,
    description: 'Paste text from clipboard',
  } as QuickPickItem);

  actions.push({
    label: Action.PressEnter,
    description: 'Press the Enter key',
  } as QuickPickItem);

  // Demo Time actions
  actions.push({
    label: 'Demo Time',
    description: 'Demo Time actions',
    kind: QuickPickItemKind.Separator,
  } as QuickPickItem);

  actions.push({
    label: Action.RunDemoById,
    description: 'Run a demo by its ID',
  } as QuickPickItem);

  return actions;
};
