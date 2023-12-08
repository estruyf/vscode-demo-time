import { ThemeColor, commands, window } from "vscode";
import { ContextKeys } from "../constants/ContextKeys";
import { FileProvider } from "../services/FileProvider";
import { DemoFiles, Demos } from "../models";
import {
  ActionTreeItem,
  ActionTreeviewProvider,
} from "../providers/ActionTreeviewProvider";
import { DemoRunner } from "../services/DemoRunner";

export class DemoPanel {
  public static register() {
    DemoPanel.init();
  }

  public static update() {
    DemoPanel.init();
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
  private static registerTreeview(demoFiles: DemoFiles) {
    if (!demoFiles) {
      return;
    }

    const accountCommands: ActionTreeItem[] = [];

    for (const path of Object.keys(demoFiles)) {
      const demos = (demoFiles as any)[path] as Demos;

      accountCommands.push(
        new ActionTreeItem(
          demos.title,
          path.split("/").pop() as string,
          { name: "folder", custom: false },
          undefined,
          undefined,
          undefined,
          undefined,
          [
            ...demos.demos.map((demo) => {
              const hasExecuted = DemoRunner.ExecutedDemoSteps.includes(
                demo.title
              );

              return new ActionTreeItem(
                demo.title,
                demo.description,
                {
                  name: hasExecuted ? "pass-filled" : "run",
                  color: hasExecuted
                    ? new ThemeColor("terminal.ansiGreen")
                    : undefined,
                  custom: false,
                },
                undefined,
                "demo-time.startDemo",
                demo
              );
            }),
          ]
        )
      );
    }

    window.registerTreeDataProvider(
      "demo-time",
      new ActionTreeviewProvider(accountCommands)
    );
  }

  /**
   * Set the welcome view its context
   */
  private static showWelcome() {
    commands.executeCommand("setContext", ContextKeys.showWelcome, true);
  }
}
