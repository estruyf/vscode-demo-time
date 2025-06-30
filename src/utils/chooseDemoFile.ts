import { DemoFileProvider } from '../services';

export const chooseDemoFile = async () => {
  const demoFile = await DemoFileProvider.demoQuickPick();
  if (!demoFile?.demo) {
    return;
  }
  const { filePath, demo } = demoFile;

  return {
    filePath,
    demo,
  };
};
