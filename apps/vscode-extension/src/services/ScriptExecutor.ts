import { ProgressLocation, Uri, window } from 'vscode';
import { CommandType } from '../models';
import { Notifications } from './Notifications';
import { StateKeys } from '../constants';
import { evaluateCommand, fileExists, getPlatform } from '../utils';
import { Extension } from './Extension';
import { exec, spawn } from 'child_process';
import { Logger } from './Logger';
import { StateManager } from './StateManager';
import { Config, Action, Step } from '@demotime/common';

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

    const execute = async () => {
      let command = step.command as string;
      const path = step.path as string;
      const id = step.id as string;

      const platform = getPlatform();
      if (step.command === CommandType.Node && platform !== 'windows') {
        command = await evaluateCommand(CommandType.Node);
      }

      const wsPath = Extension.getInstance().workspaceFolder;
      if (!wsPath) {
        Notifications.error('Workspace folder not found.');
        return;
      }

      let scriptPath = Uri.joinPath(wsPath.uri, path as string);
      if (!(await fileExists(scriptPath))) {
        Notifications.error(`Script file not found at path: ${scriptPath.fsPath}`);
        return;
      }

      const isPowerShell = platform === 'windows' && command.toLowerCase() === 'powershell';

      const args = step.args as string[] | undefined;
      const output = await ScriptExecutor.spawnScriptAsync(
        command,
        scriptPath.fsPath,
        wsPath.uri.fsPath,
        args,
        step.waitForMessage,
        isPowerShell,
      );
      Logger.info(`Step ID: ${id} - Output: ${output}`);

      if (output) {
        await StateManager.update(`${StateKeys.prefix.script}${id}`, output);
      }
    };

    const showProgress = step.showProgress !== false;
    if (showProgress) {
      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: `${Config.title}: Executing script`,
          cancellable: false,
        },
        execute,
      );
    } else {
      await execute();
    }
  }

  /**
   * Format args array, filtering out undefined/null values
   * @param args Arguments array
   * @returns Filtered array of argument values
   */
  private static formatArgsArray(args: string[] | undefined): string[] {
    if (!args || !Array.isArray(args)) {
      return [];
    }

    return args.filter((value) => value !== undefined && value !== null);
  }

  /**
   * Execute script async
   * @param fullScript
   * @param wsPath
   * @returns
   */
  public static async executeScriptAsync(fullScript: string, wsPath: string): Promise<string> {
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

  /**
   * Spawn script async
   * @param command The command to execute (e.g., 'node', 'python', 'bash')
   * @param scriptPath Path to the script file
   * @param wsPath Workspace path
   * @param args Optional array of arguments to pass to the script
   * @returns Script output
   */
  public static async spawnScriptAsync(
    command: string,
    scriptPath: string,
    wsPath: string,
    args?: string[],
    waitForMessage?: string,
    isPowerShell?: boolean,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const argsArray = ScriptExecutor.formatArgsArray(args);
      const spawnArgs = isPowerShell ? ['-File', scriptPath, ...argsArray] : [scriptPath, ...argsArray];
      const childProcess = spawn(command, spawnArgs, { cwd: wsPath });

      let stdout = '';
      let stderr = '';
      let settled = false;

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();

        if (waitForMessage && !settled && stdout.includes(waitForMessage)) {
          settled = true;
          resolve(stdout);
        }
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        if (settled) {
          return;
        }

        if (code !== 0) {
          const errorMsg = stderr || `Script exited with code ${code}`;
          Logger.error(errorMsg);
          reject(errorMsg);
          return;
        }

        if (stdout && stdout.endsWith('\n')) {
          // Remove empty line at the end of the string
          stdout = stdout.slice(0, -1);
        }

        resolve(stdout);
      });

      childProcess.on('error', (error) => {
        if (!settled) {
          Logger.error(error.message);
          reject(error.message);
        }
      });
    });
  }
}
