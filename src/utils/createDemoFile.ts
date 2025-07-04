import { Uri, window } from "vscode";
import { Config, General } from "../constants";
import { Extension, FileProvider } from "../services";
import { DemoFileType } from "../models";
import { sanitizeFileName } from "./sanitizeFileName";
import { fileExists } from "./fileExists";

export const createDemoFile = async (openFile = false) => {
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

      // Get the configured file type and extension
      const ext = Extension.getInstance();
      const fileType = ext.getSetting<DemoFileType>(Config.defaultFileType) || 'json';
      const fileExtension = fileType === 'yaml' ? '.yaml' : '.json';
      
      // Add extension if not already present
      if (!value.endsWith('.json') && !value.endsWith('.yaml') && !value.endsWith('.yml')) {
        value += fileExtension;
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

  if (openFile) {
    await window.showTextDocument(file);
  }

  return file;
};
