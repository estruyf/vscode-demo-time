import { ThemeColor, commands, window } from "vscode";
import { ContextKeys } from "../constants/ContextKeys";
import { FileProvider } from "../services/FileProvider";
import { Demos } from "../models";
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
    const demoJson = await FileProvider.getFile();
    if (!demoJson) {
      DemoPanel.showWelcome();
      return;
    }

    DemoPanel.registerTreeview(demoJson);
  }

  /**
   * Register all the treeviews
   */
  private static registerTreeview(demos: Demos) {
    if (!demos) {
      return;
    }

    const accountCommands: ActionTreeItem[] = [];

    accountCommands.push(
      new ActionTreeItem(
        demos.title,
        demos.description,
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
