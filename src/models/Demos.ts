import { Action } from ".";

export interface DemoFiles {
  [filePath: string]: Demos;
}

export interface Demos {
  title: string;
  description: string;
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

export interface Step extends IOpenWebsite, IImagePreview {
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
  setting?: Setting;
  state?: State;
  dest?: string;
  overwrite?: boolean;
  terminalId?: string;
  theme?: string;
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
