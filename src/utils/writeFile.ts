import { Uri, workspace } from "vscode";

export const writeFile = async (filePath: Uri, text: string) => {
  await workspace.fs.writeFile(filePath, new TextEncoder().encode(text));
};
