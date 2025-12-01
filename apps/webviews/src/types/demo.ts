import { Action, InsertTypingMode } from '@demotime/common';

export const THEMES = [
  'Default Dark Modern',
  'Default Dark+',
  'Default High Contrast Light',
  'Default High Contrast',
  'Default Light Modern',
  'Default Light+',
];

export const TYPING_MODES: InsertTypingMode[] = [
  'instant',
  'line-by-line',
  'character-by-character',
  'hacker-typer',
];

export const TERMINAL_TYPING_MODES = ['instant', 'character-by-character'];
export const ACTIONS = Object.values(Action);

// Categorized actions for dropdown
export const CATEGORIZED_ACTIONS: {
  category: string;
  options: Action[];
}[] = [
  {
    category: 'File actions',
    options: [
      Action.Create,
      Action.Open,
      Action.Rename,
      Action.DeleteFile,
      Action.Close,
      Action.CloseAll,
      Action.Copy,
      Action.Move,
      Action.Save,
    ],
  },
  {
    category: 'Text actions',
    options: [
      Action.Insert,
      Action.Replace,
      Action.Delete,
      Action.Write,
      Action.TypeText,
      Action.Format,
    ],
  },
  {
    category: 'Preview actions',
    options: [Action.MarkdownPreview, Action.ImagePreview, Action.OpenSlide],
  },
  {
    category: 'Setting actions',
    options: [
      Action.SetSetting,
      Action.SetTheme,
      Action.UnsetTheme,
      Action.SetPresentationView,
      Action.UnsetPresentationView,
      Action.SetState,
      Action.BackupSettings,
      Action.RestoreSettings,
    ],
  },
  {
    category: 'Terminal actions',
    options: [
      Action.OpenTerminal,
      Action.ExecuteTerminalCommand,
      Action.ExecuteScript,
      Action.CloseTerminal,
    ],
  },
  {
    category: 'Time actions',
    options: [Action.WaitForTimeout, Action.WaitForInput, Action.Pause],
  },
  {
    category: 'VS Code actions',
    options: [Action.ExecuteVSCodeCommand, Action.ShowInfoMessage],
  },
  {
    category: 'Snippet actions',
    options: [Action.Snippet],
  },
  {
    category: 'Patch actions',
    options: [Action.ApplyPatch],
  },
  {
    category: 'External Apps actions',
    options: [Action.OpenWebsite, Action.OpenPowerPoint, Action.OpenKeynote],
  },
  {
    category: 'GitHub Copilot actions',
    options: [
      Action.OpenChat,
      Action.NewChat,
      Action.AskChat,
      Action.EditChat,
      Action.AgentChat,
      Action.CustomChat,
      Action.CloseChat,
      Action.CancelChat,
    ],
  },
  {
    category: 'Interaction actions',
    options: [
      Action.Highlight,
      Action.Selection,
      Action.Unselect,
      Action.PositionCursor,
      Action.CopyToClipboard,
      Action.PasteFromClipboard,
      Action.PressEnter,
      Action.PressTab,
      Action.PressArrowLeft,
      Action.PressArrowRight,
      Action.PressArrowUp,
      Action.PressArrowDown,
      Action.PressEscape,
      Action.PressBackspace,
      Action.PressDelete,
    ],
  },
  {
    category: 'Run Demo actions',
    options: [Action.RunDemoById],
  },
  {
    category: 'macOS actions',
    options: [
      Action.EnableFocusMode,
      Action.DisableFocusMode,
      Action.HideMenubar,
      Action.ShowMenubar,
    ],
  },
  {
    category: 'EngageTime actions',
    options: [
      Action.ShowEngageTimePoll,
      Action.ShowEngageTimeSession,
      Action.StartEngageTimeSession,
      Action.StartEngageTimePoll,
      Action.CloseEngageTimeSession,
      Action.CloseEngageTimePoll,
      Action.SendEngageTimeMessage,
    ],
  },
];
