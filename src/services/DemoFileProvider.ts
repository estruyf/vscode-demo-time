import { Uri, window, workspace } from 'vscode';
import { Extension } from './Extension';
import { DemoFiles, DemoFile } from '../models';
import { Config, General } from '../constants';
import { parse as jsonParse } from 'jsonc-parser';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import { createDemoFile, readFile, sanitizeFileName, sortFiles, writeFile } from '../utils';
import { Preview } from '../preview/Preview';

export class DemoFileProvider {
  public static register() {
    const subscriptions = Extension.getInstance().subscriptions;

    subscriptions.push(
      workspace.onDidSaveTextDocument((e) => {
        if (e.uri.fsPath.endsWith(`.md`)) {
          Preview.triggerUpdate(e.uri);
        }
      }),
    );
  }

  /**
   * Retrieves the content of a file as a JSON object.
   * @param filePath - The path of the file to read.
   * @returns A Promise that resolves to the JSON object representing the file content, or undefined if the file is empty or not valid JSON.
   */
  public static async getFile(filePath: Uri): Promise<DemoFile | undefined> {
    const content = await readFile(filePath);
    if (!content) {
      return;
    }

    let parsed: any;
    if (filePath.fsPath.endsWith('.yaml')) {
      parsed = yamlLoad(content);
    } else {
      parsed = jsonParse(content);
    }

    if (!parsed) {
      return;
    }

    return parsed as DemoFile;
  }

  /**
   * Retrieves the demo files from the workspace.
   * @returns A promise that resolves to an object containing the demo files, or null if no files are found.
   */
  public static async getFiles(): Promise<DemoFiles | null> {
    const fileType = Extension.getInstance().getSetting<string>(Config.defaultDemoFileType) || 'json';
    let files = await workspace.findFiles(
      `${General.demoFolder}/*.${fileType}`,
      `**/node_modules/**`,
    );

    if (files.length <= 0) {
      const jsonFiles = await workspace.findFiles(`${General.demoFolder}/*.json`, `**/node_modules/**`);
      const yamlFiles = await workspace.findFiles(`${General.demoFolder}/*.yaml`, `**/node_modules/**`);
      files = [...jsonFiles, ...yamlFiles];
      if (files.length <= 0) {
        return null;
      }
    }

    // Exclude the constants file
    files = files.filter((file) => !file.path.endsWith(General.variablesFile));

    const demoFiles: DemoFiles = {};

    for (const file of files) {
      const content = await DemoFileProvider.getFile(file);
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
  public static async demoQuickPick(): Promise<{ filePath: string; demo: DemoFile } | undefined> {
    let demoFiles = await DemoFileProvider.getFiles();
    if (!demoFiles) {
      return;
    }

    const files = sortFiles(demoFiles);
    const demoFileOptions = files.map((path) => {
      return {
        label: (demoFiles as any)[path].title,
        description: path.split('/').pop(),
      };
    });

    demoFileOptions.push({ label: 'Create new file', description: '' });

    const demoFilePick = await window.showQuickPick(demoFileOptions, {
      title: Config.title,
      placeHolder: 'Select a demo file',
    });

    if (!demoFilePick) {
      return;
    }

    let demoFilePath: string | undefined = undefined;
    if (demoFilePick.label === 'Create new file') {
      const file = await createDemoFile();
      if (!file) {
        return;
      }

      demoFilePath = file.path;
      demoFiles = await DemoFileProvider.getFiles();
    } else if (!demoFilePick.description) {
      return;
    } else {
      demoFilePath = sortFiles(demoFiles).find((path) =>
        path.endsWith(demoFilePick.description as string),
      );
      if (!demoFilePath) {
        return;
      }
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
  public static async createFile(fileName?: string, content?: string): Promise<Uri | undefined> {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return;
    }

    const demoTitle = fileName || 'Demo';
    const fileType = Extension.getInstance().getSetting<string>(Config.defaultDemoFileType) || 'json';

    if (fileName) {
      fileName = sanitizeFileName(fileName).replace(/\.(json|yaml)$/i, '');
    }

    const targetFileName = `${fileName || 'demo'}.${fileType}`;

    const files = await workspace.findFiles(
      `${General.demoFolder}/${targetFileName}`,
      `**/node_modules/**`,
    );

    if (files.length > 0) {
      return;
    }

    const file = Uri.joinPath(workspaceFolder.uri, General.demoFolder, targetFileName);

    if (!content) {
      if (fileType === 'yaml') {
        content = yamlDump({
          $schema: 'https://demotime.show/demo-time.schema.json',
          title: demoTitle,
          description: '',
          version: 2,
          demos: [],
        });
      } else {
        content = `{
  "$schema": "https://demotime.show/demo-time.schema.json",
  "title": "${demoTitle}",
  "description": "",
  "version": 2,
  "demos": []
}`;
      }
    }

    await writeFile(file, content);

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
    await writeFile(file, content);
  }
}
