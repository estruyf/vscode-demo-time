import { commands, window } from "vscode";
import { COMMAND } from "../constants";
import { Action, DemoFiles, Step, Subscription } from "../models";
import { Extension } from "./Extension";
import { FileProvider } from "./FileProvider";
import { DemoPanel } from "../panels/DemoPanel";

export class DemoCreator {
  public static ExecutedDemoSteps: string[] = [];

  public static registerCommands() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(
      commands.registerCommand(COMMAND.addToStep, DemoCreator.copy)
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
    let demoFiles = await FileProvider.getFiles();
    if (!demoFiles) {
      await FileProvider.createFile();
      demoFiles = await FileProvider.getFiles();
    }

    if (demoFiles === null) {
      return;
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

    const demoFile = await FileProvider.demoQuickPick();
    if (!demoFile?.demo) {
      return;
    }
    const { filePath, demo } = demoFile;

    const action = await window.showQuickPick(["Insert", "Delete"], {
      title: "Demo time!",
      placeHolder: "What kind of action step do you want to perform?",
    });

    if (!action) {
      return;
    }

    const demoStep = await window.showQuickPick(
      ["New demo step", "Insert in existing demo"],
      {
        title: "Demo time!",
        placeHolder: "Where do you want to insert the step?",
      }
    );

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

    if (demoStep === "New demo step") {
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

      demo.demos.push({
        title,
        description: description || "",
        steps: [step],
      });
    } else {
      if (demo.demos.length === 0) {
        demo.demos.push({
          title: "New demo",
          description: "",
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
    }

    await FileProvider.saveFile(filePath, JSON.stringify(demo, null, 2));

    // Trigger a refresh of the treeview
    DemoPanel.update();
  }
}
