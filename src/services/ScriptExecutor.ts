import { ProgressLocation, Uri, window } from "vscode";
import { Action, CommandType, Step } from "../models";
import { Notifications } from "./Notifications";
import { Config, StateKeys } from "../constants";
import { evaluateCommand, fileExists, getPlatform } from "../utils";
import { Extension } from "./Extension";
import { exec } from "child_process";
import { Logger } from "./Logger";
import { StateManager } from "./StateManager";

export class ScriptExecutor {
  public static async run(step: Step): Promise<void> {
    if (!step.id) {
      Notifications.error(`Step ID is missing from the "${Action.ExecuteScript}" action.`);
      return;
    }

    if (!step.path) {
      Notifications.error(`Path is missing from the "${Action.ExecuteScript}" action.`);
      return;
    }

    if (!step.command) {
      Notifications.error(`Command is missing from the "${Action.ExecuteScript}" action.`);
      return;
    }

    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: `${Config.title}: Executing script`,
        cancellable: false,
      },
      async () => {
        let command = step.command as string;
        const path = step.path as string;
        const id = step.id as string;

        const platform = getPlatform();
        if (step.command === CommandType.Node && platform !== "windows") {
          step.command = await evaluateCommand(CommandType.Node);
        }

        const wsPath = Extension.getInstance().workspaceFolder;
        if (!wsPath) {
          Notifications.error("Workspace folder not found.");
          return;
        }

        let scriptPath = Uri.joinPath(wsPath.uri, path as string);
        if (!(await fileExists(scriptPath))) {
          Notifications.error(`Script file not found at path: ${scriptPath.fsPath}`);
          return;
        }

        if (platform === "windows" && command.toLowerCase() === "powershell") {
          command = `${command} -File`;
        }

        const fullScript = `${command} "${scriptPath.fsPath}"`;
        const output = await ScriptExecutor.executeScriptAsync(fullScript, wsPath.uri.fsPath);
        Logger.info(`Step ID: ${id} - Output: ${output}`);

        if (output) {
          await StateManager.update(`${StateKeys.prefix.script}${id}`, output);
        }
      }
    );
  }

  /**
   * Execute script async
   * @param fullScript
   * @param wsPath
   * @returns
   */
  private static async executeScriptAsync(fullScript: string, wsPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(fullScript, { cwd: wsPath }, (error, stdout) => {
        if (error) {
          Logger.error(error.message);
          reject(error.message);
          return;
        }

        if (stdout && stdout.endsWith(`\n`)) {
          // Remove empty line at the end of the string
          stdout = stdout.slice(0, -1);
        }

        resolve(stdout);
      });
    });
  }
}
