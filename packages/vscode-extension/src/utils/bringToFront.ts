import { exec } from "child_process";
import { Extension } from "../services/Extension";

export const bringToFront = () => {
  return new Promise<void>((resolve) => {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return;
    }
    exec(`code .`, { cwd: workspaceFolder?.uri.fsPath }, () => {
      resolve();
    });
  });
};
