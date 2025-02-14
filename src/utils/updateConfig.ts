import { ConfigurationTarget, workspace } from "vscode";

export const updateConfig = async (key: string, value: any) => {
  const config = workspace.getConfiguration();
  await config.update(key, value === null ? undefined : value, ConfigurationTarget.Workspace);
  return;
};
