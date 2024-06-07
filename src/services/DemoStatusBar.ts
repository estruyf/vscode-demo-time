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
      // Fetch the first demo that hasn't been executed
      const nextDemo = executingDemos.find((d) => {
        return !executingFile.demo.find((ed) => ed.title === d.title);
      });

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
