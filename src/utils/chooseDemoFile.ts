import { FileProvider } from "../services";

export const chooseDemoFile = async () => {
  const demoFile = await FileProvider.demoQuickPick();
  if (!demoFile?.demo) {
    return;
  }
  const { filePath, demo } = demoFile;

  return {
    filePath,
    demo,
  };
};
