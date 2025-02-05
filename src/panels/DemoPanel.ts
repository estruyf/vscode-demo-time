import { ThemeColor, TreeItem, TreeView, commands, window } from "vscode";
import { ContextKeys } from "../constants/ContextKeys";
import { FileProvider } from "../services/FileProvider";
import { DemoFileCache, DemoFiles, Demos, Subscription } from "../models";
import { ActionTreeItem, ActionTreeviewProvider } from "../providers/ActionTreeviewProvider";
import { DemoRunner } from "../services/DemoRunner";
import { COMMAND } from "../constants";
import { parseWinPath, setContext } from "../utils";
import { DemoStatusBar } from "../services/DemoStatusBar";
import { Extension } from "../services/Extension";

export class DemoPanel {
  private static treeView: TreeView<TreeItem>;
  private static demoActionsProvider: ActionTreeviewProvider;
  private static demoFiles: DemoFiles | null | undefined;
  private static executingDemoFile: DemoFileCache;

  public static register() {
    DemoPanel.init();

    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.collapseAll, DemoPanel.collapseAll));
  }

  public static async update() {
    await DemoPanel.setDemoFiles();
    await DemoPanel.setExecutingDemoFile();

    DemoPanel.demoActionsProvider.update();
    DemoStatusBar.update();
  }

  public static updateTitle(title: string) {
    if (this.treeView) {
      this.treeView.title = title;
    }
  }

  public static updateMessage(message?: string) {
    if (this.treeView) {
      this.treeView.message = message;
    }
  }

  /**
   * Retrieves a list of demo commands organized by demo files.
   *
   * @returns {ActionTreeItem[]} An array of `ActionTreeItem` objects representing the demo commands.
   */
  public static getDemos() {
    const demoFiles = DemoPanel.demoFiles;
    const executingDemoFile = DemoPanel.executingDemoFile;

    if (!demoFiles) {
      return [];
    }

    let demoKeys = Object.keys(demoFiles);
    demoKeys = demoKeys.sort((aPath, bPath) => {
      aPath = aPath.toLowerCase();
      bPath = bPath.toLowerCase();

      if (aPath < bPath) {
        return -1;
      }

      if (aPath > bPath) {
        return 1;
      }

      return 0;
    });

    const accountCommands: ActionTreeItem[] = [];

    for (const path of demoKeys) {
      const demos = (demoFiles as any)[path] as Demos;

      const demoSteps = demos.demos.map((demo, idx, allDemos) => {
        let hasExecuted = false;
        if (executingDemoFile.filePath === path) {
          hasExecuted = !!executingDemoFile.demo.find((d) => (d.id ? d.id === demo.id : d.idx === idx));
        }

        let ctxValue = "demo-time.step";
        if (idx === 0) {
          ctxValue = "demo-time.firstStep";
        } else if (idx === allDemos.length - 1) {
          ctxValue = "demo-time.lastStep";
        }

        const hasNotes = demo.notes?.path ? true : false;
        if (hasNotes) {
          ctxValue += " demo-time.hasNotes";
        }

        const icons = { start: "run", end: "pass-filled" };
        if (demo.icons?.start) {
          icons.start = demo.icons.start;
        }
        if (demo.icons?.end) {
          icons.end = demo.icons.end;
        }

        return new ActionTreeItem(
          demo.title,
          demo.description,
          {
            name: hasExecuted ? icons.end : icons.start,
            color: hasExecuted ? new ThemeColor("notebookStatusSuccessIcon.foreground") : undefined,
            custom: false,
          },
          undefined,
          COMMAND.runStep,
          {
            filePath: path,
            idx: idx,
            demo: demo,
          },
          ctxValue,
          undefined,
          parseWinPath(path),
          idx,
          demo.notes?.path
        );
      });

      accountCommands.push(
        new ActionTreeItem(
          demos.title,
          path.split("/").pop() as string,
          {
            name: executingDemoFile.filePath === path ? "play-circle" : "folder",
            custom: false,
            color:
              executingDemoFile.filePath === path ? new ThemeColor("notebookStatusSuccessIcon.foreground") : undefined,
          },
          undefined,
          undefined,
          undefined,
          "demo-time.file",
          demoSteps.length > 0
            ? demoSteps
            : [new ActionTreeItem("No demo steps defined", "", undefined, undefined, undefined)],
          parseWinPath(path)
        )
      );
    }

    return accountCommands;
  }

  /**
   * Initialize the command panel
   */
  private static async init() {
    const demoFiles = await DemoPanel.setDemoFiles();
    if (!demoFiles) {
      DemoPanel.showWelcome();
      return;
    }

    await DemoPanel.setExecutingDemoFile();
    DemoPanel.registerTreeview();
  }

  /**
   * Retrieves the demo files
   * @returns {Promise<boolean>} True if demo files are available, false otherwise
   */
  private static async setDemoFiles(): Promise<boolean> {
    const demoFiles = await FileProvider.getFiles();
    DemoPanel.demoFiles = demoFiles;
    return !!demoFiles;
  }

  /**
   * Retrieves the executing demo file
   */
  private static async setExecutingDemoFile() {
    DemoPanel.executingDemoFile = await DemoRunner.getExecutedDemoFile();
  }

  /**
   * Register all the treeviews
   */
  private static async registerTreeview() {
    DemoPanel.demoActionsProvider = new ActionTreeviewProvider();
    DemoPanel.demoActionsProvider.update();
    this.treeView = window.createTreeView("demo-time", {
      treeDataProvider: DemoPanel.demoActionsProvider,
    });
  }

  /**
   * Set the welcome view its context
   */
  private static showWelcome() {
    setContext(ContextKeys.showWelcome, true);
  }

  /**
   * Collapses all items in the "demo-time" tree view.
   *
   * @private
   */
  private static collapseAll() {
    commands.executeCommand("workbench.actions.treeView.demo-time.collapseAll");
  }
}
