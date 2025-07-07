import {
  ConfigurationTarget,
  QuickPickItem,
  QuickPickItemKind,
  Uri,
  commands,
  window,
  workspace,
} from 'vscode';
import { COMMAND, Config, ContextKeys } from '../constants';
import { Action, Demo, DemoFile, DemoFileType, Icons, Step, Subscription } from '../models';
import { Extension } from './Extension';
import { DemoFileProvider } from './DemoFileProvider';
import { DemoPanel } from '../panels/DemoPanel';
import { ActionTreeItem } from '../providers/ActionTreeviewProvider';
import { DemoRunner } from './DemoRunner';
import {
  addExtensionRecommendation,
  addStepsToDemo,
  chooseDemoFile,
  createDemoFile,
  createPatch,
  createSnapshot,
  getActionOptions,
  getActionTemplate,
  lowercaseFirstLetter,
  setContext,
  upperCaseFirstLetter,
} from '../utils';
import { Notifications } from './Notifications';
import { parse as jsonParse } from 'jsonc-parser';

export class DemoCreator {
  public static ExecutedDemoSteps: string[] = [];

  public static registerCommands() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(commands.registerCommand(COMMAND.documentation, DemoCreator.documentation));
    subscriptions.push(commands.registerCommand(COMMAND.initialize, DemoCreator.initialize));
    subscriptions.push(commands.registerCommand(COMMAND.openDemoFile, DemoCreator.openDemoFile));
    subscriptions.push(commands.registerCommand(COMMAND.addToStep, DemoCreator.addToStep));
    subscriptions.push(commands.registerCommand(COMMAND.addStepToDemo, DemoCreator.addStepToDemo));
    subscriptions.push(
      commands.registerCommand(COMMAND.stepMoveUp, (item: ActionTreeItem) =>
        DemoCreator.move(item, 'up'),
      ),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.stepMoveDown, (item: ActionTreeItem) =>
        DemoCreator.move(item, 'down'),
      ),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.viewStep, (item: ActionTreeItem) =>
        DemoCreator.openDemoFile(item, true),
      ),
    );
    subscriptions.push(commands.registerCommand(COMMAND.createSnapshot, createSnapshot));
    subscriptions.push(commands.registerCommand(COMMAND.createPatch, createPatch));
    subscriptions.push(commands.registerCommand(COMMAND.createDemoFile, createDemoFile));

    // Check if the workspace is initialized
    const demoFolder = workspace.workspaceFolders?.find((folder) =>
      workspace.fs.stat(Uri.joinPath(folder.uri, '.demo')).then(
        () => true,
        () => false,
      ),
    );
    setContext(ContextKeys.isInitialized, demoFolder ? true : false);
  }

  /**
   * Opens the documentation page in the browser.
   */
  private static documentation() {
    commands.executeCommand('vscode.open', Uri.parse('https://demotime.show/getting-started/'));
  }

  /**
   * Initializes the demo by getting the demo files, creating a file if none exists,
   * and showing the text document. It also updates the demo panel and displays an
   * information message.
   */
  private static async initialize() {
    const fileType = await DemoCreator.askFileType();
    if (fileType) {
      await workspace
        .getConfiguration(Config.root)
        .update(Config.defaultFileType, fileType, ConfigurationTarget.Workspace);
    }

    await createDemoFile();

    await addExtensionRecommendation();

    await setContext(ContextKeys.isInitialized, true);
    Notifications.info(`${Config.title} is initialized, you can now start adding demo steps!`);

    DemoPanel.showWelcome(false);
    DemoPanel.init();
  }

  /**
   * Opens the demo file associated with the given ActionTreeItem and highlights the specified step if applicable.
   * @param item The ActionTreeItem containing the demo file path.
   * @param isDemoStep A boolean indicating whether the item is a demo step and should be highlighted.
   */
  private static async openDemoFile(item: ActionTreeItem, isDemoStep: boolean) {
    if (!item || !item.demoFilePath) {
      return;
    }

    const fileUri = Uri.file(item.demoFilePath);
    await window.showTextDocument(fileUri);

    if (!isDemoStep || !item.originalLabel || item.stepIndex === undefined) {
      return;
    }

    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    const text = editor.document.getText();
    const lines = text.split('\n');

    const includesLabel = (target: string) => target.includes(item.originalLabel as string);

    // Find all line numbers that contain the original label
    const matchingLineNumbers = lines
      .map((line, index) => (includesLabel(line) ? index : -1))
      .filter((index) => index !== -1);

    if (matchingLineNumbers.length === 0) {
      return;
    }

    let lineNr = matchingLineNumbers[0]; // Default to first match

    // If there are multiple matches and we have a stepIndex, find the correct occurrence
    if (matchingLineNumbers.length > 1) {
      const demoFile = await DemoFileProvider.getFile(fileUri);
      if (!demoFile?.demos) {
        return;
      }

      let occurrenceIndex = 0;

      // Count previous demos with the same title
      for (let i = 0; i < item.stepIndex; i++) {
        if (includesLabel(demoFile.demos[i].title)) {
          occurrenceIndex++;
        }
      }

      // Go to the next occurrence if the title also matches
      if (includesLabel(demoFile.title)) {
        occurrenceIndex++;
      }

      lineNr = matchingLineNumbers[occurrenceIndex] || matchingLineNumbers[0];
    }

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
    let demoFiles = await DemoFileProvider.getFiles();
    if (!demoFiles) {
      await DemoFileProvider.createFile();
      demoFiles = await DemoFileProvider.getFiles();
    }

    if (demoFiles === null) {
      return;
    }

    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection) || '';
    const modifiedText = text.replace(/\r?\n/g, '\n');

    const actions: QuickPickItem[] = [
      { label: 'File', kind: QuickPickItemKind.Separator },
      { label: 'Create Snapshot', kind: QuickPickItemKind.Default },
      { label: 'Create Patch', kind: QuickPickItemKind.Default },
      { label: 'Actions', kind: QuickPickItemKind.Separator },
      ...[
        Action.Open,
        Action.Insert,
        Action.Highlight,
        Action.Unselect,
        Action.Delete,
        Action.Save,
      ].map((action) => ({
        label: upperCaseFirstLetter(action),
        kind: QuickPickItemKind.Default,
      })),
    ];

    // If selection is a single line, add the "write" action
    if (selection.start.line === selection.end.line) {
      actions.push({ label: upperCaseFirstLetter(Action.Write), kind: QuickPickItemKind.Default });
    }

    const selectedAction = await window.showQuickPick(actions, {
      title: Config.title,
      placeHolder: 'What kind of action step do you want to perform?',
    });

    if (!selectedAction) {
      return;
    }

    if (selectedAction.label === 'Create snapshot') {
      await createSnapshot();
      return;
    } else if (selectedAction.label === 'Create patch') {
      await createPatch();
      return;
    }

    const action = lowercaseFirstLetter(selectedAction.label) as Action;

    const start = selection.start.line;
    const end = selection.end.line;

    let position: string | number = selection.start.line + 1;
    if (action !== Action.Insert && action !== Action.Unselect) {
      position = start === end ? start + 1 : `${start + 1}:${end + 1}`;
    }

    const step: Step = {
      action: action.toLowerCase() as Action,
      path: editor.document.uri.path.replace(
        Extension.getInstance().workspaceFolder?.uri.path || '',
        '',
      ),
      position,
    };

    // Open and Unselect don't need the position
    if (action === Action.Open || action === Action.Unselect) {
      delete step.position;
    }

    // The save action doesn't need the position and path
    if (action === Action.Save) {
      delete step.position;
      delete step.path;
    }

    if (action === Action.Insert || action === Action.Write) {
      step.content = modifiedText;
    }

    const demoFile = await chooseDemoFile();
    await addStepsToDemo(step, demoFile);
  }

  private static async addStepToDemo() {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    const fileContents = editor.document.getText();
    const demo = jsonParse(fileContents) as DemoFile;

    const actions = getActionOptions();
    const action = await window.showQuickPick(actions, {
      title: Config.title,
      placeHolder: 'What kind of action step do you want to add?',
    });

    if (!action) {
      return;
    }

    const step = getActionTemplate(action);
    if (!step) {
      Notifications.error('Unknown action type');
      return;
    }

    const demoFile = await DemoCreator.askWhereToAddStep(demo, step);
    if (!demoFile) {
      return;
    }

    demo.demos = demoFile.demos;

    await DemoFileProvider.saveFile(editor.document.uri.fsPath, JSON.stringify(demo, null, 2));

    // Trigger a refresh of the treeview
    DemoPanel.update();
  }

  /**
   * Prompts the user to decide where to add a new step in the demo.
   * The user can choose to create a new demo step or insert it into an existing demo.
   *
   * @param demo - The current demos object where the step will be added.
   * @param step - The step(s) to be added to the demo.
   * @returns A promise that resolves to the updated list of demos or undefined if the operation was cancelled.
   */
  public static async askWhereToAddStep(
    demo: DemoFile,
    step: Step | Step[],
    stepTitle?: string,
    stepDescription?: string,
    stepIcons?: Icons,
  ): Promise<DemoFile | undefined> {
    let demoStep: string | undefined = 'New demo step';

    if (demo.demos.length > 0) {
      demoStep = await window.showQuickPick(['New demo step', 'Insert in existing demo'], {
        title: Config.title,
        placeHolder: 'Where do you want to insert the step?',
        ignoreFocusOut: true,
      });

      if (!demoStep) {
        return;
      }
    }

    if (demoStep === 'New demo step') {
      const title = !stepTitle
        ? await window.showInputBox({
            title: Config.title,
            placeHolder: 'Enter the step title',
          })
        : stepTitle;

      if (!title) {
        return;
      }

      const description =
        typeof stepDescription === 'undefined'
          ? await window.showInputBox({
              title: Config.title,
              placeHolder: 'Enter the step description',
            })
          : stepDescription;

      const newDemo: Demo = {
        title,
        description: description || '',
        steps: [...(Array.isArray(step) ? step : [step])],
      };

      if (stepIcons) {
        newDemo.icons = stepIcons;
      }

      demo.demos.push(newDemo);
    } else {
      if (demo.demos.length === 0) {
        const newDemo: Demo = {
          title: 'New demo',
          description: '',
          steps: [...(Array.isArray(step) ? step : [step])],
        };

        if (stepIcons) {
          newDemo.icons = stepIcons;
        }

        demo.demos.push(newDemo);
      } else {
        const demoToEdit = await window.showQuickPick(
          demo.demos.map((demo) => demo.title),
          {
            title: Config.title,
            placeHolder: 'Select a demo to add the step',
          },
        );

        if (!demoToEdit) {
          return;
        }

        const demoIndex = demo.demos.findIndex((demo) => demo.title === demoToEdit);

        if (demoIndex < 0) {
          return;
        }

        demo.demos[demoIndex].steps.push(...(Array.isArray(step) ? step : [step]));
      }
    }

    return demo;
  }

  /**
   * Moves the specified item in the action tree either up or down.
   *
   * @param item - The item to move.
   * @param direction - The direction to move the item. Can be "up" or "down".
   */
  private static async move(item: ActionTreeItem, direction: 'up' | 'down') {
    if (!item || !item.demoFilePath || typeof item.stepIndex === 'undefined') {
      return;
    }

    const demoFile = await DemoFileProvider.getFile(Uri.file(item.demoFilePath));
    if (!demoFile) {
      return;
    }

    const steps = demoFile.demos;
    const stepIndex = item.stepIndex;

    if (direction === 'up' && stepIndex === 0) {
      return;
    }

    if (direction === 'down' && stepIndex === steps.length - 1) {
      return;
    }

    const stepToMove = steps[stepIndex];
    steps.splice(stepIndex, 1);
    steps.splice(direction === 'up' ? stepIndex - 1 : stepIndex + 1, 0, stepToMove);

    await DemoFileProvider.saveFile(item.demoFilePath, JSON.stringify(demoFile, null, 2));

    // Trigger a refresh of the treeview
    DemoPanel.update();
  }

  /**
   * Asks the user which demo file format they want to use.
   * @returns The selected file type or undefined if the prompt was cancelled.
   */
  private static async askFileType(): Promise<DemoFileType | undefined> {
    const options: QuickPickItem[] = [{ label: 'JSON' }, { label: 'YAML' }];

    const pick = await window.showQuickPick(options, {
      title: Config.title,
      placeHolder: 'In which format do you want to create the demo file(s)?',
      ignoreFocusOut: true,
    });

    if (!pick) {
      return;
    }

    return pick.label.toLowerCase() as DemoFileType;
  }
}
