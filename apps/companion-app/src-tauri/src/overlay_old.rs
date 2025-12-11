use tauri::{AppHandle, Manager, PhysicalPosition, Position};

/// Show the main overlay window
pub fn show_overlay(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app_handle.get_webview_window("overlay") {
        window.show()?;
        // Don't focus - we want click-through
        let _ = window.set_ignore_cursor_events(true);

        if let Ok(Some(monitor)) = window.current_monitor() {
            let size = *monitor.size();
            let _ = window.set_size(size);
            let _ = window.set_position(Position::Physical(PhysicalPosition::new(0, 0)));
        }
    }
    Ok(())
}

/// Hide the main overlay window
pub fn hide_overlay(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app_handle.get_webview_window("overlay") {
        window.hide()?;
    }
    Ok(())
}

/// Platform-specific zoom implementation
#[cfg(target_os = "macos")]
pub fn set_system_zoom(zoom_level: f32) -> Result<(), Box<dyn std::error::Error>> {
    use std::process::Command;
    
    if zoom_level > 1.0 {
        // Enable macOS zoom using AppleScript
        // Note: This toggles the system zoom. The zoom_level parameter indicates intent.
        let script = r#"
            tell application "System Events"
                key code 28 using {command down, option down}
            end tell
        "#;
        
        Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()?;
    } else {
        // Disable zoom
        let script = r#"
            tell application "System Events"
                key code 29 using {command down, option down}
            end tell
        "#;
        
        Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()?;
    }
    
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn set_system_zoom(zoom_level: f32) -> Result<(), Box<dyn std::error::Error>> {
    use std::process::Command;
    
    // Windows Magnifier API would require more complex integration
    // For now, use the Magnifier executable
    if zoom_level > 1.0 {
        Command::new("magnify.exe")
            .spawn()?;
    } else {
        // Kill magnifier process
        Command::new("taskkill")
            .args(&["/F", "/IM", "Magnify.exe"])
            .output()?;
    }
    
    Ok(())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn set_system_zoom(_zoom_level: f32) -> Result<(), Box<dyn std::error::Error>> {
    // Linux zoom implementation could use compiz or other tools
    // For now, return an error
    Err("System zoom not supported on this platform".into())
}
