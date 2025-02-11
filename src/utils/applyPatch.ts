import { Uri } from "vscode";
import { Extension } from "../services";
import { applyPatch as applyFilePatch } from "diff";
import { readFile, writeFile } from ".";

export const applyPatch = async (filePath: Uri, content: string) => {
  const wsFolder = Extension.getInstance().workspaceFolder;
  if (!wsFolder) {
    return;
  }

  const text = await readFile(filePath);
  const patched = applyFilePatch(text, content);
  if (!patched) {
    return;
  }

  await writeFile(filePath, patched);
};
