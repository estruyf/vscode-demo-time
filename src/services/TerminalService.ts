import { commands, Terminal, window } from 'vscode';
import { Notifications } from './Notifications';
import { sleep } from '../utils';
import { DemoRunner } from './DemoRunner';

/**
 * Service to manage terminal operations for demo execution.
 */
export class TerminalService {
  private static terminal: { [id: string]: Terminal | null } = {};
  private static readonly terminalName = 'DemoTime';

  /**
   * Executes a terminal command.
   * @param command - The command to be executed.
   * @param terminalId - The ID of the terminal to use (optional).
   * @returns A promise that resolves when the command execution is complete.
   */
  public static async executeCommand(command?: string, terminalId?: string): Promise<void> {
    if (!command) {
      Notifications.error('No command specified');
      return;
    }

    terminalId = terminalId || TerminalService.terminalName;
    let terminal = TerminalService.terminal[terminalId];

    if (!terminal) {
      terminal = window.createTerminal(terminalId);
      TerminalService.terminal[terminalId] = terminal;

      window.onDidCloseTerminal((term) => {
        if (term.name && TerminalService.terminal[term.name]) {
          delete TerminalService.terminal[term.name];
        }
      });
    }

    terminal.show();
    terminal.sendText(command, true);

    // Wait for the command to be sent
    await TerminalService.refocusOnEditor();
  }

  /**
   * Closes the terminal.
   * @param terminalId - The ID of the terminal to be closed (optional).
   * @returns A promise that resolves when the terminal is closed.
   */
  public static async closeTerminal(terminalId?: string): Promise<void> {
    terminalId = terminalId || TerminalService.terminalName;
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
    terminalId = terminalId || TerminalService.terminalName;
    return TerminalService.terminal[terminalId] || null;
  }

  /**
   * Checks if a terminal with the given ID exists.
   * @param terminalId - The ID of the terminal to check (optional).
   * @returns True if the terminal exists, false otherwise.
   */
  public static hasTerminal(terminalId?: string): boolean {
    terminalId = terminalId || TerminalService.terminalName;
    return !!TerminalService.terminal[terminalId];
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
    }
  }
}
