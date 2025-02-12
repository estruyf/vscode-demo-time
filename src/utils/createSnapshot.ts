import { Uri, window } from "vscode";
import { Config, General } from "../constants";
import { fileExists } from "./fileExists";
import { Action, Step } from "../models";
import { Extension, Notifications } from "../services";
import { addStepsToDemo, getFileName, writeFile } from ".";

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
  const fileName = getFileName(activeEditor.document.uri);
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
        return `Snapshot with name "${value}" already exists`;
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
  Notifications.info(`Snapshot ${newFileName} created`);

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

  await addStepsToDemo(steps);
};
