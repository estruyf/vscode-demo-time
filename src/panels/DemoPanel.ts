import { ThemeColor, TreeItem, TreeView, commands, window } from "vscode";
import { ContextKeys } from "../constants/ContextKeys";
import { FileProvider } from "../services/FileProvider";
import { DemoFiles, Demos, Subscription } from "../models";
import { ActionTreeItem, ActionTreeviewProvider } from "../providers/ActionTreeviewProvider";
import { DemoRunner } from "../services/DemoRunner";
import { COMMAND } from "../constants";
import { parseWinPath } from "../utils";
import { DemoStatusBar } from "../services/DemoStatusBar";
import { Extension } from "../services/Extension";

export class DemoPanel {
  private static treeView: TreeView<TreeItem>;

  public static register() {
    DemoPanel.init();

    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.collapseAll, DemoPanel.collapseAll));
  }

  public static update() {
    DemoPanel.init();
    DemoStatusBar.update();
  }

  public static updateTitle(title: string) {
    if (this.treeView) {
      this.treeView.title = title;
    }
  }

  /**
   * Initialize the command panel
   * @returns
   */
  private static async init() {
    const demoFiles = await FileProvider.getFiles();
    if (!demoFiles) {
      DemoPanel.showWelcome();
      return;
    }

    DemoPanel.registerTreeview(demoFiles);
  }

  /**
   * Register all the treeviews
   */
  private static async registerTreeview(demoFiles: DemoFiles) {
    if (!demoFiles) {
      return;
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
      const executingFile = await DemoRunner.getExecutedDemoFile();

      const demoSteps = demos.demos.map((demo, idx, allDemos) => {
        let hasExecuted = false;
        if (executingFile.filePath === path) {
          hasExecuted = !!executingFile.demo.find((d) => (d.id ? d.id === demo.id : d.title === demo.title));
        }

        let ctxValue = "demo-time.step";
        if (idx === 0) {
          ctxValue = "demo-time.firstStep";
        } else if (idx === allDemos.length - 1) {
          ctxValue = "demo-time.lastStep";
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
            color: hasExecuted ? new ThemeColor("terminal.ansiGreen") : undefined,
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
          idx
        );
      });

      accountCommands.push(
        new ActionTreeItem(
          demos.title,
          path.split("/").pop() as string,
          {
            name: executingFile.filePath === path ? "play-circle" : "folder",
            custom: false,
            color: executingFile.filePath === path ? new ThemeColor("terminal.ansiGreen") : undefined,
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

    this.treeView = window.createTreeView("demo-time", {
      treeDataProvider: new ActionTreeviewProvider(accountCommands),
    });
  }

  /**
   * Set the welcome view its context
   */
  private static showWelcome() {
    commands.executeCommand("setContext", ContextKeys.showWelcome, true);
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
