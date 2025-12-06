import { ScriptExecutor } from './ScriptExecutor';
import { Notifications } from './Notifications';
import { Logger } from './Logger';
import { platform } from 'os';

export class MacOSActionsService {
  /**
   * Check if the current platform is macOS
   */
  private static isMacOS(): boolean {
    return platform() === 'darwin';
  }

  /**
   * Execute an AppleScript command
   * @param script The AppleScript content to execute
   * @returns A promise that resolves with the script output
   */
  public static async executeAppleScript(script: string): Promise<string> {
    if (!MacOSActionsService.isMacOS()) {
      Notifications.warning('AppleScript is only available on macOS.');
      return '';
    }

    try {
      // Escape single quotes in the script for shell execution
      const escapedScript = script.replace(/'/g, "'\\''");
      const command = `osascript -e '${escapedScript}'`;
      return await ScriptExecutor.executeScriptAsync(command, process.cwd());
    } catch (error) {
      Logger.error(`AppleScript execution failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Execute a multi-line AppleScript
   * @param scriptLines Array of AppleScript lines to execute
   * @returns A promise that resolves with the script output
   */
  public static async executeAppleScriptLines(scriptLines: string[]): Promise<string> {
    if (!MacOSActionsService.isMacOS()) {
      Notifications.warning('AppleScript is only available on macOS.');
      return '';
    }

    try {
      // Join lines and escape for shell
      const script = scriptLines.join('\n');
      const escapedScript = script.replace(/'/g, "'\\''");
      const command = `osascript -e '${escapedScript}'`;
      return await ScriptExecutor.executeScriptAsync(command, process.cwd());
    } catch (error) {
      Logger.error(`AppleScript execution failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Enable Focus Mode (Do Not Disturb) on macOS
   * Requires a Shortcuts automation named "Enable Do Not Disturb"
   */
  public static async enableFocusMode(): Promise<void> {
    if (!MacOSActionsService.isMacOS()) {
      Notifications.warning('Focus Mode is only available on macOS.');
      return;
    }

    try {
      const script = `tell application "Shortcuts Events"
    run the shortcut named "Enable Do Not Disturb"
end tell`;
      await MacOSActionsService.executeAppleScript(script);
      Logger.info('Focus Mode enabled');
    } catch (error) {
      Notifications.error(`Failed to enable Focus Mode: ${(error as Error).message}`);
    }
  }

  /**
   * Disable Focus Mode (Do Not Disturb) on macOS
   * Requires a Shortcuts automation named "Disable Do Not Disturb"
   */
  public static async disableFocusMode(): Promise<void> {
    if (!MacOSActionsService.isMacOS()) {
      Notifications.warning('Focus Mode is only available on macOS.');
      return;
    }

    try {
      const script = `tell application "Shortcuts Events"
    run the shortcut named "Disable Do Not Disturb"
end tell`;
      await MacOSActionsService.executeAppleScript(script);
      Logger.info('Focus Mode disabled');
    } catch (error) {
      Notifications.error(`Failed to disable Focus Mode: ${(error as Error).message}`);
    }
  }

  /**
   * Hide the macOS menu bar (set autohide to true)
   */
  public static async hideMenubar(): Promise<void> {
    if (!MacOSActionsService.isMacOS()) {
      Notifications.warning('Menu bar control is only available on macOS.');
      return;
    }

    try {
      const script = `tell application "System Events"
    tell dock preferences
        set autohide menu bar to true
    end tell
end tell`;
      await MacOSActionsService.executeAppleScript(script);
      Logger.info('Menu bar hidden');
    } catch (error) {
      Notifications.error(`Failed to hide menu bar: ${(error as Error).message}`);
    }
  }

  /**
   * Show the macOS menu bar (set autohide to false)
   */
  public static async showMenubar(): Promise<void> {
    if (!MacOSActionsService.isMacOS()) {
      Notifications.warning('Menu bar control is only available on macOS.');
      return;
    }

    try {
      const script = `tell application "System Events"
    tell dock preferences
        set autohide menu bar to false
    end tell
end tell`;
      await MacOSActionsService.executeAppleScript(script);
      Logger.info('Menu bar shown');
    } catch (error) {
      Notifications.error(`Failed to show menu bar: ${(error as Error).message}`);
    }
  }
}
