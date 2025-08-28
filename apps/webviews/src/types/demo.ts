import { Action, InsertTypingMode } from '@demotime/common';

export interface DemoConfig {
  title: string;
  description: string;
  version: 1 | 2;
  timer?: number;
  demos: Demo[];
}

export interface Demo {
  id?: string;
  title: string;
  description?: string;
  icons?: {
    start: string;
    end: string;
  };
  steps: Step[];
  disabled?: boolean;
  notes?: {
    path: string;
    showOnTrigger?: boolean;
  };
}

export interface Step {
  action: Action;
  disabled?: boolean;
  path?: string;
  content?: string;
  contentPath?: string;
  patch?: string;
  position?: string | number;
  startPlaceholder?: string;
  endPlaceholder?: string;
  highlightWholeLine?: boolean;
  timeout?: number;
  command?: string;
  message?: string;
  dest?: string;
  zoom?: number;
  overwrite?: boolean;
  terminalId?: string;
  id?: string;
  url?: string;
  openInVSCode?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any;
  theme?: string;
  setting?: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
  };
  state?: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
  };
  insertTypingSpeed?: number;
  insertTypingMode?: InsertTypingMode;
  autoExecute?: boolean;
}

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
    category: 'Patch actions',
    options: [Action.ApplyPatch],
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
    options: [Action.WaitForTimeout, Action.WaitForInput, Action.WaitForNext],
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
      Action.CloseChat,
    ],
  },
  {
    category: 'Interaction actions',
    options: [
      Action.Highlight,
      Action.Unselect,
      Action.PositionCursor,
      Action.CopyToClipboard,
      Action.PasteFromClipboard,
      Action.PressEnter,
    ],
  },
  {
    category: 'Run Demo actions',
    options: [Action.RunDemoById],
  },
];
