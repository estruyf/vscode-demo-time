import { COMMAND, Config, ContextKeys, StateKeys } from "../constants";
import { Demo, DemoFileCache, Demos, Step, Subscription } from "../models";
import { Extension } from "./Extension";
import {
  ConfigurationTarget,
  Position,
  Range,
  Selection,
  Terminal,
  TextDocument,
  TextEditor,
  TextEditorRevealType,
  Uri,
  WorkspaceEdit,
  commands,
  window,
  workspace,
} from "vscode";
import { FileProvider } from "./FileProvider";
import { DemoPanel } from "../panels/DemoPanel";
import {
  getVariables,
  getFileContents,
  getLineInsertionSpeed,
  getLineRange,
  insertContent,
  insertLineByLine,
  replaceContent,
  sleep,
  getNextDemoFile,
  getPreviousDemoFile,
} from "../utils";
import { ActionTreeItem } from "../providers/ActionTreeviewProvider";
import { DecoratorService } from "./DecoratorService";
import { Notifications } from "./Notifications";
import { parse as jsonParse } from "jsonc-parser";
import { Logger } from "./Logger";
import { insertVariables } from "../utils/insertVariables";

const DEFAULT_START_VALUE = {
  filePath: "",
  demo: [],
};

export class DemoRunner {
  private static isPresentationMode = false;
  private static terminal: Terminal | null;
  private static readonly terminalName = "DemoTime";

  /**
   * Registers the commands for the demo runner.
   */
  public static registerCommands() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(commands.registerCommand(COMMAND.start, DemoRunner.start));
    subscriptions.push(commands.registerCommand(COMMAND.previous, DemoRunner.previous));
    subscriptions.push(commands.registerCommand(COMMAND.togglePresentationMode, DemoRunner.togglePresentationMode));
    subscriptions.push(commands.registerCommand(COMMAND.runStep, DemoRunner.startDemo));
    subscriptions.push(commands.registerCommand(COMMAND.runById, DemoRunner.runById));
    subscriptions.push(commands.registerCommand(COMMAND.reset, DemoRunner.reset));

