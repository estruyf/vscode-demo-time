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
  file: string;
  show?: boolean;
}

export interface Icons {
  start: string;
  end: string;
}

export interface Step {
  action: Action;

  path?: string;
  content?: string;
  contentPath?: string;
  position?: string | number;
  timeout?: number;
  command?: string;
  message?: string;
  args?: any;
  lineInsertionDelay?: number;
  setting?: Setting;
  dest?: string;
  zoom?: number;
}

export interface Setting {
  key: string;
  value: string | number | boolean | object | null;
}
