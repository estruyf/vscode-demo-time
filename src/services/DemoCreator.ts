import { Uri, commands, window } from "vscode";
import { COMMAND } from "../constants";
import { Action, Demo, Demos, Step, Subscription } from "../models";
import { Extension } from "./Extension";
import { FileProvider } from "./FileProvider";
import { DemoPanel } from "../panels/DemoPanel";
import { ActionTreeItem } from "../providers/ActionTreeviewProvider";
import { DemoRunner } from "./DemoRunner";
import { addExtensionRecommendation, getActionTemplate } from "../utils";
import { Notifications } from "./Notifications";
import { parse as jsonParse } from "jsonc-parser";

export class DemoCreator {
  public static ExecutedDemoSteps: string[] = [];

  public static registerCommands() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(commands.registerCommand(COMMAND.documentation, DemoCreator.documentation));
    subscriptions.push(commands.registerCommand(COMMAND.initialize, DemoCreator.initialize));
    subscriptions.push(commands.registerCommand(COMMAND.openDemoFile, DemoCreator.openFile));
    subscriptions.push(commands.registerCommand(COMMAND.addToStep, DemoCreator.addToStep));
    subscriptions.push(commands.registerCommand(COMMAND.addStepToDemo, DemoCreator.addStepToDemo));
    subscriptions.push(
      commands.registerCommand(COMMAND.stepMoveUp, (item: ActionTreeItem) => DemoCreator.move(item, "up"))
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.stepMoveDown, (item: ActionTreeItem) => DemoCreator.move(item, "down"))
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.viewStep, (item: ActionTreeItem) => DemoCreator.openFile(item, true))
    );
  }

  /**
   * Opens the documentation page in the browser.
   */
  private static documentation() {
    commands.executeCommand("vscode.open", Uri.parse("https://demotime.elio.dev/getting-started/"));
  }

  /**
   * Initializes the demo by getting the demo files, creating a file if none exists,
   * and showing the text document. It also updates the demo panel and displays an
   * information message.
   */
  private static async initialize() {
    const demoFiles = await FileProvider.getFiles();
    let fileUri: Uri | undefined;
    if (!demoFiles) {
      fileUri = await FileProvider.createFile();
    }

    if (fileUri) {
      await window.showTextDocument(fileUri);
    }

    await addExtensionRecommendation();

    Notifications.info("Demo time is initialized, you can now start adding demo steps!");

    DemoPanel.update();
  }

  /**
   * Opens the file associated with the given ActionTreeItem.
   * @param item The ActionTreeItem containing the demo file path.
   */
  private static async openFile(item: ActionTreeItem, isDemoStep: boolean) {
    if (!item || !item.demoFilePath) {
      return;
    }

    const fileUri = Uri.file(item.demoFilePath);
    await window.showTextDocument(fileUri);

    if (!isDemoStep) {
      return;
    }

    // Find the line number of the step
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    const text = editor.document.getText();
    const lines = text.split("\n");
    const matches = lines.filter((line) => line.includes(item.label as string));
    if (matches.length === 0) {
      return;
    }

    const lineNr = lines.indexOf(matches[0]);
    await DemoRunner.highlight(editor, editor.document.lineAt(lineNr).range, undefined);
  }

  /**
   * Copies the selected text and inserts it into the specified location in the demo file.
   * If no text is selected, the function does nothing.
   * The function prompts the user to choose whether to insert or delete the step.
   * If the user chooses to insert a new step, they are prompted to enter the step title and description.
   * If the user chooses to insert a step into an existing demo, they are prompted to select the demo.
   * The modified demo file is saved after the step is added.
   */
  private static async addToStep() {
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
    const text = editor.document.getText(selection) || "";
    const modifiedText = text.replace(/\r?\n/g, "\n");

    const demoFile = await FileProvider.demoQuickPick();
    if (!demoFile?.demo) {
      return;
    }
    const { filePath, demo } = demoFile;

    const actions: Action[] = [Action.Insert, Action.Highlight, Action.Unselect, Action.Delete, Action.Save];

    // If selection is a single line, add the "write" action
    if (selection.start.line === selection.end.line) {
      actions.push(Action.Write);
    }

    const action = await window.showQuickPick(actions, {
      title: "Demo time!",
      placeHolder: "What kind of action step do you want to perform?",
    }) as unknown as Action;

    if (!action) {
      return;
    }

    const start = selection.start.line;
    const end = selection.end.line;

    let position: string | number = selection.start.line + 1;
    if (action !== "insert" && action !== "unselect") {
      position = start === end ? start + 1 : `${start + 1}:${end + 1}`;
    }

    const step: Step = {
      action: action.toLowerCase() as Action,
      path: editor.document.uri.path.replace(Extension.getInstance().workspaceFolder?.uri.path || "", ""),
      position,
    };

    // Unselect doesn't need the position
    if (action === "unselect") {
      delete step.position;
    }

    // The save action doesn't need the position and path
    if (action === "save") {
      delete step.position;
      delete step.path;
    }

    if (action === "insert" || action === "write") {
      step.content = modifiedText;
    }

    const updatedDemos = await DemoCreator.askWhereToAddStep(demo, step);
    if (!updatedDemos) {
      return;
    }

    demo.demos = updatedDemos;

    await FileProvider.saveFile(filePath, JSON.stringify(demo, null, 2));

    // Trigger a refresh of the treeview
    DemoPanel.update();
  }

  private static async addStepToDemo() {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    const fileContents = editor.document.getText();
    const demo = jsonParse(fileContents) as Demos;

    const actions = Object.values(Action);
    const action = await window.showQuickPick(actions, {
      title: "Demo time!",
      placeHolder: "What kind of action step do you want to add?",
    }) as unknown as Action;

    if (!action) {
      return;
    }

    const step = getActionTemplate(action);
    if (!step) {
      Notifications.error("Unknown action type");
      return;
    }

    const updatedDemos = await DemoCreator.askWhereToAddStep(demo, step);
    if (!updatedDemos) {
      return;
    }

    demo.demos = updatedDemos;

    await FileProvider.saveFile(editor.document.uri.fsPath, JSON.stringify(demo, null, 2));

    // Trigger a refresh of the treeview
    DemoPanel.update();
  }

  /**
   * Prompts the user to decide where to add a new step in the demo.
   * The user can choose to create a new demo step or insert it into an existing demo.
   * 
   * @param demo - The current demos object where the step will be added.
   * @param step - The step to be added to the demo.
   * @returns A promise that resolves to the updated list of demos or undefined if the operation was cancelled.
   */
  private static async askWhereToAddStep(demo: Demos, step: Step): Promise<Demo[]  | undefined> {
    const demoStep = await window.showQuickPick(["New demo step", "Insert in existing demo"], {
      title: "Demo time!",
      placeHolder: "Where do you want to insert the step?",
    });

    if (!demoStep) {
      return;
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

        const demoIndex = demo.demos.findIndex((demo) => demo.title === demoToEdit);

        if (demoIndex < 0) {
          return;
        }

        demo.demos[demoIndex].steps.push(step);
      }
    }

    return demo.demos;
  }

  /**
   * Moves the specified item in the action tree either up or down.
   *
   * @param item - The item to move.
   * @param direction - The direction to move the item. Can be "up" or "down".
   */
  private static async move(item: ActionTreeItem, direction: "up" | "down") {
    if (!item || !item.demoFilePath || typeof item.stepIndex === "undefined") {
      return;
    }

    const demoFile = await FileProvider.getFile(Uri.file(item.demoFilePath));
    if (!demoFile) {
      return;
    }

    const steps = demoFile.demos;
    const stepIndex = item.stepIndex;

    if (direction === "up" && stepIndex === 0) {
      return;
    }

    if (direction === "down" && stepIndex === steps.length - 1) {
      return;
    }

    const stepToMove = steps[stepIndex];
    steps.splice(stepIndex, 1);
    steps.splice(direction === "up" ? stepIndex - 1 : stepIndex + 1, 0, stepToMove);

    await FileProvider.saveFile(item.demoFilePath, JSON.stringify(demoFile, null, 2));

    // Trigger a refresh of the treeview
    DemoPanel.update();
  }
}
