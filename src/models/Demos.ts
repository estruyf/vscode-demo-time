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
}

export interface Icons {
  start: string;
  end: string;
}

export interface Step {
  action: Action;
  path: string;

  content?: string;
  contentPath?: string;
  position?: string | number;
  timeout?: number;
  command?: string;
  message?: string;
  args?: any;
}
