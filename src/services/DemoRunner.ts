import { COMMAND, General } from "../constants";
import { Demo, Step, Subscription } from "../models";
import { Extension } from "./Extension";
import {
  Position,
  Range,
  Selection,
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
import { sleep } from "../utils";

export class DemoRunner {
  public static ExecutedDemoSteps: string[] = [];

  public static registerCommands() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(commands.registerCommand(COMMAND.start, DemoRunner.start));
    subscriptions.push(commands.registerCommand(COMMAND.startDemo, DemoRunner.startDemo));
  }

  /**
   * Starts the demo runner.
   *
   * @returns {Promise<void>} A promise that resolves when the demo runner has started.
   */
  private static async start(): Promise<void> {
    const demoFile = await FileProvider.demoQuickPick();
    if (!demoFile?.demo) {
      return;
    }

    let demo = demoFile.demo;
    if (demo.demos.length <= 0) {
      return;
    }

    const demoToStart = await window.showQuickPick(
      demo.demos.map((demo) => demo.title),
      {
        title: "Demo time!",
        placeHolder: "Select a demo to start",
      }
    );

    if (!demoToStart) {
      return;
    }

    const demoIndex = demo.demos.findIndex((demo) => demo.title === demoToStart);

    if (demoIndex < 0) {
      return;
    }

    const demoSteps = demo.demos[demoIndex].steps;
    if (!demoSteps) {
      return;
    }

    DemoRunner.ExecutedDemoSteps.push(demo.title);

    await DemoRunner.runSteps(demoSteps);
  }

  /**
   * Starts the demo by running its steps.
   * @param {Demo} demo - The demo to start.
   * @returns {Promise<void>} - A promise that resolves when the demo is started.
   */
  private static async startDemo(demo: Demo): Promise<void> {
    if (!demo) {
      return;
    }

    if (demo.steps.length <= 0) {
      return;
    }

    DemoRunner.ExecutedDemoSteps.push(demo.title);

    await DemoRunner.runSteps(demo.steps);
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

    // Loop over all the demo steps and execute them.
    for (const step of demoSteps) {
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

      const fileUri = Uri.joinPath(workspaceFolder.uri, step.path);
      if (!fileUri) {
        continue;
      }

      let content = step.content || "";
      if (step.contentPath) {
        const contentUri = Uri.joinPath(workspaceFolder.uri, General.demoFolder, step.contentPath);
        if (!contentUri) {
          continue;
        }

        const contentEditor = await workspace.openTextDocument(contentUri);
        content = contentEditor.getText();
      }

      if (step.action === "create") {
        await workspace.fs.writeFile(fileUri, new Uint8Array(Buffer.from(content)));
        continue;
      }

      const editor = await workspace.openTextDocument(fileUri);
      const textEditor = await window.showTextDocument(editor);

      const { crntPosition, crntRange } = DemoRunner.getPositionAndRange(editor, step);

      if (step.action === "open") {
        await commands.executeCommand("vscode.open", fileUri);
        continue;
      }

      if (step.action == "unselect") {
        await DemoRunner.unselect(textEditor);
        continue;
      }

      if (step.action === "highlight" && (crntRange || crntPosition)) {
        await DemoRunner.highlight(textEditor, crntRange, crntPosition);
        continue;
      }

      // Code actions
      if (step.action === "insert") {
        await DemoRunner.insert(textEditor, editor, fileUri, content, crntPosition);
        continue;
      }

      if (step.action === "replace") {
        await DemoRunner.replace(textEditor, editor, fileUri, content, crntRange, crntPosition);
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
    position: Position | undefined
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

    const edit = new WorkspaceEdit();

    let range = new Range(position, position);
    if (!lineContent) {
      edit.insert(fileUri, position, content);
    } else {
      const line = editor.lineAt(position);
      range = line.range;
      edit.replace(fileUri, line.range, content);
    }

    await workspace.applyEdit(edit);

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
    position: Position | undefined
  ): Promise<void> {
    if (!range && !position) {
      return;
    }

    const edit = new WorkspaceEdit();

    if (range) {
      edit.replace(fileUri, range, content);
    } else if (position) {
      const line = editor.lineAt(position);
      range = line.range;
      edit.replace(fileUri, line.range, content);
    }

    await workspace.applyEdit(edit);

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
  private static async highlight(
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

    if (range) {
      textEditor.selection = new Selection(range.start, range.end);
    } else if (position) {
      const range = new Range(position, position);
      textEditor.selection = new Selection(range.start, range.end);
    }
  }

  /**
   * Unselects the current selection in the given text editor.
   * @param textEditor The text editor to perform the unselect operation on.
   */
  private static async unselect(textEditor: TextEditor): Promise<void> {
    const crntPosition = textEditor.selection.active;
    textEditor.selection = new Selection(new Position(crntPosition.line, 0), new Position(crntPosition.line, 0));
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
}
