import { window } from "vscode";
import { COMMAND } from "../constants";
import { Logger } from "./Logger";
import { Extension } from "./Extension";

export class Notifications {
  /**
   * Show a notification to the user
   * @param message
   * @param items
   * @returns
   */
  public static info(message: string, ...items: any): Thenable<string | undefined> {
    Logger.info(`${Extension.getInstance().displayName}: ${message}`, "INFO");

    return window.showInformationMessage(`${Extension.getInstance().displayName}: ${message}`, ...items);
  }

  /**
   * Show a warning notification to the user
   * @param message
   * @param items
   * @returns
   */
  public static warning(message: string, ...items: any): Thenable<string | undefined> {
    Logger.info(`${Extension.getInstance().displayName}: ${message}`, "WARNING");

    return window.showWarningMessage(`${Extension.getInstance().displayName}: ${message}`, ...items);
  }

  /**
   * Show an error notification to the user
   * @param message
   * @param items
   * @returns
   */
  public static error(message: string, ...items: any): Thenable<string | undefined> {
    Logger.info(`${Extension.getInstance().displayName}: ${message}`, "ERROR");

    return window.showErrorMessage(`${Extension.getInstance().displayName}: ${message}`, ...items);
  }

  /**
   * Show an error notification to the user with a link to the output channel
   * @param message
   * @param items
   * @returns
   */
  public static errorWithOutput(message: string, ...items: any): Thenable<string | undefined> {
    Logger.info(`${Extension.getInstance().displayName}: ${message}`, "ERROR");

    return window.showErrorMessage(
      `${Extension.getInstance().displayName}: ${message} [Show Output](command:${COMMAND.showOutputChannel})`,
      ...items
    );
  }
}
