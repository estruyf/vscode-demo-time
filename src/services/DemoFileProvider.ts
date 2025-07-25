import { Uri, window, workspace } from 'vscode';
import { Extension } from './Extension';
import { DemoFiles, DemoFile, DemoFileType } from '../models';
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
   * Gets the configured default file type for demo files
   * @returns The default file type ('json' or 'yaml')
   */
  public static getDefaultFileType(): DemoFileType {
    const ext = Extension.getInstance();
    return ext.getSetting<DemoFileType>(Config.defaultFileType) ?? 'json';
  }

  /**
   * Gets the appropriate file extension based on file type
   * @param fileType The file type ('json' or 'yaml')
   * @returns The file extension ('.json' or '.yaml')
   */
  private static getFileExtension(fileType: DemoFileType): string {
    return fileType === 'yaml' ? '.yaml' : '.json';
  }

  /**
   * Parses the content of a demo file based on its extension
   * @param content The file content as string
   * @param filePath The file path to determine the format
   * @returns The parsed content as DemoFile object
   */
  public static parseFileContent(content: string, filePath: Uri): DemoFile | undefined {
    const path = filePath.fsPath.toLowerCase();

    if (path.endsWith('.yaml') || path.endsWith('.yml')) {
      try {
        const parsed = yamlLoad(content) as DemoFile;
        return parsed;
      } catch (error) {
        console.error('Error parsing YAML demo file:', error);
        return undefined;
      }
    } else {
      // Default to JSON parsing (supports both .json and .jsonc)
      const parsed = jsonParse(content);
      return parsed;
    }
  }

  /**
   * Generates demo file content based on the file type
   * @param title The demo title
   * @returns The formatted content string
   */
  private static generateFileContent(title: string): unknown {
    const demoContent = {
      $schema: 'https://demotime.show/demo-time.schema.json',
      title: title,
      description: '',
      version: 2,
      demos: [],
    };

    return demoContent;
  }

  /**
   * Formats the provided demo content based on the specified file type.
   *
   * @param fileType - The type of file to format the content for ('yaml' or other).
   * @param demoContent - The content to be formatted.
   * @returns The formatted content as a string.
   */
  public static formatContent(fileType: DemoFileType, demoContent: any): string {
    if (fileType === 'yaml') {
      delete (demoContent as { $schema?: string }).$schema;

      return yamlDump(demoContent, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });
    } else {
      return JSON.stringify(demoContent, null, 2);
    }
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

    return this.parseFileContent(content, filePath);
  }

  /**
   * Retrieves the demo files from the workspace.
   * @returns A promise that resolves to an object containing the demo files, or null if no files are found.
   */
  public static async getFiles(): Promise<DemoFiles | null> {
    let jsonFiles = await workspace.findFiles(`${General.demoFolder}/*.json`, `**/node_modules/**`);
    let yamlFiles = await workspace.findFiles(`${General.demoFolder}/*.yaml`, `**/node_modules/**`);
    let ymlFiles = await workspace.findFiles(`${General.demoFolder}/*.yml`, `**/node_modules/**`);

    let files = [...jsonFiles, ...yamlFiles, ...ymlFiles];

    if (files.length <= 0) {
      return null;
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
   * The file is created at `.demo/demo.json` or `.demo/demo.yaml` based on configuration.
   * @returns A promise that resolves when the file is created.
   */
  public static async createFile(fileName?: string, content?: unknown): Promise<Uri | undefined> {
    const demoName = fileName;
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return;
    }

    const fileType = this.getDefaultFileType();
    const fileExtension = this.getFileExtension(fileType);

    if (fileName) {
      fileName = sanitizeFileName(fileName, fileExtension);
      // Add the appropriate extension if not already present
      if (
        !fileName.endsWith('.json') &&
        !fileName.endsWith('.yaml') &&
        !fileName.endsWith('.yml')
      ) {
        fileName += fileExtension;
      }
    } else {
      fileName = `demo${fileExtension}`;
    }

    const files = await workspace.findFiles(
      `${General.demoFolder}/${fileName}`,
      `**/node_modules/**`,
    );

    if (files.length > 0) {
      return;
    }

    const file = Uri.joinPath(workspaceFolder.uri, General.demoFolder, fileName);

    if (!content) {
      content = this.generateFileContent(demoName || 'Demo');
    }

    const formattedContent = this.formatContent(fileType, content);

    await writeFile(file, formattedContent);

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
