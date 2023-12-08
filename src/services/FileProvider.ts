import { Uri, window, workspace } from "vscode";
import { Extension } from "./Extension";
import { DemoFiles, Demos } from "../models";

export class FileProvider {
  /**
   * Retrieves the demo files from the workspace.
   * @returns A promise that resolves to an object containing the demo files, or null if no files are found.
   */
  public static async getFiles(): Promise<DemoFiles | null> {
    const files = await workspace.findFiles(
      `.demo/*.json`,
      `**/node_modules/**`
    );

    if (files.length <= 0) {
      return null;
    }

    const demoFiles: DemoFiles = {};

    for (const file of files) {
      const rawContent = await workspace.fs.readFile(file);
      const content = new TextDecoder().decode(rawContent);
      if (!content) {
        continue;
      }

      const json = JSON.parse(content);
      if (!json) {
        continue;
      }

      demoFiles[file.path] = json;
    }

    return demoFiles;
  }

  /**
   * Retrieves a demo file using a quick pick dialog.
   * @returns The selected demo file, or undefined if no file was selected.
   */
  public static async demoQuickPick(): Promise<
    { filePath: string; demo: Demos } | undefined
  > {
    const demoFiles = await FileProvider.getFiles();
    if (!demoFiles) {
      return;
    }

    const demoFileOptions = Object.keys(demoFiles).map((path) => {
      return {
        label: (demoFiles as any)[path].title,
        description: path.split("/").pop(),
      };
    });

    const demoFilePick = await window.showQuickPick(demoFileOptions, {
      title: "Demo time!",
      placeHolder: "Select a demo file",
    });

    if (!demoFilePick || !demoFilePick.description) {
      return;
    }

    const demoFilePath = Object.keys(demoFiles).find((path) =>
      path.endsWith(demoFilePick.description as string)
    );

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
  public static async createFile() {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return;
    }

    const files = await workspace.findFiles(
      `.demo/demo.json`,
      `**/node_modules/**`
    );

    if (files.length > 0) {
      return;
    }

    const file = Uri.joinPath(workspaceFolder.uri, `.demo/demo.json`);
    const content = `{
  "$schema": "https://elio.dev/demo-time.schema.json",
  "title": "Demo",
  "description": "Demo description",
  "demos": []
}`;

    await workspace.fs.writeFile(file, new TextEncoder().encode(content));
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
