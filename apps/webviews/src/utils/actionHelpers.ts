import { ActionType } from '../types/demo';

export const getActionIcon = (action: ActionType): string => {
  const iconMap: Record<ActionType, string> = {
    applyPatch: 'file-diff',
    create: 'file-plus',
    open: 'folder-open',
    rename: 'edit-2',
    deleteFile: 'trash-2',
    close: 'x',
    closeAll: 'x-circle',
    copy: 'copy',
    move: 'move',
    markdownPreview: 'eye',
    imagePreview: 'image',
    openSlide: 'presentation',
    insert: 'plus',
    highlight: 'highlighter',
    replace: 'replace',
    unselect: 'mouse-pointer',
    delete: 'minus',
    positionCursor: 'cursor',
    write: 'type',
    save: 'save',
    format: 'align-left',
    setSetting: 'settings',
    setTheme: 'palette',
    unsetTheme: 'palette',
    setPresentationView: 'maximize',
    unsetPresentationView: 'minimize',
    waitForTimeout: 'clock',
    waitForInput: 'keyboard',
    executeVSCodeCommand: 'terminal',
    showInfoMessage: 'info',
    setState: 'database',
    openWebsite: 'external-link',
    openTerminal: 'terminal',
    executeTerminalCommand: 'command',
    executeScript: 'code',
    closeTerminal: 'terminal',
    snippet: 'file-text',
    openPowerPoint: 'presentation',
    openKeynote: 'presentation',
    openCopilotChat: 'message-circle',
    newCopilotChat: 'message-circle-plus',
    askCopilotChat: 'message-circle-question',
    editCopilotChat: 'message-circle-edit',
    agentCopilotChat: 'bot',
    closeCopilotChat: 'message-circle-x',
    copyToClipboard: 'clipboard',
    pasteFromClipboard: 'clipboard-paste',
    typeText: 'type',
    pressEnter: 'corner-down-left',
    runDemoById: 'play-circle',
  };
  return iconMap[action] || 'circle';
};

export const getActionColor = (action: ActionType): string => {
  const colorMap: Record<string, string> = {
    file: 'bg-blue-100 text-blue-800',
    edit: 'bg-green-100 text-green-800',
    delete: 'bg-red-100 text-red-800',
    execute: 'bg-purple-100 text-purple-800',
    ui: 'bg-yellow-100 text-yellow-800',
    chat: 'bg-indigo-100 text-indigo-800',
    clipboard: 'bg-teal-100 text-teal-800',
    default: 'bg-gray-100 text-gray-800',
  };

  if (
    action.includes('file') ||
    action.includes('File') ||
    action.includes('open') ||
    action.includes('create') ||
    action.includes('save')
  ) {
    return colorMap.file;
  }
  if (
    action.includes('edit') ||
    action.includes('insert') ||
    action.includes('replace') ||
    action.includes('highlight') ||
    action.includes('format')
  ) {
    return colorMap.edit;
  }
  if (action.includes('delete') || action.includes('close') || action.includes('unselect')) {
    return colorMap.delete;
  }
  if (
    action.includes('execute') ||
    action.includes('command') ||
    action.includes('script') ||
    action.includes('terminal')
  ) {
    return colorMap.execute;
  }
  if (
    action.includes('Setting') ||
    action.includes('Theme') ||
    action.includes('View') ||
    action.includes('message')
  ) {
    return colorMap.ui;
  }
  if (action.includes('Copilot') || action.includes('Chat')) {
    return colorMap.chat;
  }
  if (action.includes('clipboard') || action.includes('Clipboard')) {
    return colorMap.clipboard;
  }
  return colorMap.default;
};

