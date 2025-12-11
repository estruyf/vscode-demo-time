# Architecture Documentation

## Overview

The Demo Time Companion app uses a dual-webview architecture to provide
presentation overlay effects. This design separates configuration UI from the
fullscreen overlay functionality.

## Window Architecture

### 1. Config Window (`config`)
- **Purpose**: Settings and control panel
- **Label**: `config`
- **URL**: `index.html` (React app)
- **Properties**:
  - Visible by default
  - Regular window with decorations
  - Resizable (500x700px default)
  - Can be minimized/hidden
      
### 2. Overlay Window (`overlay`)
- **Purpose**: Transparent maximized overlay for effects
- **Label**: `overlay`
- **URL**: `overlay.html` (vanilla JS)
- **Properties**:
  - Transparent background (no fullscreen mode)
  - Maximized to cover screen
  - Resizable (can be adjusted if needed)
  - No decorations
  - Always on top
  - Skip taskbar
  - Not focusable
  - Click-through when no effects active
  - Hidden by default

## State Management

### App State
Shared between windows through Tauri's state management:

```rust
pub struct OverlayState {
    pub blur_active: bool,
    pub spotlight_active: bool,
    pub zoom_active: bool,
    pub zoom_level: f32,
    pub message: Option<String>,
}
```

### Config State
Application configuration:

```rust
pub struct AppConfig {
    pub blur_opacity: f32,
    pub spotlight_size: u32,
    pub spotlight_opacity: f32,
    pub zoom_level: f32,
    pub overlay_color: String,
    pub overlay_text_color: String,
    pub shortcuts: ShortcutConfig,
}
```

## Communication Flow

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Config Window  │         │   Rust Backend   │         │ Overlay Window  │
│   (React UI)    │         │   (Commands)     │         │  (Vanilla JS)   │
└────────┬────────┘         └────────┬─────────┘         └────────┬────────┘
         │                           │                            │
         │  invoke("toggle_blur")    │                            │
         ├──────────────────────────>│                            │
         │                           │                            │
         │                           │  emit("blur-toggled")      │
         │                           ├───────────────────────────>│
         │                           │                            │
         │                           │  show_overlay()            │
         │                           ├───────────────────────────>│
         │                           │                            │
         │  get_state()              │                            │
         │<──────────────────────────┤                            │
         │                           │                            │
```

## Effect Implementation

### Blur Effect
1. User clicks blur button in config window
2. Config window invokes `toggle_blur` command
3. Backend updates state and emits `blur-toggled` event
4. Overlay window receives event and shows/hides blur
5. Backend shows overlay window if effect is active

### Message Display
1. User enters message and clicks show
2. Config window invokes `show_message` command
3. Backend:
   - Updates state with message
   - Enables blur automatically
   - Shows overlay window
   - Emits `message-shown` event
4. Overlay window displays centered message with blur

### System Zoom
1. User clicks zoom in/out or uses keyboard shortcut
2. Config window invokes `zoom_in`/`zoom_out` command
3. Backend:
   - Updates zoom level in state
   - Calls platform-specific zoom API
   - Shows overlay window
   - Emits `zoom-changed` event
4. Overlay window shows zoom indicator

**Platform-Specific Implementation:**

#### macOS
```rust
// Uses AppleScript to trigger Accessibility Zoom
Command::new("osascript")
    .arg("-e")
    .arg("tell application \"System Events\"...")
    .output()?;
```

#### Windows
```rust
// Launches Windows Magnifier
Command::new("magnify.exe").spawn()?;
```

### Spotlight Mode
1. User toggles spotlight
2. Backend shows overlay with spotlight effect
3. Overlay window tracks mouse position
4. Creates circular "hole" in dark overlay that follows cursor

## Click-Through Logic

The overlay window intelligently manages click-through behavior:

```javascript
function updateClickThrough() {
  const hasActiveEffect = 
    blurOverlay.classList.contains('active') ||
    messageContainer.classList.contains('active') ||
    spotlightOverlay.classList.contains('active');
  
  currentWindow.setIgnoreCursorEvents(!hasActiveEffect);
}
```

When no effects are active, the overlay passes clicks through to applications
below.

## Visibility Management

The overlay window is automatically shown/hidden based on active effects:

```rust
// Show overlay when any effect activates
if effect_active {
    overlay::show_overlay(&app_handle)?;
}

// Hide overlay when all effects are inactive
if !blur_active && !spotlight_active && !zoom_active && message.is_none() {
    overlay::hide_overlay(&app_handle)?;
}
```

## API Integration

External applications can control the companion app via HTTP:

```bash
# Toggle blur
curl -X POST http://127.0.0.1:42042/action \
  -H "Content-Type: application/json" \
  -d '{"action": "blur.toggle"}'

# Show message
curl -X POST http://127.0.0.1:42042/action \
  -H "Content-Type: application/json" \
  -d '{"action": "message.show", "message": "Break time!"}'

# Zoom in
curl -X POST http://127.0.0.1:42042/action \
  -H "Content-Type: application/json" \
  -d '{"action": "zoom.in"}'
```

## File Structure

```
apps/companion-app/
├── overlay.html              # Fullscreen overlay webview
├── src/
│   ├── App.tsx              # Config window React app
│   ├── App.css              # Config window styles
│   └── main.tsx             # React entry point
└── src-tauri/
    ├── src/
    │   ├── lib.rs           # Main app logic, commands, state
    │   ├── main.rs          # Entry point
    │   ├── overlay.rs       # Overlay window management, zoom
    │   └── api_server.rs    # HTTP API server
    └── tauri.conf.json      # Window configurations
```

## Best Practices

1. **Event-Driven**: Use Tauri events for window communication
2. **State Consistency**: Always update state before emitting events
3. **Visibility Management**: Automatically show/hide overlay based on effects
4. **Click-Through**: Enable click-through when overlay has no active effects
5. **Platform-Specific**: Use conditional compilation for OS-specific features
6. **Error Handling**: Gracefully handle platform-specific API failures

## Future Enhancements

- [ ] Drawing mode (like ZoomIt)
- [ ] Screen recording integration
- [ ] Multiple overlay presets
- [ ] Animation effects
- [ ] Custom keyboard shortcuts per effect
- [ ] Multi-monitor awareness
- [ ] Smooth zoom transitions
- [ ] Spotlight size adjustment
