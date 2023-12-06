import { Uri, workspace } from "vscode";
import { Extension } from "./Extension";

export class FileProvider {
  public static async getFile() {
    const files = await workspace.findFiles(
      `.demo/demo.json`,
      `**/node_modules/**`
    );

    if (files.length <= 0) {
      return null;
    }

    const file = files[0];
    const rawContent = await workspace.fs.readFile(file);
    const content = new TextDecoder().decode(rawContent);
    if (!content) {
      return null;
    }

    const json = JSON.parse(content);
    if (!json) {
      return null;
    }

    return json;
  }

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
  "title": "Demo",
  "description": "Demo description",
  "demos": []
}`;

    await workspace.fs.writeFile(file, new TextEncoder().encode(content));
  }

  public static async saveFile(content: any) {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return;
    }

    const file = Uri.joinPath(workspaceFolder.uri, `.demo/demo.json`);
    await workspace.fs.writeFile(file, new TextEncoder().encode(content));
  }
}
