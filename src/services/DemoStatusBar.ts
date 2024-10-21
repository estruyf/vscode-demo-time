import { commands, StatusBarAlignment, StatusBarItem, ThemeColor, window } from "vscode";
import { DemoRunner } from "./DemoRunner";
import { FileProvider } from "./FileProvider";
import { COMMAND, Config } from "../constants";
import { Subscription } from "../models";
import { Extension } from "./Extension";

export class DemoStatusBar {
  private static statusBarItem: StatusBarItem;
  private static statusBarClock: StatusBarItem;
  private static countdownStarted: Date | undefined;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.startCountdown, DemoStatusBar.startCountdown));
    subscriptions.push(commands.registerCommand(COMMAND.resetCountdown, DemoStatusBar.resetCountdown));
    commands.executeCommand("setContext", "demo-time.countdown", false);

    if (!DemoStatusBar.statusBarItem) {
      DemoStatusBar.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100000);
      DemoStatusBar.statusBarItem.command = COMMAND.start;

      DemoStatusBar.statusBarItem.backgroundColor = new ThemeColor("statusBarItem.warningBackground");
      DemoStatusBar.statusBarItem.color = new ThemeColor("statusBarItem.warningForeground");
    }

    DemoStatusBar.update();

    DemoStatusBar.startClock();
  }

  public static async update() {
    const demoFiles = await FileProvider.getFiles();
    const executingFile = await DemoRunner.getExecutedDemoFile();

    if (demoFiles && executingFile.filePath) {
      const executingDemos = demoFiles[executingFile.filePath].demos;
      const lastDemo = executingFile.demo[executingFile.demo.length - 1];

      const crntDemoIdx = executingDemos.findIndex((d) => (d.id ? d.id === lastDemo.id : d.title === lastDemo.title));

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

  private static async startCountdown() {
    const timer = Extension.getInstance().getSetting<number>(Config.clock.timer);
    if (!timer) {
      return;
    }

    DemoStatusBar.countdownStarted = new Date();
    await commands.executeCommand("setContext", "demo-time.countdown", true);
    DemoStatusBar.startClock();
  }

  private static async resetCountdown() {
    DemoStatusBar.countdownStarted = undefined;
    await commands.executeCommand("setContext", "demo-time.countdown", false);
    DemoStatusBar.statusBarClock.backgroundColor = undefined;
    DemoStatusBar.statusBarClock.color = undefined;
    DemoStatusBar.startClock();
  }

  private static startClock() {
    if (!DemoStatusBar.statusBarClock) {
      DemoStatusBar.statusBarClock = window.createStatusBarItem(StatusBarAlignment.Right, 100000);
    }

    const date = new Date();
    const time = date.toLocaleTimeString();

    const showClock = Extension.getInstance().getSetting<number>(Config.clock.show);
    const timer = Extension.getInstance().getSetting<number>(Config.clock.timer);
    if (timer) {
      if (DemoStatusBar.countdownStarted) {
        DemoStatusBar.statusBarClock.command = COMMAND.resetCountdown;
      } else {
        DemoStatusBar.statusBarClock.command = COMMAND.startCountdown;
      }
    }

    // Only show hour and minute
    let text = showClock ? `$(dt-clock) ${time.split(":").slice(0, 2).join(":")}` : "";
    if (DemoStatusBar.countdownStarted && timer) {
      // Show the time as countdown
      const diff = new Date().getTime() - DemoStatusBar.countdownStarted.getTime();
      const seconds = Math.floor((timer * 60 * 1000 - diff) / 1000);
      let minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.abs(seconds % 60);

      if (seconds <= 0) {
        DemoStatusBar.statusBarClock.backgroundColor = new ThemeColor("statusBarItem.errorBackground");
        DemoStatusBar.statusBarClock.color = new ThemeColor("statusBarItem.errorForeground");

        if (minutes < 0) {
          // To show the correct overtime
          minutes = minutes + 1;
        }
      }

      // Add leading zero
      const min = Math.abs(minutes) < 10 ? `0${Math.abs(minutes)}` : minutes;
      const sec = remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds;
      text += `    $(dt-timer) ${minutes < 0 ? `-${min}` : min}:${sec}`;
    }

    DemoStatusBar.statusBarClock.text = text.trim();

    if (!DemoStatusBar.statusBarClock.text) {
      DemoStatusBar.statusBarClock.hide();
      return;
    }
    DemoStatusBar.statusBarClock.show();

    setTimeout(() => {
      DemoStatusBar.startClock();
    }, 1000);
  }
}
