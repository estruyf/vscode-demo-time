import { platform } from 'os';
import { ScriptExecutor } from './ScriptExecutor';
import { Notifications } from './Notifications';
import { Logger } from './Logger';
import { Extension } from './Extension';

export class DesktopActionsService {
  /**
   * Hide desktop icons.
   * - macOS: sets com.apple.finder CreateDesktop to false and restarts Finder.
   * - Windows: sets the HideIcons registry value and restarts Explorer.
   * - Other platforms: shows a warning.
   */
  public static async hideDesktopIcons(): Promise<void> {
    const osPlatform = platform();

    if (osPlatform === 'darwin') {
      await DesktopActionsService.runMacOS(false);
    } else if (osPlatform === 'win32') {
      await DesktopActionsService.runWindows(true);
    } else {
      Notifications.warning('Hide desktop icons is only supported on macOS and Windows.');
    }
  }

  /**
   * Show desktop icons.
   * - macOS: sets com.apple.finder CreateDesktop to true and restarts Finder.
   * - Windows: clears the HideIcons registry value and restarts Explorer.
   * - Other platforms: shows a warning.
   */
  public static async showDesktopIcons(): Promise<void> {
    const osPlatform = platform();

    if (osPlatform === 'darwin') {
      await DesktopActionsService.runMacOS(true);
    } else if (osPlatform === 'win32') {
      await DesktopActionsService.runWindows(false);
    } else {
      Notifications.warning('Show desktop icons is only supported on macOS and Windows.');
    }
  }

  private static async runMacOS(show: boolean): Promise<void> {
    const value = show ? 'true' : 'false';
    const wsPath = Extension.getInstance().workspaceFolder?.uri.fsPath || process.cwd();

    try {
      await ScriptExecutor.executeScriptAsync(
        `defaults write com.apple.finder CreateDesktop -bool ${value} && killall Finder`,
        wsPath,
      );
      Logger.info(`Desktop icons ${show ? 'shown' : 'hidden'} (macOS)`);
    } catch (error) {
      Notifications.error(
        `Failed to ${show ? 'show' : 'hide'} desktop icons: ${(error as Error).message}`,
      );
    }
  }

  private static async runWindows(hide: boolean): Promise<void> {
    const value = hide ? '1' : '0';
    const wsPath = Extension.getInstance().workspaceFolder?.uri.fsPath || process.cwd();

    try {
      // Toggle HideIcons in the Explorer Advanced registry key and restart Explorer
      const command =
        `powershell -NoProfile -Command "` +
        `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' ` +
        `-Name HideIcons -Value ${value}; ` +
        `Stop-Process -Name explorer -Force; ` +
        `Start-Process explorer"`;
      await ScriptExecutor.executeScriptAsync(command, wsPath);
      Logger.info(`Desktop icons ${hide ? 'hidden' : 'shown'} (Windows)`);
    } catch (error) {
      Notifications.error(
        `Failed to ${hide ? 'hide' : 'show'} desktop icons: ${(error as Error).message}`,
      );
    }
  }
}
