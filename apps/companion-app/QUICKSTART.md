# Quick Start Guide

Get up and running with Demo Time Companion in 5 minutes!

## Overview

The companion app provides a **dual-webview architecture**:
- **Config Window**: Control panel for all features
- **Overlay Window**: Transparent fullscreen for effects (blur, messages,
  spotlight, zoom)

## Step 1: Install Prerequisites

### Linux
```bash
sudo apt-get update && sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  libssl-dev \
  librsvg2-dev
```

### macOS
```bash
xcode-select --install
```

### Windows
1. Install
   [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Install
   [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

## Step 2: Build the App

```bash
# From the repository root
cd apps/companion-app

# Install dependencies
yarn install

# Build the app (first time will take a few minutes)
yarn build
yarn tauri:build
```

The built app will be in `src-tauri/target/release/bundle/`

## Step 3: Run the App

**For development:**
```bash
yarn tauri:dev
```

**For production (after building):**
- **Linux:** `./src-tauri/target/release/demo-time-companion`
- **macOS:** Open
  `src-tauri/target/release/bundle/macos/Demo Time Companion.app`
- **Windows:** Run `src-tauri\target\release\Demo Time Companion.exe`

## Step 4: Verify It's Working

1. The app should appear in your system tray
2. Click the tray icon to open the control panel
3. You should see "✓ API Server Running on port 42042"

Test the API:
```bash
curl http://127.0.0.1:42042/health
```

Should return:
```json
{"status":"ok"}
```

## Step 5: Try It Out

### Method 1: Use the Control Panel

Click the system tray icon and use the buttons to:
- Toggle blur overlay
- Toggle spotlight
- Adjust zoom level
- Show/hide messages

### Method 2: Use the API

```bash
# Toggle blur
curl -X POST http://127.0.0.1:42042/action \
  -H "Content-Type: application/json" \
  -d '{"action": "blur.toggle"}'

# Show a message
curl -X POST http://127.0.0.1:42042/action \
  -H "Content-Type: application/json" \
  -d '{"action": "message.show", "params": {"text": "Hello from API!"}}'

# Hide message
curl -X POST http://127.0.0.1:42042/action \
  -H "Content-Type: application/json" \
  -d '{"action": "message.hide"}'
```

### Method 3: Use Keyboard Shortcuts

Default shortcuts (work when app is running):
- **Cmd/Ctrl + Shift + B** - Toggle blur
- **Cmd/Ctrl + Shift + L** - Toggle spotlight
- **Cmd/Ctrl + Shift + =** - Zoom in
- **Cmd/Ctrl + Shift + -** - Zoom out
- **Cmd/Ctrl + Shift + 0** - Reset zoom

## Step 6: Integrate with Demo Time

Create a demo file `.demo/demo.json`:

```json
{
  "demos": [{
    "title": "My First Demo with Companion",
    "steps": [
      {
        "action": "executeCommand",
        "command": "workbench.action.terminal.sendSequence",
        "args": {
          "text": "curl -s -X POST http://127.0.0.1:42042/action -H 'Content-Type: application/json' -d '{\"action\": \"message.show\", \"params\": {\"text\": \"Starting demo...\"}}'  > /dev/null\n"
        }
      },
      {
        "action": "wait",
        "duration": 2000
      },
      {
        "action": "executeCommand",
        "command": "workbench.action.terminal.sendSequence",
        "args": {
          "text": "curl -s -X POST http://127.0.0.1:42042/action -H 'Content-Type: application/json' -d '{\"action\": \"message.hide\"}' > /dev/null\n"
        }
      }
    ]
  }]
}
```

## Troubleshooting

### "API Server Not Running"
- Make sure the app is running (check system tray)
- Restart the app
- Check if port 42042 is available

### "Build Failed"
- Make sure all prerequisites are installed
- Try cleaning: `cd src-tauri && cargo clean && cd .. && rm -rf dist`
- Run `yarn install` again

### Keyboard Shortcuts Not Working
- Make sure the app has accessibility permissions (macOS: System Preferences >
  Security & Privacy > Accessibility)
- Check for conflicts with other apps
- Try different key combinations in the app settings

## Next Steps

- Read the [README.md](./README.md) for full documentation
- Check [INTEGRATION.md](./INTEGRATION.md) for advanced integration examples
- See [examples/demo-with-companion.json](./examples/demo-with-companion.json)
  for a complete demo
- Run [examples/test-api.sh](./examples/test-api.sh) to test all API endpoints

## Getting Help

- [GitHub Issues](https://github.com/estruyf/vscode-demo-time/issues)
- [Documentation](https://demotime.show)

Enjoy using Demo Time Companion! 🎬
