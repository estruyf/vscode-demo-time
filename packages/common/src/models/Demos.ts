import { Action, InsertTypingMode, Version } from '.';

export interface DemoFiles {
  [filePath: string]: DemoConfig | ActConfig;
}

// Version 3: Play structure (entire project)
export interface PlayConfig {
  acts: ActConfig[];
}

// Version 3: Act structure (demo file with product icon)
export interface ActConfig {
  $schema?: 'https://demotime.show/demo-time.schema.json';
  title: string;
  description?: string;
  version: 3;
  timer?: number;
  productIcon?: string; // Optional but recommended for version 3
  engageTime?: EngageTimeConfig;
  scenes: Scene[];
}

// Version 1 & 2: Legacy DemoConfig structure
export interface DemoConfig {
  $schema?: 'https://demotime.show/demo-time.schema.json';
  title: string;
  description?: string;
  version?: Version;
  timer?: number;
  engageTime?: EngageTimeConfig;
  demos: Demo[];
}

// Type guard to check if config is version 3
export function isActConfig(config: DemoConfig | ActConfig): config is ActConfig {
  return (config as ActConfig).version === 3;
}

export interface EngageTimeConfig {
  sessionId?: string;
}

// Version 3: Scene (replaces Demo for version 3)
export interface Scene {
  id?: string;
  title: string;
  description?: string;
  moves: Move[];
  icons?: Icons;
  notes?: Notes;
  disabled?: boolean;
}

// Version 1 & 2: Legacy Demo structure
export interface Demo {
  id?: string;
  title: string;
  description?: string;
  steps: Step[];
  icons?: Icons;
  notes?: Notes;
  disabled?: boolean;
}

export interface Notes {
  path: string;
  showOnTrigger?: boolean;
}

export interface Icons {
  start: string;
  end: string;
}

// Version 3: Move (replaces Step for version 3) - Same structure as Step
export type Move = Step;

// Version 1 & 2: Legacy Step structure
export interface Step extends IOpenWebsite, IImagePreview, ITerminal {
  action: Action;
  disabled?: boolean;

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
  slide?: number;
  focusTop?: boolean;

  // Chats
  mode?: string;

  // EngageTime
  sessionId?: string;
  pollId?: string;
  startOnOpen?: boolean;
  title?: string;
  type?: EngageTimeMessageType;
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

export type EngageTimeMessageType = 'demo' | 'slide' | 'custom';
