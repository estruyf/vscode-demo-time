import { commands, StatusBarAlignment, StatusBarItem, ThemeColor, Uri, window } from 'vscode';
import { DemoRunner } from './DemoRunner';
import { DemoFileProvider } from './DemoFileProvider';
import { COMMAND, Config, ContextKeys, WebViewMessages } from '../constants';
import { Demo, Subscription } from '../models';
import { Extension } from './Extension';
import { getNextDemoFile, setContext } from '../utils';
import { PresenterView } from '../presenterView/PresenterView';
import { Logger } from './Logger';

export class DemoStatusBar {
  private static statusPresenting: StatusBarItem;
  private static statusBarItem: StatusBarItem;
  private static statusBarNotes: StatusBarItem;
  private static statusBarClock: StatusBarItem;
  private static statusBarPause: StatusBarItem;
  private static countdownStarted: Date | undefined;
  private static countdownPaused: boolean = false;
  private static pausedTimeRemaining: number | undefined;
  private static nextDemo: Demo | undefined;

  public static register() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;
    subscriptions.push(
      commands.registerCommand(COMMAND.startCountdown, DemoStatusBar.startCountdown),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.resetCountdown, DemoStatusBar.resetCountdown),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.pauseCountdown, DemoStatusBar.pauseCountdown),
    );
    setContext(ContextKeys.countdown, false);

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
      DemoStatusBar.statusBarItem = window.createStatusBarItem(
        'next-demo',
        StatusBarAlignment.Left,
        100001,
      );
      DemoStatusBar.statusBarItem.name = `${Config.title} - Next Demo`;
      DemoStatusBar.statusBarItem.command = COMMAND.start;

      DemoStatusBar.statusBarItem.backgroundColor = new ThemeColor(
        'statusBarItem.warningBackground',
      );
      DemoStatusBar.statusBarItem.color = new ThemeColor('statusBarItem.warningForeground');
    }

    if (!DemoStatusBar.statusBarNotes) {
      DemoStatusBar.statusBarNotes = window.createStatusBarItem(
        'notes',
        StatusBarAlignment.Left,
        100000,
      );
      DemoStatusBar.statusBarNotes.name = `${Config.title} - Notes`;
      DemoStatusBar.statusBarNotes.command = COMMAND.viewNotes;
      DemoStatusBar.statusBarNotes.text = `$(book) Notes`;
      DemoStatusBar.statusBarNotes.tooltip = `Show the notes for the current demo step`;
    }

    if (!DemoStatusBar.statusBarPause) {
      DemoStatusBar.statusBarPause = window.createStatusBarItem(
        'pause-countdown',
        StatusBarAlignment.Right,
        99999,
      );
      DemoStatusBar.statusBarPause.name = `${Config.title} - Pause/Resume Countdown`;
      DemoStatusBar.statusBarPause.command = COMMAND.pauseCountdown;
      DemoStatusBar.statusBarPause.text = `$(debug-pause) Pause`;
      DemoStatusBar.statusBarPause.tooltip = 'Pause the countdown timer';
    }
  }

  public static async showTimer() {
    const timer = await DemoStatusBar.getTimer();
    await setContext(ContextKeys.showTimer, !!timer);
  }

  public static async update() {
    const demoFiles = await DemoFileProvider.getFiles();
    const executingFile = await DemoRunner.getExecutedDemoFile();

    if (demoFiles && executingFile.filePath) {
      let executingDemos = demoFiles[executingFile.filePath].demos;
      const lastDemo = executingFile.demo[executingFile.demo.length - 1];

      let crntDemoIdx = executingDemos.findIndex((d, idx) =>
        d.id ? d.id === lastDemo.id : idx === lastDemo.idx,
      );

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
          PresenterView.postMessage(
            WebViewMessages.toWebview.updateNextDemo,
            DemoStatusBar.nextDemo,
          );
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
        DemoStatusBar.statusBarItem.tooltip =
          nextDemo.description || `Next demo: ${nextDemo.title}`;
        DemoStatusBar.statusBarItem.show();
      } else {
        Logger.info('No next demo found');
        DemoStatusBar.nextDemo = undefined;
        DemoStatusBar.statusBarItem.hide();
      }
    } else {
      Logger.info('No next demo file path found');
      DemoStatusBar.nextDemo = undefined;
      DemoStatusBar.statusBarItem.hide();
      DemoStatusBar.statusBarNotes.hide();
    }

    PresenterView.postMessage(WebViewMessages.toWebview.updateNextDemo, DemoStatusBar.nextDemo);
  }

  public static async setPresenting(enabled: boolean) {
    if (!DemoStatusBar.statusPresenting) {
      DemoStatusBar.statusPresenting = window.createStatusBarItem(
        'presenting',
        StatusBarAlignment.Left,
        100002,
      );
      DemoStatusBar.statusPresenting.name = `${Config.title} - presenting`;
      DemoStatusBar.statusPresenting.text = `$(record)`;
      DemoStatusBar.statusPresenting.tooltip = 'Presenting';
      DemoStatusBar.statusPresenting.command = COMMAND.togglePresentationMode;
      DemoStatusBar.statusPresenting.backgroundColor = new ThemeColor(
        'statusBarItem.errorBackground',
      );
      DemoStatusBar.statusPresenting.color = new ThemeColor('statusBarItem.errorForeground');
    }

    if (enabled) {
      DemoStatusBar.statusPresenting.show();
    } else {
      DemoStatusBar.statusPresenting.hide();
    }
  }

  /**
   * Retrieves the timer setting from the current demo file or falls back to the extension setting.
   */
  public static async getTimer(): Promise<number | undefined> {
    const executingFile = await DemoRunner.getExecutedDemoFile();
    if (executingFile.filePath) {
      const demoFile = await DemoFileProvider.getFile(Uri.file(executingFile.filePath));
      const timer = demoFile?.timer;
      if (typeof timer === 'number') {
        return timer;
      }
    }
    return Extension.getInstance().getSetting<number>(Config.clock.timer);
  }

  private static async startCountdown() {
    const timer = await DemoStatusBar.getTimer();
    if (!timer) {
      return;
    }

    DemoStatusBar.countdownStarted = new Date();
    DemoStatusBar.updatePause(false);
    DemoStatusBar.pausedTimeRemaining = undefined;
    await setContext(ContextKeys.countdown, true);
    await DemoStatusBar.startClock();
    DemoStatusBar.statusBarPause.show();
    PresenterView.postMessage(
      WebViewMessages.toWebview.updateCountdownStarted,
      DemoStatusBar.countdownStarted,
    );
  }

  private static async resetCountdown() {
    DemoStatusBar.countdownStarted = undefined;
    DemoStatusBar.updatePause(false);
    DemoStatusBar.pausedTimeRemaining = undefined;
    await setContext(ContextKeys.countdown, false);
    DemoStatusBar.statusBarClock.backgroundColor = undefined;
    DemoStatusBar.statusBarClock.color = undefined;
    DemoStatusBar.startClock();
    DemoStatusBar.statusBarPause.hide();
    PresenterView.postMessage(WebViewMessages.toWebview.updateCountdownStarted, undefined);
    PresenterView.postMessage(WebViewMessages.toWebview.resetCountdown, undefined);
  }

  private static async pauseCountdown() {
    const timer = await DemoStatusBar.getTimer();
    if (!timer) {
      return;
    }

    if (DemoStatusBar.countdownPaused) {
      // Resume countdown
      DemoStatusBar.updatePause(false);
      if (DemoStatusBar.pausedTimeRemaining !== undefined) {
        DemoStatusBar.countdownStarted = new Date(
          new Date().getTime() - (timer * 60 * 1000 - DemoStatusBar.pausedTimeRemaining),
        );
      }
      DemoStatusBar.statusBarPause.text = `$(debug-pause) Pause`;
      DemoStatusBar.statusBarPause.tooltip = 'Pause the countdown timer';
    } else {
      // Pause countdown
      DemoStatusBar.updatePause(true);
      if (DemoStatusBar.countdownStarted) {
        const diff = new Date().getTime() - DemoStatusBar.countdownStarted.getTime();
        DemoStatusBar.pausedTimeRemaining = timer * 60 * 1000 - diff;
      }
      DemoStatusBar.statusBarPause.text = `$(debug-start) Resume`;
      DemoStatusBar.statusBarPause.tooltip = 'Resume the countdown timer';
    }
  }

  private static async startClock() {
    DemoStatusBar.ensureStatusBarClock();
    const clock = DemoStatusBar.getCurrentClock();
    const timer = await DemoStatusBar.getTimer();
    DemoStatusBar.setStatusBarClockCommand(timer);
    DemoStatusBar.sendClockToPresenter(clock);
    let text = DemoStatusBar.getClockText(clock);

    if (DemoStatusBar.countdownStarted && timer) {
      text += DemoStatusBar.getCountdownText(timer);
    }

    DemoStatusBar.statusBarClock.text = text.trim();
    DemoStatusBar.statusBarClock.tooltip = 'Click to start/reset the countdown timer';

    if (!DemoStatusBar.statusBarClock.text) {
      DemoStatusBar.statusBarClock.hide();
      return;
    }
    DemoStatusBar.statusBarClock.show();

    setTimeout(() => {
      DemoStatusBar.startClock();
    }, 1000);
  }

  private static ensureStatusBarClock() {
    if (!DemoStatusBar.statusBarClock) {
      DemoStatusBar.statusBarClock = window.createStatusBarItem(
        'clock',
        StatusBarAlignment.Right,
        100000,
      );
      DemoStatusBar.statusBarClock.name = `${Config.title} - Clock & Countdown`;
    }
  }

  private static getCurrentClock(): string {
    const date = new Date();
    const time = date.toTimeString();
    // Only show hour and minute
    return time.split(':').slice(0, 2).join(':');
  }

  private static setStatusBarClockCommand(timer: number | undefined) {
    const showClock = Extension.getInstance().getSetting<number>(Config.clock.show);
    if (timer) {
      if (DemoStatusBar.countdownStarted) {
        DemoStatusBar.statusBarClock.command = COMMAND.resetCountdown;
      } else {
        DemoStatusBar.statusBarClock.command = COMMAND.startCountdown;
      }
    }
  }

  private static sendClockToPresenter(clock: string) {
    PresenterView.postMessage(WebViewMessages.toWebview.updateClock, clock);
  }

  private static getClockText(clock: string): string {
    const showClock = Extension.getInstance().getSetting<number>(Config.clock.show);
    return showClock ? `$(dt-clock) ${clock}` : '';
  }

  private static getCountdownText(timer: number): string {
    let countdown: string;
    let isNegative = false;

    if (DemoStatusBar.countdownPaused) {
      const seconds = Math.floor(DemoStatusBar.pausedTimeRemaining! / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.abs(seconds % 60);
      const min = Math.abs(minutes) < 10 ? `0${Math.abs(minutes)}` : minutes;
      const sec = remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds;
      countdown = `${min}:${sec}`;
    } else {
      const diff = new Date().getTime() - DemoStatusBar.countdownStarted!.getTime();
      const seconds = Math.floor((timer * 60 * 1000 - diff) / 1000);
      let minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.abs(seconds % 60);
      if (seconds <= 0) {
        isNegative = true;
        DemoStatusBar.statusBarClock.backgroundColor = new ThemeColor(
          'statusBarItem.errorBackground',
        );
        DemoStatusBar.statusBarClock.color = new ThemeColor('statusBarItem.errorForeground');
        if (minutes < 0) {
          minutes = minutes + 1;
        }
      } else {
        DemoStatusBar.statusBarClock.backgroundColor = undefined;
        DemoStatusBar.statusBarClock.color = undefined;
      }
      const min = Math.abs(minutes) < 10 ? `0${Math.abs(minutes)}` : minutes;
      const sec = remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds;
      countdown = `${isNegative ? '-' : ''}${min}:${sec}`;
    }
    // Send the countdown to the presenter view
    PresenterView.postMessage(WebViewMessages.toWebview.updateCountdown, countdown);
    return `    $(dt-timer-off) ${countdown}`;
  }

  private static updatePause(status: boolean) {
    DemoStatusBar.countdownPaused = status;
    PresenterView.postMessage(WebViewMessages.toWebview.updateCountdownStatus, status);
  }
}
