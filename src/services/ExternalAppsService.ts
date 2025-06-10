import * as os from 'os';
import { ScriptExecutor } from '.';

export class ExternalAppsService {
  public static async openPowerPoint() {
    const platform = os.platform();
    let command: string | undefined;

    if (platform === 'darwin') {
      command = `osascript -e 'tell application "Microsoft PowerPoint"' -e 'activate' -e 'end tell'`;
    } else if (platform === 'win32') {
      command = `powershell -Command "& { $powerpoint = Get-Process -Name POWERPNT; if ($powerpoint) { Add-Type -TypeDefinition \\"using System; using System.Runtime.InteropServices; public class User32 { [DllImport('user32.dll')] public static extern bool SetForegroundWindow(IntPtr hWnd); }\\"; $handle = $powerpoint.MainWindowHandle; [User32]::SetForegroundWindow($handle); } }"`;
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
}
