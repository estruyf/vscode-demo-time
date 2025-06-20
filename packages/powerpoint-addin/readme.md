# PowerPoint Add-in

This is a PowerPoint add-in which allows you to trigger a demo to start from a PowerPoint slide.

## Validation

```bash
npx office-addin-manifest validate -p manifest.production.xml
```

## Testing

To test it out locally, you add the manifest file to your
`~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef/` folder and then open PowerPoint.

```bash
touch ~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef/demotime.manifest.xml
cp manifest.xml ~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef/demotime.manifest.xml
code ~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef/demotime.manifest.xml
```

## Usefull commands

```bash
# Open the PowerPoint add-in in a browser
npm start -- web --document
https://eliostruyf-my.sharepoint.com/:p:/g/personal/elio_estruyf_be/ESVJhJKqvEpHgQ7Pr76rhWoBdXkzSM8SU1vp5PVbzBoXDw\?e\=hIWlOv

# Enable developer tools in PowerPoint
defaults write com.microsoft.Powerpoint OfficeWebAddinDeveloperExtras -bool true

# macOS trigger to open PowerPoint
osascript -e 'tell application "Microsoft PowerPoint"' -e 'activate' -e 'end tell'

# Windows trigger to open PowerPoint
powershell -Command "& { $powerpoint = Get-Process -Name POWERPNT; if ($powerpoint) { Add-Type
-TypeDefinition @"using System; using System.Runtime.InteropServices; public class User32 {
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); }"@;
$handle = $powerpoint.MainWindowHandle; [User32]::SetForegroundWindow($handle); } }"
```
