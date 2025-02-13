import { Uri, window } from "vscode";
import { Config, General } from "../constants";
import { Extension, FileProvider } from "../services";
import { sanitizeFileName } from "./sanitizeFileName";
import { fileExists } from "./fileExists";

export const createDemoFile = async () => {
  const wsFolder = Extension.getInstance().workspaceFolder;
  if (!wsFolder) {
    return;
  }

  const demoName = await window.showInputBox({
    title: Config.title,
    placeHolder: "Enter the name of the demo file",
    validateInput: async (value) => {
      value = sanitizeFileName(value);
      if (!value) {
        return "File name is required";
      }

      const newFilePath = Uri.joinPath(wsFolder.uri, General.demoFolder, value);
      if (await fileExists(newFilePath)) {
        return `Demo file with name "${value}" already exists`;
      }
      return null;
    },
  });

  if (!demoName) {
    return;
  }

  const file = await FileProvider.createFile(demoName.trim());
  if (!file) {
    return;
  }

  await window.showTextDocument(file);
};
