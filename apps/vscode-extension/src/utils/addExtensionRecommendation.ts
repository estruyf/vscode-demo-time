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
    let contents: { recommendations: string[] } = {
      recommendations: [],
    };

    // Check if file exists
    if (await fileExists(extensionsFile)) {
      const data = await readFile(extensionsFile);
      contents = JSON.parse(data);
    }

    // Check if the extension is already recommended
    if (contents.recommendations.includes(id)) {
      return;
    }

    contents.recommendations.push(id);

    await writeFile(extensionsFile, JSON.stringify(contents, null, 2));
  } catch (error) {
    Logger.error((error as Error).message);
  }
};
