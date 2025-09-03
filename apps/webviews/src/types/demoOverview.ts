import { DemoConfig } from './demo';

export interface DemoFileData {
  fileName: string;
  filePath: string;
  config: DemoConfig;
  startingIndex: number; // Starting global index for this file
}

export interface OverviewGridItem {
  type: 'demo' | 'slide';
  globalIndex: number;
  fileIndex: number; // Index within the file
  fileName: string;
  filePath: string;
  demo?: any;
  demoIndex?: number;
  slide?: any;
  slideIndex?: number;
}

export interface DemoOverviewProps {
  demoFiles: DemoFileData[];
  onEditDemo: (fileName: string, demoIndex: number) => void;
  onPlayDemo: (fileName: string, demo: any, demoIndex: number) => void;
}