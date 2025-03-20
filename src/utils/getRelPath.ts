import { Extension } from "../services";

export const getRelPath = (path: string) => {
  const workspaceFolder = Extension.getInstance().workspaceFolder;
  if (!workspaceFolder) {
    return path;
  }
  const relativePath = path.replace(workspaceFolder.uri.path, "");
  return relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
};
