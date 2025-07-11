import { Action, Version } from '.';

/**
 * Types for different insertion modes
 */
export type InsertTypingMode = 'instant' | 'line-by-line' | 'character-by-character' | 'hacker-typer';

export interface DemoFiles {
  [filePath: string]: DemoFile;
}

export interface DemoFile {
  title: string;
  description: string;
  version?: Version;
  timer?: number;
  demos: Demo[];
}

export interface Demo {
  id?: string;
  title: string;
  description: string;
  steps: Step[];
  icons?: Icons;
  notes?: Notes;
}

export interface Notes {
  path: string;
  showOnTrigger?: boolean;
}

export interface Icons {
  start: string;
  end: string;
}

export interface Step extends IOpenWebsite, IImagePreview, ITerminal {
  action: Action;

  path?: string;
  content?: string;
  contentPath?: string;
  patch?: string;

  position?: string | number;
  startPlaceholder?: string;
  endPlaceholder?: string;

  zoom?: number;
  highlightWholeLine?: boolean;

  id?: string;
  timeout?: number;
  command?: string;
  message?: string;
  args?: any;
  lineInsertionDelay?: number;
  insertTypingMode?: InsertTypingMode;
  insertTypingSpeed?: number;
  setting?: Setting;
  state?: State;
  dest?: string;
  overwrite?: boolean;
  terminalId?: string;
  theme?: string;
}

export interface ITerminal {
  autoExecute?: boolean;
}

export interface IOpenWebsite {
  action: Action;
  url?: string;
  openInVSCode?: boolean;
}

export interface ISlidePreview {
  action: Action;
  path?: string;
}

export interface IImagePreview extends ISlidePreview {
  theme?: string;
}

export interface Setting {
  key: string;
  value: string | number | boolean | object | null;
}

export interface State {
  key: string;
  value: string;
}
