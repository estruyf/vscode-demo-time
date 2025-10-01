export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export interface DemoFiles {
  [filePath: string]: DemoFile;
}

export interface DemoFile {
  $schema: 'https://demotime.show/demo-time.schema.json';
  title: string;
  description?: string;
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

export interface Step {
  id?: string;
  title?: string;
  description?: string;
  action: string;
  notes?: string | StepNotes; // Added support for step-level notes
  [key: string]: any;
}

export interface StepNotes {
  content?: string;
  path?: string;
}

export interface ActionTreeItem {
  label: string;
  description?: string;
  contextValue?: string;
  tooltip?: string;
  command?: {
    command: string;
    title: string;
    arguments?: any[];
  };
  iconPath?: {
    light: string;
    dark: string;
  };
  collapsibleState?: number;
  children?: ActionTreeItem[];
  resourceUri?: any;
  demo?: Demo;
  step?: Step;
  idx?: number;
  demoIdx?: number;
  hasNotes?: boolean;
}

export interface ExecutingDemoFile {
  filePath: string;
  title: string;
  demoFile: DemoFile;
}

export interface DemoFileCache {
  filePath: string;
  content: string;
  lastModified: number;
}

export interface Subscription {
  dispose(): any;
}

export interface ISlidePreview {
  id: string;
  slide: string;
  notes?: string;
}

export interface IImagePreview {
  id: string;
  image: string;
  alt?: string;
  notes?: string;
}

export interface Action {
  action: string;
  [key: string]: any;
}

export interface SlideMetadata {
  title?: string;
  theme?: string;
  layout?: string;
  background?: string;
  transition?: string;
  notes?: string;
  [key: string]: any;
}
