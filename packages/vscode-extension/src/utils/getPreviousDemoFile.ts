import { sortFiles } from '.';
import { DemoFiles, DemoFile } from '../models';
import { DemoFileProvider } from '../services/DemoFileProvider';

export const getPreviousDemoFile = async (demoFile?: {
  filePath: string;
}): Promise<
  | {
      filePath: string;
      demo: DemoFile;
    }
  | undefined
> => {
  if (!demoFile) {
    return;
  }

  // Get the next demo file
  const demoFiles: DemoFiles = (await DemoFileProvider.getFiles()) || {};
  const files = sortFiles(demoFiles);
  const fileIdx = files.findIndex((file) => file === demoFile.filePath);
  const previousIdx = fileIdx - 1;

  if (previousIdx < 0) {
    return;
  }

  const nextFile = files[previousIdx];
  return {
    filePath: nextFile,
    demo: demoFiles[nextFile],
  };
};
