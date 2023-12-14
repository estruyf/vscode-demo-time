import { ThemeColor, TreeItem, TreeView, commands, window } from "vscode";
import { ContextKeys } from "../constants/ContextKeys";
import { FileProvider } from "../services/FileProvider";
import { DemoFiles, Demos } from "../models";
import { ActionTreeItem, ActionTreeviewProvider } from "../providers/ActionTreeviewProvider";
import { DemoRunner } from "../services/DemoRunner";
import { COMMAND } from "../constants";

export class DemoPanel {
  private static treeView: TreeView<TreeItem>;

  public static register() {
    DemoPanel.init();
  }

  public static update() {
    DemoPanel.init();
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

    const accountCommands: ActionTreeItem[] = [];

    for (const path of Object.keys(demoFiles)) {
      const demos = (demoFiles as any)[path] as Demos;
      const executingFile = await DemoRunner.getExecutedDemoFile();

      const demoSteps = demos.demos.map((demo, idx) => {
        const hasExecuted = executingFile.demo.find((d) => d.title === demo.title);

        return new ActionTreeItem(
          demo.title,
          demo.description,
          {
            name: hasExecuted ? "pass-filled" : "run",
            color: hasExecuted ? new ThemeColor("terminal.ansiGreen") : undefined,
            custom: false,
          },
          undefined,
          COMMAND.runStep,
          {
            filePath: path,
            idx: idx,
            demo: demo,
          }
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
            : [new ActionTreeItem("No demo steps defined", "", undefined, undefined, undefined)]
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
}
