import { ProgressLocation, window } from 'vscode';
import { COMMAND, Config } from '@demotime/common';
import { Logger } from './Logger';

export class Notifications {
  /**
   * Show a notification to the user
   * @param message
   * @param items
   * @returns
   */
  public static info(message: string, ...items: any): Thenable<string | undefined> {
    Logger.info(`${Config.title}: ${message}`, 'INFO');

    return window.showInformationMessage(`${Config.title}: ${message}`, ...items);
  }

  /**
   * Show an information notification with a progress bar
   * @param message
   * @param durationMs
   */
  public static infoWithProgress(message: string, durationMs = 3000): void {
    void window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: `${Config.title}: ${message}`,
        cancellable: false,
      },
      async (progress, token) => {
        const totalSteps = 100;
        const stepInterval = durationMs / totalSteps;
        for (let step = 0; step < totalSteps; step++) {
          if (token.isCancellationRequested) {
            break;
          }
          progress.report({ increment: 100 / totalSteps });
          await new Promise((resolve) => setTimeout(resolve, stepInterval));
        }
      },
    );
  }

  /**
   * Show a warning notification to the user
   * @param message
   * @param items
   * @returns
   */
  public static warning(message: string, ...items: any): Thenable<string | undefined> {
    Logger.info(`${Config.title}: ${message}`, 'WARNING');

    return window.showWarningMessage(`${Config.title}: ${message}`, ...items);
  }

  /**
   * Show an error notification to the user
   * @param message
   * @param items
   * @returns
   */
  public static error(message: string, ...items: any): Thenable<string | undefined> {
    Logger.info(`${Config.title}: ${message}`, 'ERROR');

    return window.showErrorMessage(`${Config.title}: ${message}`, ...items);
  }

  /**
   * Show an error notification to the user with a link to the output channel
   * @param message
   * @param items
   * @returns
   */
  public static errorWithOutput(message: string, ...items: any): Thenable<string | undefined> {
    Logger.info(`${Config.title}: ${message}`, 'ERROR');

    return window.showErrorMessage(
      `${Config.title}: ${message} [Show Output](command:${COMMAND.showOutputChannel})`,
      ...items,
    );
  }
}
