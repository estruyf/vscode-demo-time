import * as os from 'os';
import { ScriptExecutor } from '.';

export class ExternalAppsService {
  public static async openPowerPoint() {
    const platform = os.platform();
    let command: string | undefined;

    if (platform === 'darwin') {
      command = `osascript -e 'tell application "Microsoft PowerPoint"' -e 'activate' -e 'end tell'`;
    } else if (platform === 'win32') {
      command = `powershell -Command "& { $powerpoint = Get-Process -Name POWERPNT -ErrorAction SilentlyContinue; if ($powerpoint) { Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{TAB}'); $powerpoint.MainWindowHandle | ForEach-Object { (New-Object -ComObject WScript.Shell).AppActivate($powerpoint.Id) } } }"`;
    } else {
      throw new Error('Unsupported platform');
    }

    try {
      await ScriptExecutor.executeScriptAsync(command, os.homedir());
    } catch (error) {
      console.error('Failed to open PowerPoint:', error);
      throw error;
    }
  }

  public static async openKeynote() {
    const platform = os.platform();
    if (platform !== 'darwin') {
      throw new Error('Keynote is only supported on macOS');
    }

    const command = `osascript -e 'tell application "Keynote"' -e 'activate' -e 'end tell'`;

    try {
      await ScriptExecutor.executeScriptAsync(command, os.homedir());
    } catch (error) {
      console.error('Failed to open Keynote:', error);
      throw error;
    }
  }
}
