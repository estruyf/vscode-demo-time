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
    subscriptions.push(
      commands.registerCommand(COMMAND.copyToStep, DemoRunner.copy)
    );
  }

  /**
   * Copies the selected text and inserts it into the specified location in the demo file.
   * If no text is selected, the function does nothing.
   * The function prompts the user to choose whether to insert or delete the step.
   * If the user chooses to insert a new step, they are prompted to enter the step title and description.
   * If the user chooses to insert a step into an existing demo, they are prompted to select the demo.
   * The modified demo file is saved after the step is added.
   */
  private static async copy() {
    let demo: Demos = await FileProvider.getFile();
    if (!demo) {
      await FileProvider.createFile();
      demo = await FileProvider.getFile();
    }

    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);
    if (!text) {
      return;
    }

    const modifiedText = text.replace(/\r?\n/g, "\n");

    const action = await window.showQuickPick(["Insert", "Delete"], {
      title: "Demo time!",
      placeHolder: "Where do you want to insert the step?",
    });

    if (!action) {
      return;
    }

    const demoStep = await window.showQuickPick(["New step", "Insert step"], {
      title: "Demo time!",
      placeHolder: "Where do you want to insert the step?",
    });

    if (!demoStep) {
      return;
    }

    const start = selection.start.line;
    const end = selection.end.line;

    let position: string | number = selection.start.line + 1;
    if (action !== "Insert") {
      position = start === end ? start + 1 : `${start + 1}:${end + 1}`;
    }

    const step: Step = {
      action: action.toLowerCase() as Action,
      path: editor.document.uri.path.replace(
        Extension.getInstance().workspaceFolder?.uri.path || "",
        ""
      ),
      position,
    };

    if (action === "Insert") {
      step.content = modifiedText;
    }

    if (demoStep === "New step") {
      const title = await window.showInputBox({
        title: "Demo time!",
        placeHolder: "Enter the step title",
      });

      if (!title) {
        return;
      }

      const description = await window.showInputBox({
        title: "Demo time!",
        placeHolder: "Enter the step description",
      });

      if (!description) {
        return;
      }

      demo.demos.push({
        title,
        description,
        steps: [step],
      });
    } else {
      const demoToEdit = await window.showQuickPick(
        demo.demos.map((demo) => demo.title),
        {
          title: "Demo time!",
          placeHolder: "Select a demo to add the step",
        }
      );

      if (!demoToEdit) {
        return;
      }

      const demoIndex = demo.demos.findIndex(
        (demo) => demo.title === demoToEdit
      );

      if (demoIndex < 0) {
        return;
      }

      demo.demos[demoIndex].steps.push(step);
    }

    await FileProvider.saveFile(JSON.stringify(demo, null, 2));
  }

  /**
   * Starts the demo runner.
   *
   * @returns {Promise<void>} A promise that resolves when the demo runner has started.
   */
  private static async start(): Promise<void> {
    const demo: Demos = await FileProvider.getFile();

    if (!demo) {
      return;
    }

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
