import { Demo, DemoConfig, Slide } from '@demotime/common';

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
  demo?: Demo;
  demoIndex?: number;
  slide?: Slide & { filePath: string; demoTitle: string; demoIndex: number };
  slideIndex?: number;
  totalSlides?: number;
}

export interface DemoOverviewProps {
  demoFiles: DemoFileData[];
  onEditDemo: (fileName: string, demoIndex: number) => void;
  onPlayDemo: (fileName: string, demo: Demo, demoIndex: number) => void;
}
