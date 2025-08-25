import { commands, env } from 'vscode';
import { getFileContents, insertVariables, sleep } from '../utils';
import { Notifications } from './Notifications';
import { ScriptExecutor } from './ScriptExecutor';
import { homedir, platform } from 'os';

export class InteractionService {
  /**
   * Simulates typing text into the editor by pasting each character individually with a specified delay.
   *
   * @param text - The text to be typed into the editor.
   * @param delay - The delay in milliseconds between typing each character. Defaults to 50ms.
   * @returns A promise that resolves when all characters have been typed.
   */
  public static async typeText(text?: string, delay?: number): Promise<void> {
    if (!text) {
      Notifications.error('No text provided to type.');
      return;
    }

    if (typeof delay !== 'number' || delay < 0) {
      delay = 50; // Default delay of 50ms if not specified or invalid
    }

    for (const char of text) {
      await env.clipboard.writeText(char);
      await InteractionService.pasteFromClipboard();
      await sleep(delay);
    }
  }

  /**
   * Simulates pressing the Enter key on the user's system.
   *
   * This method determines the current operating system and executes the appropriate
   * command to simulate an Enter key press:
   * - On macOS, it uses AppleScript via `osascript`.
   * - On Windows, it uses PowerShell with `System.Windows.Forms.SendKeys`.
   * - On Linux, it uses `xdotool` (which must be installed).
   *
   * @returns A promise that resolves when the key press simulation is complete.
   */
  public static async pressEnter(): Promise<void> {
    const osPlatform = platform();
    let command = '';
    if (osPlatform === 'darwin') {
      // macOS
      command = `osascript -e 'tell application "System Events" to key code 36'`;
    } else if (osPlatform === 'win32') {
      // Windows - using PowerShell
      command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')"`;
    } else {
      // Linux - using xdotool (needs to be installed)
      command = `xdotool key Return`;
    }

    await ScriptExecutor.executeScriptAsync(command, homedir());
  }

  /**
   * Copies content to the clipboard, optionally reading from a file and replacing variables.
   * @param content The content to copy (optional if contentPath is provided)
   * @param contentPath Optional file path to read content from
   * @param variables Optional variables to replace in the content
   * @param workspaceFolder The workspace folder context
   */
  public static async copyToClipboard({
    content = '',
    contentPath,
    variables,
    workspaceFolder,
  }: {
    content?: string;
    contentPath?: string;
    variables?: Record<string, any>;
    workspaceFolder: any;
  }): Promise<void> {
    // If contentPath is provided, read content from file
    if (contentPath) {
      const fileContent = await getFileContents(workspaceFolder, contentPath);
      if (!fileContent) {
        Notifications.error(`Could not read content from file: ${contentPath}`);
        return;
      }
      content = fileContent;
    }

    // Replace variables in content if any
    if (variables && Object.keys(variables).length > 0) {
      content = await insertVariables(content, variables);
    }

    if (!content) {
      Notifications.error('No content to copy to clipboard');
      return;
    }

    try {
      await env.clipboard.writeText(content);
    } catch (error) {
      Notifications.error(`Failed to copy to clipboard: ${(error as Error).message}`);
    }
  }

  public static async pasteFromClipboard(): Promise<void> {
    await commands.executeCommand('editor.action.clipboardPasteAction');
  }
}
