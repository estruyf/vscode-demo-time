# Demo Time Companion

A desktop companion app for Demo Time that provides screen overlays, blur effects, spotlight mode, zoom functionality, and message overlays during presentations.

## Features

- **🌫️ Blur Overlay**: Temporarily blur the screen during transitions
- **🔦 Spotlight Mode**: Highlight specific areas by dimming everything else (follows cursor)
- **🔍 Zoom In/Out**: Smooth zoom functionality for detailed views (like ZoomIt)
- **💬 Message Overlay**: Display custom messages on screen
- **⌨️ Keyboard Shortcuts**: Configurable global shortcuts for all actions
- **🔌 API Server**: HTTP API for external control (e.g., from VS Code)
- **🎨 Theming**: Configurable colors, opacity, and fonts
- **🖥️ Multi-Screen Support**: Works across multiple displays
- **🚀 Launch on Login**: Optional autostart on system login
- **🎯 Always-on-Top**: Overlays stay on top with click-through support

## Installation

### Prerequisites

Before building the app, ensure you have the required dependencies installed:

#### Linux
```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### macOS
```bash
xcode-select --install
```

#### Windows
- Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### Building from Source

```bash
# From the companion-app directory
yarn install
yarn build
yarn tauri:build
```

The compiled application will be available in `src-tauri/target/release/bundle/`

## Usage

### Starting the App

```bash
yarn tauri:dev  # Development mode
# or
./src-tauri/target/release/demo-time-companion  # Production build
```

The app will:
1. Start in the system tray
2. Launch an HTTP API server on `http://127.0.0.1:42042`
3. Show the main control window

### System Tray

Right-click the system tray icon to:
- Show/hide the main window
- Toggle blur
- Toggle spotlight
- Quit the application

### Keyboard Shortcuts (Default)

| Action | Shortcut |
|--------|----------|
| Toggle Blur | `Cmd/Ctrl + Shift + B` |
| Toggle Spotlight | `Cmd/Ctrl + Shift + L` |
| Zoom In | `Cmd/Ctrl + Shift + =` |
| Zoom Out | `Cmd/Ctrl + Shift + -` |
| Reset Zoom | `Cmd/Ctrl + Shift + 0` |

*All shortcuts can be customized in the app settings.*

## API Documentation

### Base URL
```
http://127.0.0.1:42042
```

### Endpoints

#### POST /action
Execute an action by sending a JSON request:

```bash
curl -X POST http://127.0.0.1:42042/action \
  -H "Content-Type: application/json" \
  -d '{"action": "spotlight.toggle"}'
```

#### GET /status
Get the current state of all overlays:

```bash
curl http://127.0.0.1:42042/status
```

Response:
```json
{
  "blur_active": false,
  "spotlight_active": true,
  "zoom_active": false,
  "zoom_level": 1.0,
  "message": null
}
```

#### GET /health
Health check endpoint:

```bash
curl http://127.0.0.1:42042/health
```

Response:
```json
{
  "status": "ok"
}
```

### Available Actions

#### Spotlight Actions
- `spotlight.toggle` - Toggle spotlight mode
- `spotlight.on` - Enable spotlight mode
- `spotlight.off` - Disable spotlight mode

#### Blur Actions
- `blur.toggle` - Toggle blur overlay
- `blur.on` - Enable blur overlay
- `blur.off` - Disable blur overlay

#### Zoom Actions
- `zoom.in` - Zoom in by 0.5x
- `zoom.out` - Zoom out by 0.5x
- `zoom.reset` - Reset zoom to 1.0x
- `zoom.set` - Set specific zoom level

Example for `zoom.set`:
```bash
curl -X POST http://127.0.0.1:42042/action \
  -H "Content-Type: application/json" \
  -d '{"action": "zoom.set", "params": {"level": 2.5}}'
```

#### Message Actions
- `message.show` - Display a message overlay
- `message.hide` - Hide the message overlay

Example for `message.show`:
```bash
curl -X POST http://127.0.0.1:42042/action \
  -H "Content-Type: application/json" \
  -d '{"action": "message.show", "params": {"text": "Switching to code view..."}}'
```

## Integration with VS Code Extension

You can trigger companion app actions from your Demo Time demos:

```json
{
  "demos": [
    {
      "title": "My Demo",
      "steps": [
        {
          "action": "executeCommand",
          "command": "workbench.action.terminal.sendSequence",
          "args": {
            "text": "curl -X POST http://127.0.0.1:42042/action -H 'Content-Type: application/json' -d '{\"action\": \"blur.on\"}'\n"
          }
        }
      ]
    }
  ]
}
```

Or create a custom VS Code command to interact with the companion app.

## Configuration

### Overlay Settings

Edit the configuration in the app to customize:
- Blur opacity (0.0 - 1.0)
- Spotlight size (in pixels)
- Spotlight opacity (0.0 - 1.0)
- Default zoom level
- Overlay colors
- Text colors

### Keyboard Shortcuts

Shortcuts use Tauri's global shortcut format:
- `Command` or `Cmd` (macOS) / `Control` or `Ctrl` (Windows/Linux)
- `CommandOrControl` - Cross-platform modifier
- `Shift`
- `Alt` or `Option`

Examples:
- `CommandOrControl+Shift+B`
- `Alt+F1`
- `Ctrl+Alt+Delete`

## Troubleshooting

### API Server Not Starting
- Check if port 42042 is already in use
- Try restarting the application
- Check firewall settings

### Overlays Not Appearing
- Ensure the app has accessibility permissions (macOS)
- Check if overlays are blocked by security software
- Verify the app is running with proper permissions

### Keyboard Shortcuts Not Working
- Check for conflicts with other applications
- Ensure the app has accessibility permissions
- Try different key combinations

## Development

### Project Structure

```
apps/companion-app/
├── src/                    # React frontend
│   ├── App.tsx            # Main UI component
│   ├── App.css            # Styles
│   └── main.tsx           # Entry point
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs         # Main logic & commands
│   │   ├── api_server.rs  # HTTP API server
│   │   ├── overlay.rs     # Overlay window management
│   │   └── main.rs        # Entry point
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── package.json           # Node dependencies
└── README.md              # This file
```

### Running in Development

```bash
yarn tauri:dev
```

This will:
1. Start the Vite dev server for the React frontend
2. Launch the Tauri app with hot-reload enabled
3. Open DevTools for debugging

### Adding New Actions

1. Add the action handler in `src-tauri/src/api_server.rs`
2. Add the corresponding Tauri command in `src-tauri/src/lib.rs`
3. Update the frontend in `src/App.tsx` if UI controls are needed
4. Document the new action in this README

## License

Apache-2.0 - Same as the main Demo Time project

## Credits

Created by [Elio Struyf](https://www.eliostruyf.com) as part of the [Demo Time](https://demotime.show) project.

## Links

- [Demo Time Documentation](https://demotime.show)
- [Demo Time GitHub](https://github.com/estruyf/vscode-demo-time)
- [Report Issues](https://github.com/estruyf/vscode-demo-time/issues)
