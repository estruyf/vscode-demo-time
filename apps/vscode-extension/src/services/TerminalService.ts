import { commands, Terminal, window, Disposable, TerminalShellExecution } from 'vscode';
import { Notifications } from './Notifications';
import { sleep } from '../utils';
import { DemoRunner } from './DemoRunner';
import { Step } from '@demotime/common';

/**
 * Service to manage terminal operations for demo execution.
 */
export class TerminalService {
  private static terminal: { [id: string]: Terminal | null } = {};
  private static onTerminalCompleted: { [id: string]: Disposable } = {};
  private static lastExecution: { [id: string]: string } = {};
  private static readonly terminalName = 'DemoTime';
  private static closeTerminalDisposable: Disposable | undefined;

  /**
   * Registers an event listener that tracks the closing of VS Code terminals.
   * When a terminal is closed, it removes the corresponding terminal entry from the internal terminal map.
   * This helps manage and clean up terminal references within the `TerminalService`.
   */
  public static register(): void {
    TerminalService.closeTerminalDisposable = window.onDidCloseTerminal((term) => {
      if (term.name && TerminalService.terminal[term.name]) {
        delete TerminalService.terminal[term.name];
      }
    });
  }

  /**
   * Executes a terminal command.
   * @param command - The command to be executed.
   * @param terminalId - The ID of the terminal to use (optional).
   * @returns A promise that resolves when the command execution is complete.
   */
  public static async executeCommand(step: Step): Promise<void> {
    let { command, terminalId, autoExecute, insertTypingMode, insertTypingSpeed } = step;

    if (!command) {
      Notifications.error('No command specified');
      return;
    }

    autoExecute = typeof autoExecute !== 'undefined' ? autoExecute : true;
    const terminal = await TerminalService.openTerminal(terminalId);

    const typeMode = insertTypingMode ?? 'instant';
    const typeSpeed = insertTypingSpeed || 50;

    let execution: TerminalShellExecution | undefined;
    if (typeMode === 'character-by-character') {
      terminal.sendText('', false);
      for (const char of command) {
        terminal.sendText(char, false);
        await sleep(typeSpeed);
      }
      if (autoExecute) {
        terminal.sendText('', true);
      }
    } else if (autoExecute) {
      if (terminal.shellIntegration) {
        execution = terminal.shellIntegration.executeCommand(command);
      } else {
        terminal.sendText(command, autoExecute);
      }
    } else {
      terminal.sendText(command, false);
    }

    if (execution && typeMode === 'instant') {
      await TerminalService.waitForTerminalExecuted(
        command,
        terminalId ?? TerminalService.terminalName,
      );
    }

    // Wait for the command to be sent
    await TerminalService.refocusOnEditor();
  }

  /**
   * Closes the terminal.
   * @param terminalId - The ID of the terminal to be closed (optional).
   * @returns A promise that resolves when the terminal is closed.
   */
  public static async closeTerminal(terminalId?: string): Promise<void> {
    terminalId = terminalId ?? TerminalService.terminalName;
    const terminal = TerminalService.terminal[terminalId];

    if (!terminal) {
      return;
    }

    terminal.sendText('exit', true);
    terminal.dispose();
    delete TerminalService.terminal[terminalId];

    // Wait for the command to be sent
    await TerminalService.refocusOnEditor();
  }

  /**
   * Gets the terminal instance for a given ID.
   * @param terminalId - The ID of the terminal to retrieve (optional).
   * @returns The terminal instance or null if not found.
   */
  public static getTerminal(terminalId?: string): Terminal | null {
    terminalId = terminalId ?? TerminalService.terminalName;
    return TerminalService.terminal[terminalId] ?? null;
  }

  /**
   * Checks if a terminal with the given ID exists.
   * @param terminalId - The ID of the terminal to check (optional).
   * @returns True if the terminal exists, false otherwise.
   */
  public static hasTerminal(terminalId?: string): boolean {
    terminalId = terminalId ?? TerminalService.terminalName;
    return !!TerminalService.terminal[terminalId];
  }