export const getRequiredFields = (action: ActionType): string[] => {
  const requiredMap: Record<ActionType, string[]> = {
    applyPatch: ['path', 'contentPath', 'patch'],
    create: ['path'], // path is always required, content/contentPath are mutually exclusive or both optional
    open: ['path'],
    rename: ['path', 'dest'],
    deleteFile: ['path'],
    close: [],
    closeAll: [],
    copy: ['path', 'dest'],
    move: ['path', 'dest'],
    markdownPreview: ['path'],
    imagePreview: ['path'],
    openSlide: ['path'],
    insert: ['path'],
    highlight: ['path'],
    replace: ['path'],
    unselect: [],
    delete: ['path'],
    positionCursor: ['path'],
    write: ['content'],
    save: [],
    format: [],
    setSetting: ['setting'],
    setTheme: ['theme'],
    unsetTheme: [],
    setPresentationView: [],
    unsetPresentationView: [],
    waitForTimeout: ['timeout'],
    waitForInput: [],
    executeVSCodeCommand: ['command'],
    showInfoMessage: ['message'],
    setState: ['state'],
    openWebsite: ['url'],
    openTerminal: [],
    executeTerminalCommand: ['command'],
    executeScript: ['id', 'command', 'path'],
    closeTerminal: [],
    snippet: ['contentPath'],
    openPowerPoint: [],
    openKeynote: [],
    openCopilotChat: [],
    newCopilotChat: [],
    askCopilotChat: [],
    editCopilotChat: [],
    agentCopilotChat: [],
    closeCopilotChat: [],
    copyToClipboard: [],
    pasteFromClipboard: [],
    typeText: ['content'],
    pressEnter: [],
    runDemoById: ['id'],
  };
  return requiredMap[action] || [];
};

export const getFieldsForAction = (action: ActionType): string[] => {
  const fieldMap: Record<ActionType, string[]> = {
    applyPatch: ['path', 'contentPath', 'patch'],
    create: ['path', 'content', 'contentPath'],
    open: ['path'],
    rename: ['path', 'dest'],
    deleteFile: ['path'],
    close: [],
    closeAll: [],
    copy: ['path', 'dest', 'overwrite'],
    move: ['path', 'dest', 'overwrite'],
    markdownPreview: ['path'],
    imagePreview: ['path', 'theme'],
    openSlide: ['path', 'slide'],
    insert: [
      'path',
      'content',
      'contentPath',
      'position',
      'startPlaceholder',
      'endPlaceholder',
      'insertTypingSpeed',
      'insertTypingMode',
    ],
    highlight: [
      'path',
      'position',
      'startPlaceholder',
      'endPlaceholder',
      'highlightWholeLine',
      'zoom',
    ],
    replace: [
      'path',
      'content',
      'contentPath',
      'position',
      'startPlaceholder',
      'endPlaceholder',
      'insertTypingSpeed',
      'insertTypingMode',
    ],
    unselect: [],
    delete: ['path', 'position', 'startPlaceholder', 'endPlaceholder'],
    positionCursor: ['path', 'position'],
    write: ['content', 'path', 'position', 'startPlaceholder'],
    save: [],
    format: [],
    setSetting: ['setting'],
    setTheme: ['theme'],
    unsetTheme: [],
    setPresentationView: [],
    unsetPresentationView: [],
    waitForTimeout: ['timeout'],
    waitForInput: ['message'],
    executeVSCodeCommand: ['command', 'args'],
    showInfoMessage: ['message'],
    setState: ['state'],
    openWebsite: ['url', 'openInVSCode'],
    openTerminal: ['terminalId'],
    executeTerminalCommand: [
      'command',
      'terminalId',
      'autoExecute',
      'insertTypingMode',
      'insertTypingSpeed',
    ],
    executeScript: ['id', 'command', 'path'],
    closeTerminal: ['terminalId'],
    snippet: ['contentPath', 'args'],
    openPowerPoint: [],
    openKeynote: [],
    openCopilotChat: [],
    newCopilotChat: [],
    askCopilotChat: ['message'],
    editCopilotChat: ['message'],
    agentCopilotChat: ['message'],
    closeCopilotChat: [],
    copyToClipboard: ['content', 'contentPath'],
    pasteFromClipboard: [],
    typeText: ['content', 'insertTypingSpeed'],
    pressEnter: [],
    runDemoById: ['id'],
  };

  return fieldMap[action] || [];
};
