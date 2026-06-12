import { Version } from './Version';

export interface DemoFileCache {
  filePath: string;
  demo: DemoCache[];
  version?: Version;
}

export interface DemoCache {
  idx: number;
  title: string;
  id?: string;
}
