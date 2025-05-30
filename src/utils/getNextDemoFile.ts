import { sortFiles } from ".";
import { DemoFiles, DemoFile } from "../models";
import { FileProvider } from "../services/FileProvider";

export const getNextDemoFile = async (demoFile?: {
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
  const demoFiles: DemoFiles = (await FileProvider.getFiles()) || {};
  const files = sortFiles(demoFiles);
  const fileIdx = files.findIndex((file) => file === demoFile.filePath);
  const nextIdx = fileIdx + 1;

  if (nextIdx >= files.length) {
    return;
  }

  const nextFile = files[nextIdx];
  return {
    filePath: nextFile,
    demo: demoFiles[nextFile],
  };
};
