export enum Action {
  // File
  Create = 'create',
  Open = 'open',
  Rename = 'rename',
  DeleteFile = 'deleteFile',
  Close = 'close',
  CloseAll = 'closeAll',
  Copy = 'copy',
  Move = 'move',
  // Previews
  MarkdownPreview = 'markdownPreview',
  ImagePreview = 'imagePreview',
  OpenSlide = 'openSlide',
  // Code
  Insert = 'insert',
  Highlight = 'highlight',
  Replace = 'replace',
  Unselect = 'unselect',
  Delete = 'delete',
  PositionCursor = 'positionCursor',
  Write = 'write',
  Save = 'save',
  Format = 'format',
  ApplyPatch = 'applyPatch',
  // Settings
  SetSetting = 'setSetting',
  SetTheme = 'setTheme',
  UnsetTheme = 'unsetTheme',
  SetPresentationView = 'setPresentationView',
  UnsetPresentationView = 'unsetPresentationView',
  // Timeout
  WaitForTimeout = 'waitForTimeout',
  WaitForInput = 'waitForInput',
  // VSCode
  ExecuteVSCodeCommand = 'executeVSCodeCommand',
  ShowInfoMessage = 'showInfoMessage',
  SetState = 'setState',
  OpenWebsite = 'openWebsite',
  // Terminal
  OpenTerminal = 'openTerminal',
  ExecuteTerminalCommand = 'executeTerminalCommand',
  CloseTerminal = 'closeTerminal',
  ExecuteScript = 'executeScript',
  // Extensibility
  Snippet = 'snippet',
  // External applications
  openPowerPoint = 'openPowerPoint',
  openKeynote = 'openKeynote',
  // GitHub Copilot
  openChat = 'openCopilotChat',
  newChat = 'newCopilotChat',
  askChat = 'askCopilotChat',
  editChat = 'editCopilotChat',
  agentChat = 'agentCopilotChat',
  closeChat = 'closeCopilotChat',
  // Interaction
  TypeText = 'typeText',
  CopyToClipboard = 'copyToClipboard',
  PasteFromClipboard = 'pasteFromClipboard',
  PressEnter = 'pressEnter',
}
