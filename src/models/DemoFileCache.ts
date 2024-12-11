export interface DemoFileCache {
  filePath: string;
  demo: DemoCache[];
}

export interface DemoCache {
  idx: number;
  title: string;
  id?: string;
}
