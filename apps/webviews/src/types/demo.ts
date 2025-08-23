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
  action: ActionType;
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
  insertTypingMode?:
    | "instant"
    | "line-by-line"
    | "character-by-character"
    | "hacker-typer";
  autoExecute?: boolean;
}

export type ActionType =
  | "applyPatch"
  | "create"
  | "open"
  | "rename"
  | "deleteFile"
  | "close"
  | "closeAll"
  | "copy"
  | "move"
  | "markdownPreview"
  | "imagePreview"
  | "openSlide"
  | "insert"
  | "highlight"
  | "replace"
  | "unselect"
  | "delete"
  | "positionCursor"
  | "write"
  | "save"
  | "format"
  | "setSetting"
  | "setTheme"
  | "unsetTheme"
  | "setPresentationView"
  | "unsetPresentationView"
  | "waitForTimeout"
  | "waitForInput"
  | "executeVSCodeCommand"
  | "showInfoMessage"
  | "setState"
  | "openWebsite"
  | "openTerminal"
  | "executeTerminalCommand"
  | "executeScript"
  | "closeTerminal"
  | "snippet"
  | "openPowerPoint"
  | "openKeynote"
  | "openCopilotChat"
  | "newCopilotChat"
  | "askCopilotChat"
  | "editCopilotChat"
  | "agentCopilotChat"
  | "closeCopilotChat"
  | "copyToClipboard"
  | "pasteFromClipboard"
  | "typeText"
  | "pressEnter"
  | "runDemoById";

export const THEMES = [
  "Default Dark Modern",
  "Default Dark+",
  "Default High Contrast Light",
  "Default High Contrast",
  "Default Light Modern",
  "Default Light+",
];

export const TYPING_MODES = [
  "instant",
  "line-by-line",
  "character-by-character",
  "hacker-typer",
];

export const TERMINAL_TYPING_MODES = ["instant", "character-by-character"];
export const ACTIONS: ActionType[] = [
  "applyPatch",
  "create",
  "open",
  "rename",
  "deleteFile",
  "close",
  "closeAll",
  "copy",
  "move",
  "markdownPreview",
  "imagePreview",
  "openSlide",
  "insert",
  "highlight",
  "replace",
  "unselect",
  "delete",
  "positionCursor",
  "write",
  "save",
  "format",
  "setSetting",
  "setTheme",
  "unsetTheme",
  "setPresentationView",
  "unsetPresentationView",
  "waitForTimeout",
  "waitForInput",
  "executeVSCodeCommand",
  "showInfoMessage",
  "setState",
  "openWebsite",
  "openTerminal",
  "executeTerminalCommand",
  "executeScript",
  "closeTerminal",
  "snippet",
  "openPowerPoint",
  "openKeynote",
  "openCopilotChat",
  "newCopilotChat",
  "askCopilotChat",
  "editCopilotChat",
  "agentCopilotChat",
  "closeCopilotChat",
  "copyToClipboard",
  "pasteFromClipboard",
  "typeText",
  "pressEnter",
  "runDemoById",
];

// Categorized actions for dropdown
export const CATEGORIZED_ACTIONS = [
  {
    category: "File actions",
    options: [
      "create",
      "open",
      "rename",
      "deleteFile",
      "close",
      "closeAll",
      "copy",
      "move",
      "save",
    ],
  },
  {
    category: "Text actions",
    options: ["insert", "replace", "delete", "write", "typeText", "format"],
  },
  {
    category: "Preview actions",
    options: ["markdownPreview", "imagePreview", "openSlide"],
  },
  {
    category: "Patch actions",
    options: ["applyPatch"],
  },
  {
    category: "Setting actions",
    options: [
      "setSetting",
      "setTheme",
      "unsetTheme",
      "setPresentationView",
      "unsetPresentationView",
      "setState",
    ],
  },
  {
    category: "Terminal actions",
    options: [
      "openTerminal",
      "executeTerminalCommand",
      "executeScript",
      "closeTerminal",
    ],
  },
  {
    category: "Time actions",
    options: ["waitForTimeout", "waitForInput"],
  },
  {
    category: "VS Code actions",
    options: ["executeVSCodeCommand", "showInfoMessage"],
  },
  {
    category: "Snippet actions",
    options: ["snippet"],
  },
  {
    category: "External Apps actions",
    options: ["openWebsite", "openPowerPoint", "openKeynote"],
  },
  {
    category: "GitHub Copilot actions",
    options: [
      "openCopilotChat",
      "newCopilotChat",
      "askCopilotChat",
      "editCopilotChat",
      "agentCopilotChat",
      "closeCopilotChat",
    ],
  },
  {
    category: "Interaction actions",
    options: [
      "highlight",
      "unselect",
      "positionCursor",
      "copyToClipboard",
      "pasteFromClipboard",
      "pressEnter",
    ],
  },
  {
    category: "Run Demo actions",
    options: ["runDemoById"],
  },
];