  /**
   * Disposes of terminal-related resources managed by the TerminalService.
   *
   * This method disposes the current terminal disposable, if present,
   * and then disposes all remaining terminal resources.
   */
  public static dispose(): void {
    TerminalService.closeTerminalDisposable?.dispose();
    TerminalService.disposeAll();
  }

  /**
   * Disposes all terminals.
   */
  public static disposeAll(): void {
    Object.keys(TerminalService.terminal).forEach((terminalId) => {
      const terminal = TerminalService.terminal[terminalId];
      if (terminal) {
        terminal.dispose();
      }
    });
    TerminalService.terminal = {};
    TerminalService.lastExecution = {};
    Object.values(TerminalService.onTerminalCompleted).forEach((disposable) => {
      disposable.dispose();
    });
  }

  /**
   * Opens a new terminal with the given ID or the default DemoTime terminal.
   */
  public static async openTerminal(terminalId?: string): Promise<Terminal> {
    terminalId = terminalId ?? TerminalService.terminalName;
    let terminal = TerminalService.terminal[terminalId];
    if (!terminal) {
      terminal = window.createTerminal(terminalId);
      TerminalService.terminal[terminalId] = terminal;
    }
    terminal.show();

    if (terminal.shellIntegration) {
      return terminal;
    }

    const readyPromise = TerminalService.waitForTerminalReady(terminal);
    const timeoutPromise = new Promise<Terminal>((resolve) =>
      setTimeout(() => resolve(terminal as Terminal), 2000),
    );
    terminal = await Promise.race([readyPromise, timeoutPromise]);

    if (terminal.shellIntegration) {
      TerminalService.lastExecution[terminalId] = '';
      TerminalService.onTerminalCompleted[terminalId] = window.onDidEndTerminalShellExecution(
        (event) => {
          if (event.terminal === terminal && event.execution.commandLine.value) {
            TerminalService.lastExecution[terminalId] = event.execution.commandLine.value;
          }
        },
      );
    }

    return terminal;
  }

  /**
   * Waits for a specific command to be observed as the last executed command for a given terminal.
   *
   * @param command - The exact command string to wait for.
   * @param terminalId - The identifier of the terminal whose last executed command will be observed.
   * @returns A Promise that resolves when the command is observed or when the 5 second timeout elapses.
   */
  private static async waitForTerminalExecuted(command: string, terminalId: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const startTime = Date.now();
      const maxWaitTime = 5000; // 5 seconds

      const checkExecution = () => {
        if (TerminalService.lastExecution[terminalId] === command) {
          resolve();
          return;
        }

        // Check if we've exceeded the maximum wait time
        if (Date.now() - startTime >= maxWaitTime) {
          resolve();
          return;
        }

        // Check again in a short interval
        setTimeout(checkExecution, 100);
      };
      checkExecution();
    });
  }

  /**
   * Waits until the given terminal signals that its shell integration state has changed,
   * indicating the terminal is ready to receive commands.
   *
   * @param myTerm - The terminal instance to wait for readiness on.
   * @returns A promise that resolves with the same terminal once the shell integration
   *          change event for that terminal is observed.
   */
  private static async waitForTerminalReady(myTerm: Terminal): Promise<Terminal> {
    // Wait for the terminal to be ready before sending the command
    return await new Promise<Terminal>((resolve) => {
      let isConnected = false;
      window.onDidChangeTerminalShellIntegration(async ({ terminal }) => {
        if (terminal === myTerm && !isConnected) {
          isConnected = true;
          resolve(terminal);
        }
      });
    });
  }

  /**
   * Refocuses the editor UI after a command is executed in presentation mode.
   *
   * @returns {Promise<void>} A promise that resolves once the focus has been changed, if applicable.
   */
  private static async refocusOnEditor(): Promise<void> {
    const isPresentationMode = DemoRunner.getIsPresentationMode();
    if (isPresentationMode) {
      // Wait for the command to be sent
      await sleep(500);
      // Focus the terminal after sending the command
      await commands.executeCommand('workbench.action.focusStatusBar');
      await commands.executeCommand('workbench.action.focusActiveEditorGroup');
    }
  }
}
