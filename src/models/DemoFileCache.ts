export interface DemoFileCache {
  filePath: string;
  demo: {
    idx: number;
    title: string;
    id?: string;
  }[];
}
