import { ScriptExecutor } from './ScriptExecutor';
import { Notifications } from './Notifications';
import { Logger } from './Logger';
import { platform } from 'os';
import { Extension } from './Extension';

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
      const wsPath = Extension.getInstance().workspaceFolder?.uri.fsPath || process.cwd();
      return await ScriptExecutor.executeScriptAsync(command, wsPath);
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

  /**
   * Mute the system volume on macOS
   */
  public static async muteVolume(): Promise<void> {
    if (!MacOSActionsService.isMacOS()) {
      Notifications.warning('Volume control is only available on macOS.');
      return;
    }

    try {
      const script = `set volume output muted true`;
      await MacOSActionsService.executeAppleScript(script);
      Logger.info('Volume muted');
    } catch (error) {
      Notifications.error(`Failed to mute volume: ${(error as Error).message}`);
    }
  }

  /**
   * Unmute the system volume on macOS
   */
  public static async unmuteVolume(): Promise<void> {
    if (!MacOSActionsService.isMacOS()) {
      Notifications.warning('Volume control is only available on macOS.');
      return;
    }

    try {
      const script = `set volume output muted false`;
      await MacOSActionsService.executeAppleScript(script);
      Logger.info('Volume unmuted');
    } catch (error) {
      Notifications.error(`Failed to unmute volume: ${(error as Error).message}`);
    }
  }

  /**
   * Set screen resolution on macOS
   * @param width Screen width in pixels
   * @param height Screen height in pixels
   * @param hidpi Whether to use HiDPI/Retina mode
   */
  public static async setScreenResolution(
    width: number,
    height: number,
    hidpi: boolean = false,
  ): Promise<void> {
    if (!MacOSActionsService.isMacOS()) {
      Notifications.warning('Screen resolution control is only available on macOS.');
      return;
    }

    try {
      // Use displayplacer tool if available, otherwise show a notification
      const command = `displayplacer "id:main ${hidpi ? 'scaled' : 'res'}:${width}x${height}"`;
      const wsPath = Extension.getInstance().workspaceFolder?.uri.fsPath || process.cwd();
      
      try {
        await ScriptExecutor.executeScriptAsync(command, wsPath);
        Logger.info(`Screen resolution set to ${width}x${height}${hidpi ? ' (HiDPI)' : ''}`);
      } catch (error) {
        // If displayplacer is not available, provide instructions
        Notifications.warning(
          'Screen resolution control requires the "displayplacer" tool. Install it with: brew install displayplacer',
        );
        Logger.error(`displayplacer not found: ${(error as Error).message}`);
      }
    } catch (error) {
      Notifications.error(`Failed to set screen resolution: ${(error as Error).message}`);
    }
  }

  /**
   * Enable Caffeine (prevent system from sleeping) on macOS
   * @param duration Optional duration in minutes. If not provided, prevents sleep indefinitely.
   */
  public static async enableCaffeine(duration?: number): Promise<void> {
    if (!MacOSActionsService.isMacOS()) {
      Notifications.warning('Caffeine is only available on macOS.');
      return;
    }

    try {
      const wsPath = Extension.getInstance().workspaceFolder?.uri.fsPath || process.cwd();
      
      // Use caffeinate command (built-in on macOS)
      // -d: prevent display from sleeping
      // -i: prevent system from idle sleeping
      // -t: specify timeout in seconds
      let command = 'caffeinate -d -i';
      
      if (duration) {
        const seconds = duration * 60;
        command += ` -t ${seconds}`;
        // Run in background using nohup and redirect output
        command = `nohup ${command} > /dev/null 2>&1 & echo $!`;
        
        try {
          const pid = await ScriptExecutor.executeScriptAsync(command, wsPath);
          Logger.info(`Caffeine enabled for ${duration} minutes (PID: ${pid.trim()})`);
          Notifications.info(`System sleep prevention enabled for ${duration} minutes`);
        } catch (error) {
          Logger.error(`Failed to start caffeinate: ${(error as Error).message}`);
          throw error;
        }
      } else {
        // For indefinite caffeine, we'll use a background process
        command = `nohup ${command} > /dev/null 2>&1 & echo $!`;
        
        try {
          const pid = await ScriptExecutor.executeScriptAsync(command, wsPath);
          Logger.info(`Caffeine enabled indefinitely (PID: ${pid.trim()})`);
          Notifications.info('System sleep prevention enabled indefinitely');
        } catch (error) {
          Logger.error(`Failed to start caffeinate: ${(error as Error).message}`);
          throw error;
        }
      }
    } catch (error) {
      Notifications.error(`Failed to enable Caffeine: ${(error as Error).message}`);
    }
  }

  /**
   * Disable Caffeine (allow system to sleep) on macOS
   */
  public static async disableCaffeine(): Promise<void> {
    if (!MacOSActionsService.isMacOS()) {
      Notifications.warning('Caffeine is only available on macOS.');
      return;
    }

    try {
      const wsPath = Extension.getInstance().workspaceFolder?.uri.fsPath || process.cwd();
      
      // Kill all caffeinate processes
      const command = 'pkill -f "caffeinate -d -i"';
      
      try {
        await ScriptExecutor.executeScriptAsync(command, wsPath);
        Logger.info('Caffeine disabled');
        Notifications.info('System sleep prevention disabled');
      } catch (error) {
        // pkill returns non-zero exit code if no processes found
        // This is fine, it just means caffeine wasn't running
        Logger.info('Caffeine disabled (no processes found)');
      }
    } catch (error) {
      Notifications.error(`Failed to disable Caffeine: ${(error as Error).message}`);
    }
  }
}