    DemoRunner.allowPrevious();
  }

  /**
   * Retrieves the executed demo file.
   * @returns {Promise<DemoFileCache>} The executed demo file.
   */
  public static async getExecutedDemoFile(): Promise<DemoFileCache> {
    const ext = Extension.getInstance();
    const demoFile = ext.getState<DemoFileCache>(StateKeys.executingDemoFile);
    if (!demoFile) {
      return Object.assign({}, DEFAULT_START_VALUE);
    }

    return demoFile;
  }

  /**
   * Sets the context key for enabling or disabling the "previous" functionality
   * based on the configuration setting.
   * 
   * @returns {Promise<void>} A promise that resolves when the context key has been set.
   */
  public static async allowPrevious(): Promise<void> {
    const previousEnabled = Extension.getInstance().getSetting<boolean>(Config.presentationMode.previousEnabled) || false;
    await commands.executeCommand("setContext", ContextKeys.previousEnabled, previousEnabled);
  }

  /**
   * Sets the executed demo file in the extension state.
   * @param demoFile - The demo file to be set as executed.
   */
  private static async setExecutedDemoFile(demoFile: DemoFileCache) {
    const ext = Extension.getInstance();
    await ext.setState(StateKeys.executingDemoFile, demoFile);
  }

  /**
   * Toggles the presentation mode for the demo runner.
   * If `enable` parameter is provided, it sets the presentation mode to the specified value.
   * If `enable` parameter is not provided, it toggles the presentation mode.
   * @param enable - Optional. Specifies whether to enable or disable the presentation mode.
   * @returns A promise that resolves when the presentation mode is toggled.
   */
  private static async togglePresentationMode(enable?: boolean): Promise<void> {
    DemoRunner.isPresentationMode = typeof enable !== "undefined" ? enable : !DemoRunner.isPresentationMode;
    await commands.executeCommand("setContext", ContextKeys.presentation, DemoRunner.isPresentationMode);
    if (DemoRunner.isPresentationMode) {
      DemoPanel.updateTitle("Demo time (Presentation mode)");
      await DemoRunner.getDemoFile();
    } else {
      DemoPanel.updateTitle("Demo time");
    }
    DemoPanel.update();
  }

  /**
   * Resets the DemoRunner state by clearing the executing demo file path and demo array.
   */
  private static async reset(): Promise<void> {
    const ext = Extension.getInstance();
    ext.setState(StateKeys.executingDemoFile, Object.assign({}, DEFAULT_START_VALUE));
    DemoRunner.togglePresentationMode(false);
    DemoPanel.update();
  }

  /**
   * Starts the demo runner or runs the next demo step.
   * 
   * @returns {Promise<void>} A promise that resolves when the demo runner has started.
   */
  private static async start(item: ActionTreeItem | { demoFilePath: string; description: string; }): Promise<void> {
    const executingFile = await DemoRunner.getExecutedDemoFile();

    const demoFile = await DemoRunner.getDemoFile(item);
    let demos: Demo[] = demoFile?.demo.demos || [];

    if (demos.length <= 0) {
      Notifications.error("No demo steps found");
      return;
    }

    // Get the first demo step to start
    const lastDemo = executingFile.demo[executingFile.demo.length - 1] || 0;
    const demoIdxToRun = demos.findIndex((d) => (d.id ? d.id === lastDemo.id : d.title === lastDemo.title));
    const nextDemo = demos[demoIdxToRun + 1];

    if (!nextDemo) {
      // Check if there is a next demo file
      const nextFile = await getNextDemoFile(demoFile);
      if (!nextFile) {
        Notifications.info("All demo steps have been executed");
        return;
      }

      // Set the current executing file to the next file
      executingFile.filePath = nextFile.filePath;
      executingFile.demo = [];
      await DemoRunner.setExecutedDemoFile(executingFile);
      // Start the next demo file
      DemoRunner.start({
        demoFilePath: nextFile.filePath,
        description: nextFile.filePath.split("/").pop(),
      });
      return;
    }

    const demoSteps = nextDemo.steps;
    if (!demoSteps) {
      return;
    }

    executingFile.demo.push({
      idx: demoIdxToRun,
      title: nextDemo.title,
      id: nextDemo.id,
    });

    await DemoRunner.setExecutedDemoFile(executingFile);
    await DemoRunner.runSteps(demoSteps);
  }

  
  /**
   * Executes the previous demo step.
   * 
   * @returns {Promise<void>} A promise that resolves when the previous demo step has been executed.
   */
  private static async previous(): Promise<void> {
    const executingFile = await DemoRunner.getExecutedDemoFile();
    const filePath = executingFile.filePath;
    if (!filePath) {
      return;
    }

    const demoFile = await FileProvider.getFile(Uri.file(filePath));
    const demos = demoFile?.demos || [];

    if (demos.length <= 0) {
      Notifications.error("No demo steps found");
      return;
    }

    // Get the previous demo step to start
    const lastDemo = executingFile.demo[executingFile.demo.length - 1] || 0;
    const demoIdxToRun = demos.findIndex((d) => (d.id ? d.id === lastDemo.id : d.title === lastDemo.title));
    const previousDemo = demos[demoIdxToRun - 1];

    if (!previousDemo) {
      const previousFile = await getPreviousDemoFile({
        filePath,
      });
      if (!previousFile) {
        Notifications.info("No previous demo steps found");
        return;
      }

      executingFile.filePath = previousFile.filePath;
      executingFile.demo = [];
      // Get the last demo step of the previous file
      const lastDemo = previousFile.demo.demos[previousFile.demo.demos.length - 1];
      executingFile.demo.push({
        idx: previousFile.demo.demos.length - 1,
        title: lastDemo.title,
        id: lastDemo.id,
      });

      await DemoRunner.setExecutedDemoFile(executingFile);
      await DemoRunner.runSteps(lastDemo.steps);
      return;
    }

    const demoSteps = previousDemo.steps;
    if (!demoSteps) {
      return;
    }

    executingFile.demo.push({
      idx: demoIdxToRun,
      title: previousDemo.title,
      id: previousDemo.id,
    });

    await DemoRunner.setExecutedDemoFile(executingFile);
    await DemoRunner.runSteps(demoSteps);
  }

  /**
   * Starts the execution of a demo.
   * @param demoToRun - The demo to run.
   * @returns A promise that resolves when the demo execution is complete.
   */
  private static async startDemo(demoToRun: { filePath: string; idx: number; demo: Demo }): Promise<void> {
    if (!demoToRun) {
      return;
    }

    if (demoToRun.demo.steps.length <= 0) {
      return;
    }

    const executingFile = await DemoRunner.getExecutedDemoFile();
    if (executingFile.filePath !== demoToRun.filePath) {
      executingFile.filePath = demoToRun.filePath;
      executingFile.demo = [];
    }

    executingFile.demo.push({
      idx: demoToRun.idx,
      title: demoToRun.demo.title,
      id: demoToRun.demo.id,
    });

    await DemoRunner.setExecutedDemoFile(executingFile);
    await DemoRunner.runSteps(demoToRun.demo.steps);
  }

  private static async runById(...args: string[]): Promise<void> {
    if (args.length <= 0) {
      return;
    }

    const id = args[0];
    Logger.info(`Running demo with id: ${id}`);

    // Get all the demo files
    const demoFiles = await FileProvider.getFiles();
    if (!demoFiles) {
      return;
    }

    // Find the demo file that contains the specified id
    let filePath = null;
    let demo = null;
    for (const crntFilePath in demoFiles) {
      const demos = demoFiles[crntFilePath].demos;
      const crntDemo = demos.find((demo) => demo.id === id);
      if (crntDemo) {
        filePath = crntFilePath;
        break;
      }
    }

    if (!filePath) {
      Notifications.error("No demo found with the specified id");
      return;
    }

    const executingFile = await DemoRunner.getExecutedDemoFile();
    if (executingFile.filePath !== filePath) {
      executingFile.filePath = filePath;
      executingFile.demo = [];
    }

    // Get the demo idx
    const demoIdx = demoFiles[filePath].demos.findIndex((demo) => demo.id === id);
    if (demoIdx < 0) {
      Notifications.error("No demo found with the specified id");
      return;
    }
    const demoToRun = demoFiles[filePath].demos[demoIdx];

    executingFile.demo.push({
      idx: demoIdx,
      title: demoToRun.title,
      id: demoToRun.id,
    });

    await DemoRunner.setExecutedDemoFile(executingFile);
    await DemoRunner.runSteps(demoToRun.steps);
  }

  /**
   * Runs the given demo steps.
   * @param demoSteps An array of Step objects representing the steps to be executed.
   */
  private static async runSteps(demoSteps: Step[]): Promise<void> {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return;
    }

    let variables = await getVariables(workspaceFolder);
    if (variables && Object.keys(variables)) {
      let tempSteps = JSON.stringify(demoSteps);
      tempSteps = insertVariables(tempSteps, variables);
      demoSteps = jsonParse(tempSteps);
    }

    // Replace the snippets in the demo steps
    const stepsToExecute: Step[] = [];
    if (demoSteps.some((step) => step.action === "snippet")) {
      for (const step of demoSteps) {
        if (step.action === "snippet") {
          let snippet = await getFileContents(workspaceFolder, step.contentPath);
          if (!snippet) {
            return;
          }

          // Replace the argument variables in the snippet
          const args = step.args || {};
          snippet = insertVariables(snippet, args);

          // Replace the variables in the snippet
          if (variables && Object.keys(variables)) {
            snippet = insertVariables(snippet, variables);
          }

          const newSteps = jsonParse(snippet);
          stepsToExecute.push(...newSteps);
        } else {
          stepsToExecute.push(step);
        }
      }
    } else {
      stepsToExecute.push(...demoSteps);
    }

    // Loop over all the demo steps and execute them.
    for (const step of stepsToExecute) {
      if (!step.action) {
        continue;
      }

      // Wait for the specified timeout
      if (step.action === "waitForTimeout") {
        await sleep(step.timeout || 1000);
        continue;
      } else if (step.action === "waitForInput") {
        const answer = await window.showInputBox({
          title: "Demo time!",
          prompt: "Press any key to continue",
          ignoreFocusOut: true,
        });
        if (answer === undefined) {
          return;
        }
        continue;
      }

      // Update settings
      if (step.action === "setSetting") {
        if (!step.setting || !step.setting.key || !step.setting.value) {
          Notifications.error("No setting or value specified");
          continue;
        }

        await workspace.getConfiguration().update(step.args.setting, step.args.value === null ? undefined : step.args.value, ConfigurationTarget.Workspace);
        continue;
      }

      const fileUri = step.path ? Uri.joinPath(workspaceFolder.uri, step.path) : undefined;

      // Execute the specified VSCode command
      if (step.action === "executeVSCodeCommand") {
        if (!step.command) {
          Notifications.error("No command specified");
          continue;
        }

        if (fileUri) {
          await commands.executeCommand(step.command, fileUri);
          continue;
        }

        await commands.executeCommand(step.command, step.args);
        continue;
      }

      if (step.action === "showInfoMessage") {
        if (!step.message) {
          Notifications.error("No message specified");
          continue;
        }

        window.showInformationMessage(step.message);
        continue;
      }

      // Run the specified terminal command
      if (step.action === "executeTerminalCommand") {
        await DemoRunner.executeTerminalCommand(step.command);
        continue;
      }

      if (!fileUri) {
        continue;
      }

      if (step.action === "open") {
        await commands.executeCommand("vscode.open", fileUri);
        continue;
      }

      if (step.action === "markdownPreview") {
        await commands.executeCommand("markdown.showPreview", fileUri);
        continue;
      }

      let content = step.content || "";
      if (step.contentPath) {
        const fileContent = await getFileContents(workspaceFolder, step.contentPath);
        if (!fileContent) {
          continue;
        }
        content = fileContent;
      }

      if (step.action === "create") {
        await workspace.fs.writeFile(fileUri, new Uint8Array(Buffer.from(content)));
        continue;
      }

      const editor = await workspace.openTextDocument(fileUri);
      const textEditor = await window.showTextDocument(editor);

      const { crntPosition, crntRange } = DemoRunner.getPositionAndRange(editor, step);

      if (step.action === "unselect") {
        await DemoRunner.unselect(textEditor);
        continue;
      }

      if (step.action === "highlight" && (crntRange || crntPosition)) {
        await DemoRunner.highlight(textEditor, crntRange, crntPosition);
        continue;
      }

      // Code actions
      if (step.action === "insert") {
        await DemoRunner.insert(textEditor, editor, fileUri, content, crntPosition, step.lineInsertionDelay);
        continue;
      }

      if (step.action === "replace") {
        await DemoRunner.replace(
          textEditor,
          editor,
          fileUri,
          content,
          crntRange,
          crntPosition,
          step.lineInsertionDelay
        );
        continue;
      }

      if (step.action === "delete") {
        await DemoRunner.delete(editor, fileUri, crntRange, crntPosition);
        continue;
      }
    }

    DemoPanel.update();
  }

  /**
   * Inserts content into a text editor at the specified position or range.
   * If a position is provided, the content is inserted at that position.
   * If a range is provided, the content replaces the text within that range.
   * @param textEditor The text editor where the content should be inserted.
   * @param editor The text document associated with the text editor.
   * @param fileUri The URI of the file where the content should be inserted.
   * @param content The content to be inserted.
   * @param position The position at which the content should be inserted.
   */
  private static async insert(
    textEditor: TextEditor,
    editor: TextDocument,
    fileUri: Uri,
    content: string,
    position: Position | undefined,
    lineInsertionDelay?: number
  ): Promise<void> {
    if (!position) {
      return;
    }

    let lineContent = null;

    try {
      const line = editor.lineAt(position);
      lineContent = line.text;
    } catch (error) {
      // do nothing
    }

    const lineSpeed = getLineInsertionSpeed(lineInsertionDelay);

    let range = new Range(position, position);
    if (!lineContent) {
      // Insert the content at the specified position
      if (!lineSpeed) {
        await insertContent(fileUri, position, content);
      } else {
        const lineRange = getLineRange(editor, position);
        if (!lineRange) {
          Logger.error("Line range not found");
          return;
        }
        textEditor.revealRange(lineRange, TextEditorRevealType.InCenter);
        await insertLineByLine(fileUri, lineRange.start.line, content, lineSpeed);
      }
    } else {
      if (!lineSpeed) {
        const line = editor.lineAt(position);
        range = line.range;
        await replaceContent(fileUri, line.range, content);
      } else {
        const range = getLineRange(editor, position);
        if (!range) {
          Logger.error("Line range not found");
          return;
        }
        await replaceContent(fileUri, range, "");
        textEditor.revealRange(range, TextEditorRevealType.InCenter);
        await insertLineByLine(fileUri, range.start.line, content, lineSpeed);
      }
    }

    if (textEditor) {
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
      textEditor.selection = new Selection(range.start, range.start);
    }

    await DemoRunner.saveFile();
  }

  /**
   * Replaces the specified range or position in the text editor with the given content.
   * If a range is provided, it replaces the content within that range.
   * If a position is provided, it replaces the content within the line of that position.
   * @param textEditor The text editor in which the replacement should occur.
   * @param editor The text document associated with the text editor.
   * @param fileUri The URI of the file being edited.
   * @param content The content to replace with.
   * @param range The range within which the content should be replaced.
   * @param position The position within the line where the content should be replaced.
   */
  private static async replace(
    textEditor: TextEditor,
    editor: TextDocument,
    fileUri: Uri,
    content: string,
    range: Range | undefined,
    position: Position | undefined,
    lineInsertionDelay?: number
  ): Promise<void> {
    if (!range && !position) {
      return;
    }

    const lineSpeed = getLineInsertionSpeed(lineInsertionDelay);

    if (range) {
      if (!lineSpeed) {
        await replaceContent(fileUri, range, content);
      } else {
        const startLine = editor.lineAt(range.start);
        const endLine = editor.lineAt(range.end);
        const start = new Position(startLine.lineNumber, 0);
        const end = new Position(endLine.lineNumber, endLine.text.length);

        await replaceContent(fileUri, new Range(start, end), "");

        textEditor.revealRange(new Range(start, end), TextEditorRevealType.InCenter);
        await insertLineByLine(fileUri, startLine.lineNumber, content, lineSpeed);
      }
    } else if (position) {
      if (!lineSpeed) {
        const line = editor.lineAt(position);
        range = line.range;

        await replaceContent(fileUri, line.range, content);
      } else {
        range = getLineRange(editor, position);

        if (!range) {
          Logger.error("Line range not found");
          return;
        }

        await replaceContent(fileUri, range, "");

        textEditor.revealRange(range, TextEditorRevealType.InCenter);
        await insertLineByLine(fileUri, range.start.line, content, lineSpeed);
      }
    }

    if (textEditor && range) {
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
      textEditor.selection = new Selection(range.start, range.start);
    }

    await DemoRunner.saveFile();
  }

  /**
   * Deletes the specified range or line in the given editor.
   * If a range is provided, it deletes the range.
   * If a position is provided, it deletes the line at that position.
   * @param editor The text document editor.
   * @param fileUri The URI of the file being edited.
   * @param range The range to delete (optional).
   * @param position The position of the line to delete (optional).
   */
  private static async delete(
    editor: TextDocument,
    fileUri: Uri,
    range: Range | undefined,
    position: Position | undefined
  ): Promise<void> {
    if (!range && !position) {
      return;
    }

    const edit = new WorkspaceEdit();

    if (range) {
      edit.delete(fileUri, range);
    } else if (position) {
      const line = editor.lineAt(position);
      edit.delete(fileUri, line.range);
    }

    await workspace.applyEdit(edit);

    await DemoRunner.saveFile();
  }

  /**
   * Highlights the specified range or position in the given text editor.
   * @param textEditor - The text editor in which to highlight the range or position.
   * @param range - The range to highlight. If not provided, the position will be used to create a range.
   * @param position - The position to highlight. If not provided, the range will be used to set the selection.
   */
  public static async highlight(
    textEditor: TextEditor,
    range: Range | undefined,
    position: Position | undefined
  ): Promise<void> {
    if (!range && !position) {
      return;
    }

    if (!textEditor) {
      return;
    }

    if (!range && position) {
      range = new Range(position, position);
    }

    if (range) {
      DecoratorService.hightlightLines(textEditor, range);
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
    }
  }

  /**
   * Unselects the current selection in the given text editor.
   * @param textEditor The text editor to perform the unselect operation on.
   */
  private static async unselect(textEditor: TextEditor): Promise<void> {
    DecoratorService.unselect(textEditor);
  }

  /**
   * Executes a terminal command.
   * @param command - The command to be executed.
   * @returns A promise that resolves when the command execution is complete.
   */
  private static async executeTerminalCommand(command?: string): Promise<void> {
    if (!command) {
      Notifications.error("No command specified");
      return;
    }

    if (!DemoRunner.terminal) {
      DemoRunner.terminal = window.createTerminal(DemoRunner.terminalName);
      window.onDidCloseTerminal((term) => {
        if (term.name === DemoRunner.terminalName) {
          DemoRunner.terminal = null;
        }
      });
    }

    DemoRunner.terminal.show();
    DemoRunner.terminal.sendText(command, true);
  }

  /**
   * Retrieves the current position and range based on the provided step.
   * @param editor The text document editor.
   * @param step The step object containing the position information.
   * @returns An object with the current position and range.
   */
  private static getPositionAndRange(
    editor: TextDocument,
    step: Step
  ): { crntPosition: Position | undefined; crntRange: Range | undefined } {
    let crntPosition: Position | undefined = undefined;
    let crntRange: Range | undefined = undefined;

    if (step.position) {
      if (typeof step.position === "string") {
        if (step.position.includes(":")) {
          let [start, end] = step.position.split(":");

          if (start === "start") {
            start = "1";
          }

          if (end === "end") {
            end = editor.lineCount.toString();
          }

          let lastLine = new Position(Number(end) - 1, 0);
          try {
            const line = editor.lineAt(lastLine);
            lastLine = line.range.end;
          } catch (error) {
            // do nothing
          }

          crntRange = new Range(new Position(Number(start) - 1, 0), lastLine);
        } else {
          crntPosition = new Position(Number(step.position) - 1, 0);
        }
      } else {
        crntPosition = new Position(step.position - 1, 0);
      }
    }

    return { crntPosition, crntRange };
  }

  /**
   * Saves the file in the workspace.
   * @returns A promise that resolves when the file is saved.
   */
  private static async saveFile(): Promise<void> {
    await commands.executeCommand("workbench.action.files.save");
  }

  /**
   * Retrieves the demo file associated with the given ActionTreeItem.
   * @param item The ActionTreeItem representing the demo file.
   * @returns A Promise that resolves to an object containing the filePath and demo, or undefined if no demo file is found.
   */
  private static async getDemoFile(item?: ActionTreeItem): Promise<
    | {
        filePath: string;
        demo: Demos;
      }
    | undefined
  > {
    const demoFiles = await FileProvider.getFiles();
    const executingFile = await DemoRunner.getExecutedDemoFile();

    if (item && item.demoFilePath) {
      if (!demoFiles) {
        Notifications.warning("No demo files found");
        return;
      }

      const demoFile = await FileProvider.getFile(Uri.file(item.demoFilePath));
      if (!demoFile) {
        Notifications.warning(`No demo file found with the name ${item.description}`);
        return;
      }

      if (executingFile.filePath !== item.demoFilePath) {
        executingFile.filePath = item.demoFilePath;
        executingFile.demo = [];
        await DemoRunner.setExecutedDemoFile(executingFile);
      }
      return {
        filePath: item.demoFilePath,
        demo: demoFile,
      };
    } else if (!executingFile.filePath && !item && demoFiles) {
      let demoFilePath = undefined;
      if (demoFiles && Object.keys(demoFiles).length === 1) {
        demoFilePath = Object.keys(demoFiles)[0];
      } else {
        const demoFile = await FileProvider.demoQuickPick();
        if (!demoFile?.demo) {
          return;
        }

        demoFilePath = demoFile.filePath;
      }

      executingFile.filePath = demoFilePath;
      executingFile.demo = [];
      await DemoRunner.setExecutedDemoFile(executingFile);
      return {
        filePath: demoFilePath,
        demo: demoFiles[demoFilePath],
      };
    } else if (executingFile.filePath && !item && demoFiles) {
      const demoFile = demoFiles[executingFile.filePath];
      if (!demoFile) {
        Notifications.warning("No demo file found");
        return;
      }

      return {
        filePath: executingFile.filePath,
        demo: demoFile,
      };
    }

    return;
  }
}
