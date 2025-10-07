import { Action } from '@demotime/common';

export const getActionIcon = (action: Action): string => {
  const iconMap: Record<Action, string> = {
    [Action.ApplyPatch]: 'file-diff',
    [Action.Create]: 'file-plus',
    [Action.Open]: 'folder-open',
    [Action.Rename]: 'edit-2',
    [Action.DeleteFile]: 'trash-2',
    [Action.Close]: 'x',
    [Action.CloseAll]: 'x-circle',
    [Action.Copy]: 'copy',
    [Action.Move]: 'move',
    [Action.MarkdownPreview]: 'eye',
    [Action.ImagePreview]: 'image',
    [Action.OpenSlide]: 'presentation',
    [Action.Insert]: 'plus',
    [Action.Highlight]: 'highlighter',
    [Action.Replace]: 'replace',
    [Action.Unselect]: 'mouse-pointer',
    [Action.Delete]: 'minus',
    [Action.PositionCursor]: 'cursor',
    [Action.Write]: 'type',
    [Action.Save]: 'save',
    [Action.Format]: 'align-left',
    [Action.SetSetting]: 'settings',
    [Action.SetTheme]: 'palette',
    [Action.UnsetTheme]: 'palette',
    [Action.SetPresentationView]: 'maximize',
    [Action.UnsetPresentationView]: 'minimize',
    [Action.WaitForTimeout]: 'clock',
    [Action.WaitForInput]: 'keyboard',
    [Action.Pause]: 'play',
    [Action.ExecuteVSCodeCommand]: 'terminal',
    [Action.ShowInfoMessage]: 'info',
    [Action.SetState]: 'database',
    [Action.OpenWebsite]: 'external-link',
    [Action.OpenTerminal]: 'terminal',
    [Action.ExecuteTerminalCommand]: 'command',
    [Action.ExecuteScript]: 'code',
    [Action.CloseTerminal]: 'terminal',
    [Action.Snippet]: 'file-text',
    [Action.OpenPowerPoint]: 'presentation',
    [Action.OpenKeynote]: 'presentation',
    [Action.OpenChat]: 'message-circle',
    [Action.NewChat]: 'message-circle-plus',
    [Action.AskChat]: 'message-circle-question',
    [Action.EditChat]: 'message-circle-edit',
    [Action.AgentChat]: 'bot',
    [Action.CustomChat]: 'bot',
    [Action.CloseChat]: 'message-circle-x',
    [Action.CopyToClipboard]: 'clipboard',
    [Action.PasteFromClipboard]: 'clipboard-paste',
    [Action.TypeText]: 'type',
    [Action.PressEnter]: 'corner-down-left',
    [Action.PressTab]: 'keyboard',
    [Action.PressArrowLeft]: 'arrow-left',
    [Action.PressArrowRight]: 'arrow-right',
    [Action.PressArrowUp]: 'arrow-up',
    [Action.PressArrowDown]: 'arrow-down',
    [Action.PressEscape]: 'corner-up-right',
    [Action.PressBackspace]: 'backspace',
    [Action.PressDelete]: 'delete',
    [Action.RunDemoById]: 'play-circle',
    [Action.BackupSettings]: 'settings-gear',
    [Action.RestoreSettings]: 'settings-gear',
    [Action.StartEngageTimeSession]: 'question',
    [Action.StartEngageTimePoll]: 'question',
    [Action.CloseEngageTimeSession]: 'question',
    [Action.CloseEngageTimePoll]: 'question',
    [Action.ShowEngageTimeSession]: 'question',
    [Action.ShowEngageTimePoll]: 'question',
  };
  return iconMap[action] || 'circle';
};

