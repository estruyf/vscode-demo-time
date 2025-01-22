import { Uri, window, workspace } from "vscode";
import { Extension } from "./Extension";
import { DemoFiles, Demos } from "../models";
import { Config, General } from "../constants";
import { parse as jsonParse } from "jsonc-parser";

export class FileProvider {
  /**
   * Retrieves the content of a file as a JSON object.
   * @param filePath - The path of the file to read.
   * @returns A Promise that resolves to the JSON object representing the file content, or undefined if the file is empty or not valid JSON.
   */
  public static async getFile(filePath: Uri): Promise<Demos | undefined> {
    const rawContent = await workspace.fs.readFile(filePath);
    const content = new TextDecoder().decode(rawContent);
    if (!content) {
      return;
    }

    const json = jsonParse(content);
    if (!json) {
      return;
    }

    return json;
  }

  /**
   * Retrieves the demo files from the workspace.
   * @returns A promise that resolves to an object containing the demo files, or null if no files are found.
   */
  public static async getFiles(): Promise<DemoFiles | null> {
    let files = await workspace.findFiles(`${General.demoFolder}/*.json`, `**/node_modules/**`);

    if (files.length <= 0) {
      return null;
    }

    // Exclude the constants file
    files = files.filter((file) => !file.path.endsWith(General.variablesFile));

    const demoFiles: DemoFiles = {};

    for (const file of files) {
      const content = await FileProvider.getFile(file);
      if (!content) {
        continue;
      }

      demoFiles[file.path] = content;
    }

    return demoFiles;
  }

  /**
   * Retrieves a demo file using a quick pick dialog.
   * @returns The selected demo file, or undefined if no file was selected.
   */
  public static async demoQuickPick(): Promise<{ filePath: string; demo: Demos } | undefined> {
    const demoFiles = await FileProvider.getFiles();
    if (!demoFiles) {
      return;
    }

    const files = Object.keys(demoFiles).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    const demoFileOptions = files.map((path) => {
      return {
        label: (demoFiles as any)[path].title,
        description: path.split("/").pop(),
      };
    });

    const demoFilePick = await window.showQuickPick(demoFileOptions, {
      title: Config.title,
      placeHolder: "Select a demo file",
    });

    if (!demoFilePick || !demoFilePick.description) {
      return;
    }

    const demoFilePath = Object.keys(demoFiles).find((path) => path.endsWith(demoFilePick.description as string));

    if (!demoFilePath) {
      return;
    }

    const demo = (demoFiles as DemoFiles)[demoFilePath];
    return {
      filePath: demoFilePath,
      demo: demo,
    };
  }

  /**
   * Creates a demo file if it doesn't exist in the workspace.
   * The file is created at `.demo/demo.json` with initial content.
   * @returns A promise that resolves when the file is created.
   */
  public static async createFile(): Promise<Uri | undefined> {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return;
    }

    const files = await workspace.findFiles(`${General.demoFolder}/demo.json`, `**/node_modules/**`);

    if (files.length > 0) {
      return;
    }

    const file = Uri.joinPath(workspaceFolder.uri, General.demoFolder, `demo.json`);
    const content = `{
  "$schema": "https://demotime.elio.dev/demo-time.schema.json",
  "title": "Demo",
  "description": "Demo description",
  "demos": []
}`;

    await workspace.fs.writeFile(file, new TextEncoder().encode(content));

    return file;
  }

  /**
   * Saves the file with the specified content.
   * @param filePath - The path of the file to save.
   * @param content - The content to write to the file.
   */
  public static async saveFile(filePath: string, content: any) {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return;
    }

    const file = Uri.file(filePath);
    await workspace.fs.writeFile(file, new TextEncoder().encode(content));
  }
}
