import { commands, StatusBarAlignment, StatusBarItem, ThemeColor, window } from "vscode";
import { DemoRunner } from "./DemoRunner";
import { FileProvider } from "./FileProvider";
import { COMMAND, Config, ContextKeys, WebViewMessages } from "../constants";
import { Demo, Subscription } from "../models";
import { Extension } from "./Extension";
import { getNextDemoFile } from "../utils";
import { PresenterView } from "../presenterView/PresenterView";
import { Logger } from "./Logger";

export class DemoStatusBar {
  private static statusBarItem: StatusBarItem;
  private static statusBarNotes: StatusBarItem;
  private static statusBarClock: StatusBarItem;
  private static countdownStarted: Date | undefined;
  private static nextDemo: Demo | undefined;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(commands.registerCommand(COMMAND.startCountdown, DemoStatusBar.startCountdown));
    subscriptions.push(commands.registerCommand(COMMAND.resetCountdown, DemoStatusBar.resetCountdown));
    commands.executeCommand("setContext", ContextKeys.countdown, false);

    DemoStatusBar.createStatusBarItems();

    DemoStatusBar.update();

    DemoStatusBar.startClock();
    DemoStatusBar.showTimer();
  }

  public static getNextDemo() {
    return DemoStatusBar.nextDemo;
  }

  public static getCountdownStarted() {
    return DemoStatusBar.countdownStarted;
  }

  public static createStatusBarItems() {
    if (!DemoStatusBar.statusBarItem) {
      DemoStatusBar.statusBarItem = window.createStatusBarItem("next-demo", StatusBarAlignment.Left, 100001);
      DemoStatusBar.statusBarItem.name = "Demo Time - Next Demo";
      DemoStatusBar.statusBarItem.command = COMMAND.start;

      DemoStatusBar.statusBarItem.backgroundColor = new ThemeColor("statusBarItem.warningBackground");
      DemoStatusBar.statusBarItem.color = new ThemeColor("statusBarItem.warningForeground");
    }

    if (!DemoStatusBar.statusBarNotes) {
      DemoStatusBar.statusBarNotes = window.createStatusBarItem("notes", StatusBarAlignment.Left, 100000);
      DemoStatusBar.statusBarNotes.name = "Demo Time - Notes";
      DemoStatusBar.statusBarNotes.command = COMMAND.viewNotes;
      DemoStatusBar.statusBarNotes.text = `$(book) Notes`;
      DemoStatusBar.statusBarNotes.tooltip = `Show the notes for the current demo step`;
    }
  }

  public static async showTimer() {
    const showTimer = Extension.getInstance().getSetting<number>(Config.clock.timer);
    await commands.executeCommand("setContext", ContextKeys.showTimer, !!showTimer);
  }

  public static async update() {
    const demoFiles = await FileProvider.getFiles();
    const executingFile = await DemoRunner.getExecutedDemoFile();

    if (demoFiles && executingFile.filePath) {
      let executingDemos = demoFiles[executingFile.filePath].demos;
      const lastDemo = executingFile.demo[executingFile.demo.length - 1];

      let crntDemoIdx = executingDemos.findIndex((d, idx) => (d.id ? d.id === lastDemo.id : idx === lastDemo.idx));

      // Show the notes action
      const crntDemo = executingDemos[crntDemoIdx];
      if (crntDemo.notes && crntDemo.notes.path) {
        DemoStatusBar.statusBarNotes.show();
      } else {
        DemoStatusBar.statusBarNotes.hide();
      }

      // Check if exists and is the last demo
      if (crntDemoIdx !== -1 && crntDemoIdx === executingDemos.length - 1) {
        // Check if there is a next demo file
        const nextFile = await getNextDemoFile(executingFile);
        if (!nextFile) {
          DemoStatusBar.statusBarItem.hide();
          DemoStatusBar.nextDemo = undefined;
          PresenterView.postMessage(WebViewMessages.toWebview.updateNextDemo, DemoStatusBar.nextDemo);
          return;
        }

        // Reset the current demo index + set the next demos
        crntDemoIdx = -1;
        executingDemos = nextFile.demo.demos;
      }

      // Get the next demo
      const nextDemo = executingDemos[crntDemoIdx + 1];

      if (nextDemo) {
        DemoStatusBar.createStatusBarItems();

        Logger.info(`Next demo: ${nextDemo.title}`);
        DemoStatusBar.nextDemo = nextDemo;
        DemoStatusBar.statusBarItem.text = `$(dt-logo) ${nextDemo.title}`;
        DemoStatusBar.statusBarItem.tooltip = nextDemo.description || `Next demo: ${nextDemo.title}`;
        DemoStatusBar.statusBarItem.show();
      } else {
        Logger.info("No next demo found");
        DemoStatusBar.nextDemo = undefined;
        DemoStatusBar.statusBarItem.hide();
      }
    } else {
      Logger.info("No next demo file path found");
      DemoStatusBar.nextDemo = undefined;
      DemoStatusBar.statusBarItem.hide();
      DemoStatusBar.statusBarNotes.hide();
    }

    PresenterView.postMessage(WebViewMessages.toWebview.updateNextDemo, DemoStatusBar.nextDemo);
  }

  private static async startCountdown() {
    const timer = Extension.getInstance().getSetting<number>(Config.clock.timer);
    if (!timer) {
      return;
    }

    DemoStatusBar.countdownStarted = new Date();
    await commands.executeCommand("setContext", ContextKeys.countdown, true);
    DemoStatusBar.startClock();
    PresenterView.postMessage(WebViewMessages.toWebview.updateCountdownStarted, DemoStatusBar.countdownStarted);
  }

  private static async resetCountdown() {
    DemoStatusBar.countdownStarted = undefined;
    await commands.executeCommand("setContext", ContextKeys.countdown, false);
    DemoStatusBar.statusBarClock.backgroundColor = undefined;
    DemoStatusBar.statusBarClock.color = undefined;
    DemoStatusBar.startClock();
    PresenterView.postMessage(WebViewMessages.toWebview.updateCountdownStarted, undefined);
  }

  private static startClock() {
    if (!DemoStatusBar.statusBarClock) {
      DemoStatusBar.statusBarClock = window.createStatusBarItem("clock", StatusBarAlignment.Right, 100000);
      DemoStatusBar.statusBarClock.name = "Demo Time - Clock & Countdown";
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
    const clock = time.split(":").slice(0, 2).join(":");
    let text = showClock ? `$(dt-clock) ${clock}` : "";

    // Send the clock to the presenter view
    PresenterView.postMessage(WebViewMessages.toWebview.updateClock, clock);

    if (DemoStatusBar.countdownStarted && timer) {
      // Show the time as countdown
      const diff = new Date().getTime() - DemoStatusBar.countdownStarted.getTime();
      const seconds = Math.floor((timer * 60 * 1000 - diff) / 1000);
      let minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.abs(seconds % 60);

      let isNegative = false;
      if (seconds <= 0) {
        isNegative = true;
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
      const countdown = `${min}:${sec}`;
      text += `    $(dt-timer-off) ${isNegative ? "-" : ""}${countdown}`;

      // Send the clock to the presenter view
      PresenterView.postMessage(WebViewMessages.toWebview.updateCountdown, `${isNegative ? "-" : ""}${countdown}`);
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