export const getActionColor = (action: Action): string => {
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

export const getRequiredFields = (action: Action): string[] => {
  const requiredMap: Record<Action, string[]> = {
    [Action.ApplyPatch]: ['path', 'contentPath', 'patch'],
    [Action.Create]: ['path'], // path is always required, content/contentPath are mutually exclusive or both optional
    [Action.Open]: ['path'],
    [Action.Rename]: ['path', 'dest'],
    [Action.DeleteFile]: ['path'],
    [Action.Close]: [],
    [Action.CloseAll]: [],
    [Action.Copy]: ['path', 'dest'],
    [Action.Move]: ['path', 'dest'],
    [Action.MarkdownPreview]: ['path'],
    [Action.ImagePreview]: ['path'],
    [Action.OpenSlide]: ['path'],
    [Action.Insert]: ['path'],
    [Action.Highlight]: ['path'],
    [Action.Replace]: ['path'],
    [Action.Unselect]: [],
    [Action.Delete]: ['path'],
    [Action.PositionCursor]: ['path'],
    [Action.Write]: ['content'],
    [Action.Save]: [],
    [Action.Format]: [],
    [Action.SetSetting]: ['setting'],
    [Action.SetTheme]: ['theme'],
    [Action.UnsetTheme]: [],
    [Action.SetPresentationView]: [],
    [Action.UnsetPresentationView]: [],
    [Action.WaitForTimeout]: ['timeout'],
    [Action.WaitForInput]: [],
    [Action.Pause]: [],
    [Action.ExecuteVSCodeCommand]: ['command'],
    [Action.ShowInfoMessage]: ['message'],
    [Action.SetState]: ['state'],
    [Action.OpenWebsite]: ['url'],
    [Action.OpenTerminal]: [],
    [Action.ExecuteTerminalCommand]: ['command'],
    [Action.ExecuteScript]: ['id', 'command', 'path'],
    [Action.CloseTerminal]: [],
    [Action.Snippet]: ['contentPath'],
    [Action.OpenPowerPoint]: [],
    [Action.OpenKeynote]: [],
    [Action.OpenChat]: [],
    [Action.NewChat]: [],
    [Action.AskChat]: [],
    [Action.EditChat]: [],
    [Action.AgentChat]: [],
    [Action.CustomChat]: ['mode'],
    [Action.CloseChat]: [],
    [Action.CopyToClipboard]: [],
    [Action.PasteFromClipboard]: [],
    [Action.TypeText]: ['content'],
    [Action.PressEnter]: [],
    [Action.PressTab]: [],
    [Action.PressArrowLeft]: [],
    [Action.PressArrowRight]: [],
    [Action.PressArrowUp]: [],
    [Action.PressArrowDown]: [],
    [Action.PressEscape]: [],
    [Action.PressBackspace]: [],
    [Action.PressDelete]: [],
    [Action.RunDemoById]: ['id'],
    [Action.BackupSettings]: [],
    [Action.RestoreSettings]: [],
    [Action.StartEngageTimeSession]: [],
    [Action.StartEngageTimePoll]: ['pollId'],
    [Action.CloseEngageTimeSession]: [],
    [Action.CloseEngageTimePoll]: ['pollId'],
    [Action.ShowEngageTimeSession]: [],
    [Action.ShowEngageTimePoll]: ['pollId'],
  };
  return requiredMap[action] || [];
};

export const getFieldsForAction = (action: Action): string[] => {
  const fieldMap: Record<Action, string[]> = {
    [Action.ApplyPatch]: ['path', 'contentPath', 'patch', 'insertTypingSpeed', 'insertTypingMode'],
    [Action.Create]: ['path', 'content', 'contentPath'],
    [Action.Open]: ['path', 'focusTop'],
    [Action.Rename]: ['path', 'dest'],
    [Action.DeleteFile]: ['path'],
    [Action.Close]: [],
    [Action.CloseAll]: [],
    [Action.Copy]: ['path', 'dest', 'overwrite'],
    [Action.Move]: ['path', 'dest', 'overwrite'],
    [Action.MarkdownPreview]: ['path'],
    [Action.ImagePreview]: ['path', 'theme'],
    [Action.OpenSlide]: ['path', 'slide'],
    [Action.Insert]: [
      'path',
      'content',
      'contentPath',
      'position',
      'startPlaceholder',
      'endPlaceholder',
      'insertTypingSpeed',
      'insertTypingMode',
    ],
    [Action.Highlight]: [
      'path',
      'position',
      'startPlaceholder',
      'endPlaceholder',
      'highlightWholeLine',
      'zoom',
    ],
    [Action.Replace]: [
      'path',
      'content',
      'contentPath',
      'position',
      'startPlaceholder',
      'endPlaceholder',
      'insertTypingSpeed',
      'insertTypingMode',
    ],
    [Action.Unselect]: [],
    [Action.Delete]: ['path', 'position', 'startPlaceholder', 'endPlaceholder'],
    [Action.PositionCursor]: ['path', 'position'],
    [Action.Write]: ['content', 'path', 'position', 'startPlaceholder'],
    [Action.Save]: [],
    [Action.Format]: [],
    [Action.SetSetting]: ['setting'],
    [Action.SetTheme]: ['theme'],
    [Action.UnsetTheme]: [],
    [Action.SetPresentationView]: [],
    [Action.UnsetPresentationView]: [],
    [Action.WaitForTimeout]: ['timeout'],
    [Action.WaitForInput]: ['message'],
    [Action.Pause]: [],
    [Action.ExecuteVSCodeCommand]: ['command', 'args'],
    [Action.ShowInfoMessage]: ['message'],
    [Action.SetState]: ['state'],
    [Action.OpenWebsite]: ['url', 'openInVSCode'],
    [Action.OpenTerminal]: ['terminalId'],
    [Action.ExecuteTerminalCommand]: [
      'command',
      'terminalId',
      'autoExecute',
      'insertTypingMode',
      'insertTypingSpeed',
    ],
    [Action.ExecuteScript]: ['id', 'command', 'path'],
    [Action.CloseTerminal]: ['terminalId'],
    [Action.Snippet]: ['contentPath', 'args'],
    [Action.OpenPowerPoint]: [],
    [Action.OpenKeynote]: [],
    [Action.OpenChat]: [],
    [Action.NewChat]: [],
    [Action.AskChat]: ['message'],
    [Action.EditChat]: ['message'],
    [Action.AgentChat]: ['message'],
    [Action.CustomChat]: ['mode', 'message'],
    [Action.CloseChat]: [],
    [Action.CopyToClipboard]: ['content', 'contentPath'],
    [Action.PasteFromClipboard]: [],
    [Action.TypeText]: ['content', 'insertTypingSpeed'],
    [Action.PressEnter]: [],
    [Action.PressTab]: [],
    [Action.PressArrowLeft]: [],
    [Action.PressArrowRight]: [],
    [Action.PressArrowUp]: [],
    [Action.PressArrowDown]: [],
    [Action.PressEscape]: [],
    [Action.PressBackspace]: [],
    [Action.PressDelete]: [],
    [Action.RunDemoById]: ['id'],
    [Action.BackupSettings]: [],
    [Action.RestoreSettings]: [],
    [Action.StartEngageTimeSession]: [],
    [Action.StartEngageTimePoll]: ['pollId'],
    [Action.CloseEngageTimeSession]: [],
    [Action.CloseEngageTimePoll]: ['pollId'],
    [Action.ShowEngageTimeSession]: [],
    [Action.ShowEngageTimePoll]: ['pollId', 'startOnOpen'],
  };

  return fieldMap[action] || [];
};
