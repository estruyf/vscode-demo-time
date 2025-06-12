import { Uri } from "vscode";
import { Extension } from "../services/Extension";
import { fileExists } from "./fileExists";
import { Logger } from "../services/Logger";
import { readFile, writeFile } from ".";

export const addExtensionRecommendation = async () => {
  try {
    const extension = Extension.getInstance();
    const id = extension.id;

    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return;
    }

    const extensionsFile = Uri.joinPath(workspaceFolder.uri, ".vscode/extensions.json");
    let contents: { recommendations?: string[]; [key: string]: any } = {}; // Allow recommendations to be optional and other props

    // Check if file exists
    if (await fileExists(extensionsFile)) {
      const data = await readFile(extensionsFile);
      try {
        contents = JSON.parse(data);
        // Ensure contents is an object, even if JSON is valid but not an object (e.g. "null" or "true")
        if (contents === null || typeof contents !== 'object') {
          contents = {};
        }
      } catch (e) {
        Logger.error(`Failed to parse .vscode/extensions.json: ${(e as Error).message}`);
        // If parsing fails, treat as if the file had no valid recommendations section.
        // The function will then proceed to create/add recommendations.
        contents = {};
      }
    }

    // Ensure contents.recommendations is an array
    if (!contents.recommendations || !Array.isArray(contents.recommendations)) {
      contents.recommendations = [];
    }

    // Check if the extension is already recommended
    if (contents.recommendations.includes(id)) {
      return;
    }

    contents.recommendations.push(id);

    await writeFile(extensionsFile, JSON.stringify(contents, null, 2));
  } catch (error) {
    // Log the original error's message, but also consider logging the error object itself for more details
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(errorMessage);
    // Optionally, rethrow or handle more gracefully if needed,
    // for now, it logs and exits the function for this operation.
  }
};
