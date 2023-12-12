import { COMMAND } from "../constants";
import { Action, Demo, Demos, Step, Subscription } from "../models";
import { Extension } from "./Extension";
import {
  Position,
  Range,
  Selection,
  Uri,
  WorkspaceEdit,
  commands,
  env,
  window,
  workspace,
} from "vscode";
import { FileProvider } from "./FileProvider";
import { DemoPanel } from "../panels/DemoPanel";

export class DemoRunner {
  public static ExecutedDemoSteps: string[] = [];

  public static registerCommands() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(
      commands.registerCommand(COMMAND.start, DemoRunner.start)
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.startDemo, DemoRunner.startDemo)
    );
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

    const demoIndex = demo.demos.findIndex(
      (demo) => demo.title === demoToStart
    );

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
  private static async runSteps(demoSteps: Step[]) {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder) {
      return;
    }

    // Loop over all the demo steps and execute them.
    for (const step of demoSteps) {
      const fileUri = Uri.joinPath(workspaceFolder.uri, step.path);
      if (!fileUri) {
        continue;
      }

      if (step.action === "create") {
        await workspace.fs.writeFile(
          fileUri,
          new Uint8Array(Buffer.from(step.content || ""))
        );
        continue;
      }

      const editor = await workspace.openTextDocument(fileUri);
      const textEditor = await window.showTextDocument(editor);

      let crntPosition: Position | undefined = undefined;
      let crntRange: Range | undefined = undefined;

      if (step.position) {
        if (typeof step.position === "string") {
          if (step.position.includes(":")) {
            const [start, end] = step.position.split(":");

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

      if (step.action === "open") {
        await commands.executeCommand("vscode.open", fileUri);
      }

      if (step.action == "unselect") {
        const crntPosition = textEditor.selection.active;
        textEditor.selection = new Selection(
          new Position(crntPosition.line, 0),
          new Position(crntPosition.line, 0)
        );
      }

      if (step.action === "highlight" && (crntRange || crntPosition)) {
        if (!textEditor) {
          continue;
        }

        if (crntRange) {
          textEditor.selection = new Selection(crntRange.start, crntRange.end);
        } else if (crntPosition) {
          const range = new Range(crntPosition, crntPosition);
          textEditor.selection = new Selection(range.start, range.end);
        }
      }

      if (step.action === "insert" && crntPosition) {
        if (!textEditor) {
          continue;
        }

        let lineContent = null;

        try {
          const line = editor.lineAt(crntPosition);
          lineContent = line.text;
        } catch (error) {
          // do nothing
        }

        const edit = new WorkspaceEdit();

        if (!lineContent) {
          edit.insert(fileUri, crntPosition, step.content || "");
        } else {
          const line = editor.lineAt(crntPosition);
          edit.replace(fileUri, line.range, step.content || "");
        }

        await workspace.applyEdit(edit);
      }

      if (step.action === "replace" && (crntRange || crntPosition)) {
        if (!textEditor) {
          continue;
        }

        const edit = new WorkspaceEdit();

        if (crntRange) {
          edit.replace(fileUri, crntRange, step.content || "");
        } else if (crntPosition) {
          const line = editor.lineAt(crntPosition);
          edit.replace(fileUri, line.range, step.content || "");
        }

        await workspace.applyEdit(edit);
      }

      if (step.action === "delete" && (crntRange || crntPosition)) {
        if (!textEditor) {
          continue;
        }

        const edit = new WorkspaceEdit();

        if (crntRange) {
          edit.delete(fileUri, crntRange);
        } else if (crntPosition) {
          const line = editor.lineAt(crntPosition);
          edit.delete(fileUri, line.range);
        }

        await workspace.applyEdit(edit);
      }

      await commands.executeCommand("workbench.action.files.save");
    }

    DemoPanel.update();
  }
}
