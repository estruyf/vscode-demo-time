import { StatusBarAlignment, StatusBarItem, ThemeColor, window } from "vscode";
import { DemoRunner } from "./DemoRunner";
import { FileProvider } from "./FileProvider";
import { COMMAND } from "../constants";

export class DemoStatusBar {
  private static statusBarItem: StatusBarItem;

  public static register() {
    if (!DemoStatusBar.statusBarItem) {
      DemoStatusBar.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100000);
      DemoStatusBar.statusBarItem.command = COMMAND.start;

      DemoStatusBar.statusBarItem.backgroundColor = new ThemeColor("statusBarItem.warningBackground");
      DemoStatusBar.statusBarItem.color = new ThemeColor("statusBarItem.warningForeground");
    }

    DemoStatusBar.update();
  }

  public static async update() {
    const demoFiles = await FileProvider.getFiles();
    const executingFile = await DemoRunner.getExecutedDemoFile();

    if (demoFiles && executingFile.filePath) {
      const executingDemos = demoFiles[executingFile.filePath].demos;

      const crntDemoIdx = executingDemos.findIndex((d) => {
        return executingFile.demo.find((ed) => ed.title === d.title);
      });

      // Check if exists and is the last demo
      if (crntDemoIdx !== -1 && crntDemoIdx === executingDemos.length - 1) {
        DemoStatusBar.statusBarItem.hide();
        return;
      }

      // Get the next demo
      const nextDemo = executingDemos[crntDemoIdx + 1];

      if (nextDemo) {
        DemoStatusBar.statusBarItem.text = `$(rocket) ${nextDemo.title}`;
        DemoStatusBar.statusBarItem.tooltip = nextDemo.description;
        DemoStatusBar.statusBarItem.show();
      } else {
        DemoStatusBar.statusBarItem.hide();
      }
    } else {
      DemoStatusBar.statusBarItem.hide();
    }
  }
}
