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
  // Settings
  SetSetting = "setSetting",
  // Timeout
  WaitForTimeout = "waitForTimeout",
  WaitForInput = "waitForInput",
  // VSCode
  ExecuteVSCodeCommand = "executeVSCodeCommand",
  ShowInfoMessage = "showInfoMessage",
  // Terminal
  ExecuteTerminalCommand = "executeTerminalCommand",
  CloseTerminal = "closeTerminal",
  // Extensibility
  Snippet = "snippet"
}