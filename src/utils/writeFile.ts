import { Uri, workspace } from "vscode";
import { sleep } from "./sleep";

export const writeFile = async (filePath: Uri, text: string) => {
  await workspace.fs.writeFile(filePath, new TextEncoder().encode(text));
  // Added some sleep to ensure the file is written before proceeding
  // This is a workaround for the issue where the file is not written immediately
  // and the next operation fails.
  await sleep(100);
};
