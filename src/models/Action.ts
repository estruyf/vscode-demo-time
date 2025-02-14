export enum Action {
  // File
  Create = "create",
  Open = "open",
  Rename = "rename",
  DeleteFile = "deleteFile",
  Close = "close",
  CloseAll = "closeAll",
  Copy = "copy",
  Move = "move",
  // Markdown
  MarkdownPreview = "markdownPreview",
  // Code
  Insert = "insert",
  Highlight = "highlight",
  Replace = "replace",
  Unselect = "unselect",
  Delete = "delete",
  PositionCursor = "positionCursor",
  Write = "write",
  Save = "save",
  Format = "format",
  ApplyPatch = "applyPatch",
  // Settings
  SetSetting = "setSetting",
  SetTheme = "setTheme",
  UnsetTheme = "unsetTheme",
  // Timeout
  WaitForTimeout = "waitForTimeout",
  WaitForInput = "waitForInput",
  // VSCode
  ExecuteVSCodeCommand = "executeVSCodeCommand",
  ShowInfoMessage = "showInfoMessage",
  SetState = "setState",
  // Terminal
  ExecuteTerminalCommand = "executeTerminalCommand",
  CloseTerminal = "closeTerminal",
  ExecuteScript = "executeScript",
  // Extensibility
  Snippet = "snippet",
}
