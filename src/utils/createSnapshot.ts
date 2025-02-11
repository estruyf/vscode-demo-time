import { Uri, window, workspace } from "vscode";
import { Config, General } from "../constants";
import { fileExists } from "./fileExists";
import { parseWinPath } from "./parseWinPath";
import { Action, Step } from "../models";
import { DemoCreator, Extension, FileProvider, Notifications } from "../services";
import { DemoPanel } from "../panels/DemoPanel";
import { writeFile } from ".";

export const createSnapshot = async () => {
  const activeEditor = window.activeTextEditor;
  if (!activeEditor) {
    return;
  }

  const wsFolder = Extension.getInstance().workspaceFolder;
  if (!wsFolder) {
    return;
  }

  const text = activeEditor.document.getText();
  const crntFilePath = parseWinPath(activeEditor.document.fileName);
  const fileName = Uri.file(crntFilePath).path.split("/").pop() ?? "";
  if (!fileName) {
    return;
  }

  // Add .snapshot. to the name
  const fileParts = fileName.split(".");
  fileParts.splice(fileParts.length - 1, 0, "snapshot");
  let newFileName: string | undefined = fileParts.join(".");

  newFileName = await window.showInputBox({
    prompt: "Enter the name of the snapshot",
    value: newFileName,
    ignoreFocusOut: true,
    title: Config.title,
    validateInput: async (value) => {
      const newFilePath = Uri.joinPath(wsFolder.uri, General.demoFolder, General.snapshotsFolder, value);
      if (await fileExists(newFilePath)) {
        return `File ${newFileName} already exists`;
      }
      return null;
    },
  });

  if (!newFileName) {
    Notifications.error("Snapshot name is required");
    return;
  }

  const newFilePath = Uri.joinPath(wsFolder.uri, General.demoFolder, General.snapshotsFolder, newFileName);
  if (await fileExists(newFilePath)) {
    Notifications.error(`Snapshot ${newFileName} already exists`);
    return;
  }

  await writeFile(newFilePath, text);

  // Ask the user if they want to create a new demo starting from this file
  const createDemo = await window.showInformationMessage(
    "Do you want to create a demo starting from this file?",
    { modal: true },
    "Yes",
    "No"
  );

  if (createDemo === "No") {
    return;
  }

  const relFilePath = activeEditor.document.uri.path.replace(wsFolder.uri.path || "", "");
  const steps: Step[] = [
    {
      action: Action.Create,
      path: relFilePath,
      contentPath: newFilePath.path.replace(Uri.joinPath(wsFolder.uri, General.demoFolder).path, ""),
    },
    {
      action: Action.Open,
      path: relFilePath,
    },
  ];

  const demoFile = await FileProvider.demoQuickPick();
  if (!demoFile?.demo) {
    return;
  }
  const { filePath, demo } = demoFile;

  const updatedDemos = await DemoCreator.askWhereToAddStep(demo, steps);
  if (!updatedDemos) {
    return;
  }

  demo.demos = updatedDemos;

  await FileProvider.saveFile(filePath, JSON.stringify(demo, null, 2));

  // Trigger a refresh of the treeview
  DemoPanel.update();
};
