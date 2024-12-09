import { DemoFiles, Demos } from "../models";
import { FileProvider } from "../services/FileProvider";

export const getNextDemoFile = async (demoFile?: {
  filePath: string;
}): Promise<{
  filePath: string;
  demo: Demos;
} | undefined> => {
  if (!demoFile) {
    return;
  }

  // Get the next demo file
  const demoFiles: DemoFiles = await FileProvider.getFiles() || {};
  const files = Object.keys(demoFiles).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
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