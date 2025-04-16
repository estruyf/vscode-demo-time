import { sortFiles } from ".";
import { DemoFiles, Demos } from "../models";
import { FileProvider } from "../services/FileProvider";

export const getPreviousDemoFile = async (demoFile?: {
  filePath: string;
}): Promise<
  | {
      filePath: string;
      demo: Demos;
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
