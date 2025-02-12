import { Uri } from "vscode";
import { Extension, Notifications } from "../services";
import { applyPatch as applyFilePatch } from "diff";
import { getFileContents, writeFile } from ".";

export const applyPatch = async (filePath: Uri, content: string, patch?: string) => {
  if (!patch) {
    Notifications.error("No patch provided");
    return;
  }

  const wsFolder = Extension.getInstance().workspaceFolder;
  if (!wsFolder) {
    return;
  }

  const patchContent = await getFileContents(wsFolder, patch);
  if (!patchContent) {
    Notifications.error("No file content retrieved for the patch");
    return;
  }

  const patched = applyFilePatch(content, patchContent);
  if (!patched) {
    Notifications.error("Could not apply patch to the file");
    return;
  }

  await writeFile(filePath, patched);
};
