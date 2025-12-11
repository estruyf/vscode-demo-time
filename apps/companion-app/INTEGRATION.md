# VS Code Integration Guide

This guide explains how to integrate the Demo Time Companion app with your VS Code demos.

## Quick Start

1. **Start the Companion App**
   ```bash
   cd apps/companion-app
   yarn tauri:dev
   ```
   The app will start and launch an API server on `http://127.0.0.1:42042`

2. **Test the API**
   ```bash
   # Check if the app is running
   curl http://127.0.0.1:42042/health

   # Toggle blur
   curl -X POST http://127.0.0.1:42042/action \
     -H "Content-Type: application/json" \
     -d '{"action": "blur.toggle"}'

   # Show a message
   curl -X POST http://127.0.0.1:42042/action \
     -H "Content-Type: application/json" \
     -d '{"action": "message.show", "params": {"text": "Switching to slides..."}}'
   ```

## Integration Methods

### Method 1: Using Terminal Commands in Demo Steps

Add terminal commands to your `.demo/demo.json`:

```json
{
  "demos": [
    {
      "title": "My Presentation",
      "steps": [
        {
          "action": "executeCommand",
          "command": "workbench.action.terminal.sendSequence",
          "args": {
            "text": "curl -X POST http://127.0.0.1:42042/action -H 'Content-Type: application/json' -d '{\"action\": \"blur.on\"}'\n"
          },
          "description": "Enable blur overlay"
        },
        {
          "action": "openSlide",
          "file": "slides/intro.md",
          "description": "Show intro slide"
        },
        {
          "action": "executeCommand",
          "command": "workbench.action.terminal.sendSequence",
          "args": {
            "text": "curl -X POST http://127.0.0.1:42042/action -H 'Content-Type: application/json' -d '{\"action\": \"blur.off\"}'\n"
          },
          "description": "Disable blur overlay"
        }
      ]
    }
  ]
}
```

### Method 2: Using VS Code Extension Commands

Create a VS Code extension or add to your workspace settings:

```typescript
// example-extension.ts
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Register command to toggle blur
  let blurCommand = vscode.commands.registerCommand('demotime.companion.blur', async () => {
    try {
      const response = await fetch('http://127.0.0.1:42042/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'blur.toggle' })
      });
      const result = await response.json();
      vscode.window.showInformationMessage(result.message);
    } catch (error) {
      vscode.window.showErrorMessage('Failed to toggle blur');
    }
  });

  context.subscriptions.push(blurCommand);
}
```

### Method 3: Using HTTP Task in Demo Time

Create a custom action type in Demo Time that calls the companion API:

```json
{
  "demos": [
    {
      "title": "My Demo",
      "steps": [
        {
          "action": "http",
          "url": "http://127.0.0.1:42042/action",
          "method": "POST",
          "body": {
            "action": "blur.on"
          },
          "description": "Enable blur"
        }
      ]
    }
  ]
}
```

### Method 4: Using Keyboard Shortcuts

The companion app provides global keyboard shortcuts:

```javascript
// In your demo, mention to use the shortcuts
// Default shortcuts:
// - Cmd/Ctrl + Shift + B: Toggle Blur
// - Cmd/Ctrl + Shift + L: Toggle Spotlight
// - Cmd/Ctrl + Shift + =: Zoom In
// - Cmd/Ctrl + Shift + -: Zoom Out
// - Cmd/Ctrl + Shift + 0: Reset Zoom
```

## Common Use Cases

### 1. Smooth Transitions Between Code and Slides

```json
{
  "steps": [
    {
      "action": "http",
      "url": "http://127.0.0.1:42042/action",
      "method": "POST",
      "body": {
        "action": "message.show",
        "params": {
          "text": "Switching to slides..."
        }
      }
    },
    {
      "action": "wait",
      "duration": 1000
    },
    {
      "action": "openSlide",
      "file": "slides/overview.md"
    },
    {
      "action": "http",
      "url": "http://127.0.0.1:42042/action",
      "method": "POST",
      "body": {
        "action": "message.hide"
      }
    }
  ]
}
```

### 2. Highlighting Important Code Sections

```json
{
  "steps": [
    {
      "action": "http",
      "url": "http://127.0.0.1:42042/action",
      "method": "POST",
      "body": {
        "action": "spotlight.on"
      }
    },
    {
      "action": "highlight",
      "file": "src/main.ts",
      "lines": [10, 25]
    },
    {
      "action": "wait",
      "duration": 3000
    },
    {
      "action": "http",
      "url": "http://127.0.0.1:42042/action",
      "method": "POST",
      "body": {
        "action": "spotlight.off"
      }
    }
  ]
}
```

### 3. Zoom for Detailed Views

```json
{
  "steps": [
    {
      "action": "http",
      "url": "http://127.0.0.1:42042/action",
      "method": "POST",
      "body": {
        "action": "zoom.set",
        "params": {
          "level": 2.0
        }
      }
    },
    {
      "action": "openFile",
      "file": "src/details.ts",
      "line": 42
    },
    {
      "action": "wait",
      "duration": 5000
    },
    {
      "action": "http",
      "url": "http://127.0.0.1:42042/action",
      "method": "POST",
      "body": {
        "action": "zoom.reset"
      }
    }
  ]
}
```

## Available Actions

All available actions can be found in the [README.md](./README.md#available-actions).

Quick reference:
- `blur.toggle` / `blur.on` / `blur.off`
- `spotlight.toggle` / `spotlight.on` / `spotlight.off`
- `zoom.in` / `zoom.out` / `zoom.reset` / `zoom.set`
- `message.show` / `message.hide`

## Troubleshooting

### API Not Responding
1. Check if the companion app is running
2. Verify the port 42042 is not in use by another application
3. Check firewall settings

### Overlays Not Visible
1. Ensure the companion app has the necessary permissions
2. On macOS, check System Preferences > Security & Privacy > Accessibility
3. Verify overlay windows are not being blocked

### Keyboard Shortcuts Not Working
1. Check for conflicts with other applications
2. Customize shortcuts in the companion app settings
3. Ensure the app has accessibility permissions

## Tips and Best Practices

1. **Start the companion app before your presentation** - Add it to your pre-presentation checklist
2. **Test your API calls** - Run through your demo once to verify all API calls work
3. **Keep messages short** - Message overlays should be brief and clear
4. **Use blur sparingly** - Blur is best for quick transitions, not long periods
5. **Customize keyboard shortcuts** - Set shortcuts that don't conflict with your other tools
6. **Consider audience visibility** - Test zoom levels and spotlight sizes with different screen sizes

## Future Enhancements

Planned features for future releases:
- Drawing tools (arrows, boxes, annotations)
- Multi-screen support
- Launch on login
- Profile presets for different presentation types
- WebSocket support for real-time updates

## Support

For issues, feature requests, or questions:
- [GitHub Issues](https://github.com/estruyf/vscode-demo-time/issues)
- [Documentation](https://demotime.show)
