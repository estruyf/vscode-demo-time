import { DemoFile, Icons, Step } from '../models';
import { DemoPanel } from '../panels/DemoPanel';
import { DemoCreator, DemoFileProvider } from '../services';

export const addStepsToDemo = async (
  steps: Step | Step[],
  demoFile?: {
    filePath: string;
    demo: DemoFile;
  },
  title?: string,
  description?: string,
  icons?: Icons,
) => {
  if (!demoFile?.filePath || !demoFile?.demo) {
    return;
  }

  const demoFileToUpdate = await DemoCreator.askWhereToAddStep(
    demoFile.demo,
    steps,
    title,
    description,
    icons,
  );
  if (!demoFileToUpdate) {
    return;
  }

  demoFile.demo.demos = demoFileToUpdate.demos;

  await DemoFileProvider.saveFile(demoFile.filePath, JSON.stringify(demoFile.demo, null, 2));

  // Trigger a refresh of the treeview
  DemoPanel.update();
};
