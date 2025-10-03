export interface DemoStep {
  collapsibleState: number;
  label: string;
  demoFilePath: string;
  stepIndex: number;
  originalLabel: string;
  isActive: boolean;
  hasExecuted: boolean;
  disabled: boolean;
  description: string;
  tooltip: string;
  notes?: string;
  iconPath: {
    id: string;
    color: {
      id: string;
    };
  };
  command: {
    command: string;
    title: string;
    arguments: any[];
  };
  contextValue: string;
  id?: string;
}

export interface DemoFile {
  collapsibleState: number;
  label: string;
  children: DemoStep[];
  demoFilePath: string;
  description: string;
  tooltip: string;
  iconPath: {
    id: string;
    color: {
      id: string;
    };
  };
  contextValue: string;
}

export interface NextDemo {
  title: string;
}

export interface ApiData {
  nextDemo?: NextDemo;
  demos: DemoFile[];
  currentDemoFile?: string;
  previousEnabled?: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  url?: string;
  error?: string;
}
