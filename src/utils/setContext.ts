import { commands } from "vscode";

export const setContext = async (key: string, value: any) => {
  await commands.executeCommand("setContext", key, value);
};
