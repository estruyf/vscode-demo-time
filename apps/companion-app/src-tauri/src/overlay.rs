use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

pub fn create_overlay_window(
    app_handle: &AppHandle,
    overlay_type: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let label = format!("overlay-{}", overlay_type);

    // Check if window already exists
    if app_handle.get_webview_window(&label).is_some() {
        return Ok(());
    }

    // Create a transparent, always-on-top window
    let _window = WebviewWindowBuilder::new(
        app_handle,
        label,
        WebviewUrl::App(format!("overlay.html?type={}", overlay_type).into()),
    )
    .title(format!("Demo Time - {}", overlay_type))
    .fullscreen(true)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .focusable(false)
    .build()?;

    Ok(())
}

pub fn close_overlay_window(
    app_handle: &AppHandle,
    overlay_type: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let label = format!("overlay-{}", overlay_type);

    if let Some(window) = app_handle.get_webview_window(&label) {
        window.close()?;
    }

    Ok(())
}
