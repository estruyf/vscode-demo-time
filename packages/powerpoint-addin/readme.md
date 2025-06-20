## Testing

```
npm start -- web --document https://eliostruyf-my.sharepoint.com/:p:/g/personal/elio_estruyf_be/ESVJhJKqvEpHgQ7Pr76rhWoBdXkzSM8SU1vp5PVbzBoXDw\?e\=hIWlOv

defaults write com.microsoft.Powerpoint OfficeWebAddinDeveloperExtras -bool true

# macOS
osascript -e 'tell application "Microsoft PowerPoint"' -e 'activate' -e 'end tell'

# Windows
powershell -Command "& { $powerpoint = Get-Process -Name POWERPNT; if ($powerpoint) { Add-Type -TypeDefinition @"using System; using System.Runtime.InteropServices; public class User32 { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); }"@; $handle = $powerpoint.MainWindowHandle; [User32]::SetForegroundWindow($handle); } }"
```
