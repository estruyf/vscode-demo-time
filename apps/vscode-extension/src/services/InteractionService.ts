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
    await InteractionService.pressKey('ENTER', 36, 'Return');
  }

  /**
   * Simulates pressing the Tab key on the user's system.
   *
   * @returns A promise that resolves when the key press simulation is complete.
   */
  public static async pressTab(): Promise<void> {
    await InteractionService.pressKey('TAB', 48, 'Tab');
  }

  /**
   * Simulates pressing the Left Arrow key on the user's system.
   *
   * @returns A promise that resolves when the key press simulation is complete.
   */
  public static async pressArrowLeft(): Promise<void> {
    await InteractionService.pressKey('LEFT', 123, 'Left');
  }

  /**
   * Simulates pressing the Right Arrow key on the user's system.
   *
   * @returns A promise that resolves when the key press simulation is complete.
   */
  public static async pressArrowRight(): Promise<void> {
    await InteractionService.pressKey('RIGHT', 124, 'Right');
  }

  /**
   * Simulates pressing the Up Arrow key on the user's system.
   *
   * @returns A promise that resolves when the key press simulation is complete.
   */
  public static async pressArrowUp(): Promise<void> {
    await InteractionService.pressKey('UP', 126, 'Up');
  }

  /**
   * Simulates pressing the Down Arrow key on the user's system.
   *
   * @returns A promise that resolves when the key press simulation is complete.
   */
  public static async pressArrowDown(): Promise<void> {
    await InteractionService.pressKey('DOWN', 125, 'Down');
  }

  /**
   * Simulates pressing the Escape key on the user's system.
   *
   * @returns A promise that resolves when the key press simulation is complete.
   */
  public static async pressEscape(): Promise<void> {
    await InteractionService.pressKey('ESCAPE', 53, 'Escape');
  }

  /**
   * Simulates pressing the Backspace key on the user's system.
   *
   * @returns A promise that resolves when the key press simulation is complete.
   */
  public static async pressBackspace(): Promise<void> {
    await InteractionService.pressKey('BACKSPACE', 51, 'BackSpace');
  }

  /**
   * Simulates pressing the Delete key on the user's system.
   *
   * @returns A promise that resolves when the key press simulation is complete.
   */
  public static async pressDelete(): Promise<void> {
    await InteractionService.pressKey('DELETE', 117, 'Delete');
  }

  /**
   * General method to simulate pressing a key on the user's system.
   *
   * This method determines the current operating system and executes the appropriate
   * command to simulate a key press:
   * - On macOS, it uses AppleScript via `osascript` with key codes.
   * - On Windows, it uses PowerShell with `System.Windows.Forms.SendKeys`.
   * - On Linux, it uses `xdotool` (which must be installed).
   *
   * @param windowsKey The key name for Windows SendKeys (e.g., 'ENTER', 'TAB')
   * @param macKeyCode The key code for macOS AppleScript (e.g., 36 for Enter)
   * @param linuxKey The key name for Linux xdotool (e.g., 'Return', 'Tab')
   * @returns A promise that resolves when the key press simulation is complete.
   */
  public static async pressKey(
    windowsKey: string,
    macKeyCode: number,
    linuxKey: string,
    modifiers?: { meta?: boolean; ctrl?: boolean; alt?: boolean; shift?: boolean },
  ): Promise<void> {
    const osPlatform = platform();
    let command = '';
    if (osPlatform === 'darwin') {
      // macOS
      const using: string[] = [];
      if (modifiers) {
        if (modifiers.meta) {
          using.push('command down');
        }
        if (modifiers.ctrl) {
          using.push('control down');
        }
        if (modifiers.alt) {
          using.push('option down');
        }
        if (modifiers.shift) {
          using.push('shift down');
        }
      }

      if (macKeyCode === 48 || linuxKey === 'Tab') {
        // Use keystroke for Tab key - include modifiers if present
        if (using.length > 0) {
          command = `osascript -e 'tell application "System Events" to keystroke tab using {${using.join(', ')}}'`;
        } else {
          command = `osascript -e 'tell application "System Events" to keystroke tab'`;
        }
      } else {
        if (using.length > 0) {
          command = `osascript -e 'tell application "System Events" to key code ${macKeyCode} using {${using.join(', ')}}'`;
        } else {
          command = `osascript -e 'tell application "System Events" to key code ${macKeyCode}'`;
        }
      }
    } else if (osPlatform === 'win32') {
      // Windows - using PowerShell
      // Validate windowsKey against a safe whitelist to avoid command injection.
      const allowedSpecialKeys = new Set([
        'ENTER',
        'TAB',
        'LEFT',
        'RIGHT',
        'UP',
        'DOWN',
        'ESCAPE',
        'BACKSPACE',
        'DELETE',
        'HOME',
        'END',
        'PAGEUP',
        'PAGEDOWN',
        'INSERT',
        'RETURN',
      ]);

      const fnKeyRegex = /^F([1-9][0-9]?)$/i; // F1..F24
      const singleCharRegex = /^[A-Za-z0-9]$/; // single alphanumeric character

      let normalizedKey = typeof windowsKey === 'string' ? windowsKey.trim() : '';

      if (fnKeyRegex.test(normalizedKey) || allowedSpecialKeys.has(normalizedKey.toUpperCase())) {
        // normalize to upper-case for special keys and function keys
        normalizedKey = normalizedKey.toUpperCase();
      } else if (singleCharRegex.test(normalizedKey)) {
        // keep as-is for single characters
        normalizedKey = normalizedKey;
      } else {
        Notifications.error(`Invalid key for Windows SendKeys: ${windowsKey}`);
        return;
      }

      // Map modifiers to SendKeys format: ^ = CTRL; % = ALT; + = SHIFT. (No mapping for Meta / Win key)
      let prefix = '';
      if (modifiers) {
        if (modifiers.ctrl) {
          prefix += '^';
        }
        if (modifiers.alt) {
          prefix += '%';
        }
        if (modifiers.shift) {
          prefix += '+';
        }
      }

      // Use braces for special and function keys, no braces for single characters
      const sendKey = singleCharRegex.test(normalizedKey)
        ? `${prefix}${normalizedKey}`
        : `${prefix}{${normalizedKey}}`;
      command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${sendKey}')"`;
    } else {
      // Linux - using xdotool (needs to be installed)
      let combo = linuxKey;
      if (modifiers) {
        const parts: string[] = [];
        if (modifiers.meta) {
          parts.push('Super');
        }
        if (modifiers.ctrl) {
          parts.push('Control');
        }
        if (modifiers.alt) {
          parts.push('Alt');
        }
        if (modifiers.shift) {
          parts.push('Shift');
        }
        if (parts.length > 0) {
          combo = `${parts.join('+')}+${linuxKey}`;
        }
      }
      command = `xdotool key ${combo}`;
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

  public static async copyFromSelection(): Promise<void> {
    await commands.executeCommand('editor.action.clipboardCopyAction');
  }

  public static async pasteFromClipboard(): Promise<void> {
    await commands.executeCommand('editor.action.clipboardPasteAction');
  }
}
