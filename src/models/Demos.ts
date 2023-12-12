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
  title: string;
  description: string;
  steps: Step[];
}

export interface Step {
  action: Action;
  path: string;
  content?: string;
  contentPath?: string;
  position?: string | number;
  timeout?: number;
}
