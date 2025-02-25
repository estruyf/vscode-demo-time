import { Step } from "../models";
import { DemoPanel } from "../panels/DemoPanel";
import { DemoCreator, FileProvider } from "../services";

export const addStepsToDemo = async (steps: Step | Step[], title?: string, description?: string) => {
  const demoFile = await FileProvider.demoQuickPick();
  if (!demoFile?.demo) {
    return;
  }
  const { filePath, demo } = demoFile;

  const updatedDemos = await DemoCreator.askWhereToAddStep(demo, steps, title, description);
  if (!updatedDemos) {
    return;
  }

  demo.demos = updatedDemos;

  await FileProvider.saveFile(filePath, JSON.stringify(demo, null, 2));

  // Trigger a refresh of the treeview
  DemoPanel.update();
};
