import { commands, Terminal, window } from 'vscode';
import { Notifications } from './Notifications';
import { sleep } from '../utils';
import { DemoRunner } from './DemoRunner';
import { Step } from '../models';

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
  public static async executeCommand(step: Step): Promise<void> {
    let { command, terminalId, autoExecute, insertTypingMode, insertTypingSpeed } = step;

    if (!command) {
      Notifications.error('No command specified');
      return;
    }

    terminalId = terminalId ?? TerminalService.terminalName;
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
    // Wait for the terminal to be ready before sending the command
    await new Promise<void>((resolve) => {
      const checkTerminal = () => {
        // VSCode terminals are usually ready immediately, but we can check if the processId is available
        (terminal!.processId as Promise<any>)
          ?.then(() => resolve())
          .catch(() => setTimeout(checkTerminal, 50));
      };
      checkTerminal();
    });

    autoExecute = typeof autoExecute !== 'undefined' ? autoExecute : true;

    const typeMode = insertTypingMode ?? 'instant';
    const typeSpeed = insertTypingSpeed || 50;
    if (typeMode === 'character-by-character') {
      terminal.sendText('', false);
      for (const char of command) {
        terminal.sendText(char, false);
        await sleep(typeSpeed);
      }
      if (autoExecute) {
        terminal.sendText('', true);
      }
      return;
    } else {
      terminal.sendText(command, autoExecute);
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
      await commands.executeCommand('workbench.action.focusActiveEditorGroup');
    }
  }
}
