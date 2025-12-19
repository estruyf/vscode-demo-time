use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State, Manager};
use tauri::tray::TrayIconBuilder;

mod api_server;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub api_port: u16,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            api_port: 42042,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlurState {
    pub active: bool,
    pub message: String,
}

impl Default for BlurState {
    fn default() -> Self {
        Self {
            active: false,
            message: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ViewMode {
    Settings,
    Overlay,
}

pub type SettingsState = Arc<Mutex<Settings>>;
pub type BlurStateArc = Arc<Mutex<BlurState>>;
pub type ViewModeState = Arc<Mutex<ViewMode>>;

// Tauri commands
#[tauri::command]
fn get_settings(settings: State<SettingsState>) -> Result<Settings, String> {
    settings.lock().map_err(|e| e.to_string()).map(|s| s.clone())
}

#[tauri::command]
fn save_settings(settings: State<SettingsState>, new_settings: Settings) -> Result<(), String> {
    let mut s = settings.lock().map_err(|e| e.to_string())?;
    *s = new_settings;
    Ok(())
}

#[tauri::command]
fn start_overlay_mode(
    app_handle: AppHandle,
    view_mode: State<ViewModeState>,
) -> Result<(), String> {
    let mut mode = view_mode.lock().map_err(|e| e.to_string())?;
    *mode = ViewMode::Overlay;
    
    if let Some(window) = app_handle.get_webview_window("main") {
        // Make the webview background transparent for overlay mode
        use tauri::window::Color;
        window.set_background_color(Some(Color(0, 0, 0, 0))).map_err(|e| e.to_string())?;
        
        window.set_decorations(false).map_err(|e| e.to_string())?;
        window.set_always_on_top(true).map_err(|e| e.to_string())?;
        window.set_skip_taskbar(true).map_err(|e| e.to_string())?;
        window.maximize().map_err(|e| e.to_string())?;
        window.set_ignore_cursor_events(true).map_err(|e| e.to_string())?;
    }

    // Emit event to frontend
    app_handle.emit("view-mode-changed", ViewMode::Overlay).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn back_to_settings(
    app_handle: AppHandle,
    view_mode: State<ViewModeState>,
    blur_state: State<BlurStateArc>,
) -> Result<(), String> {
    // Reset blur state
    let mut blur = blur_state.lock().map_err(|e| e.to_string())?;
    blur.active = false;
    blur.message = String::new();
    drop(blur);
    
    // Change view mode
    let mut mode = view_mode.lock().map_err(|e| e.to_string())?;
    *mode = ViewMode::Settings;
    
    if let Some(window) = app_handle.get_webview_window("main") {        
        // Restore window properties in the correct order
        window.set_ignore_cursor_events(false).map_err(|e| e.to_string())?;
        window.set_always_on_top(false).map_err(|e| e.to_string())?;
        window.unmaximize().map_err(|e| e.to_string())?;
        window.set_decorations(true).map_err(|e| e.to_string())?;
        window.set_skip_taskbar(false).map_err(|e| e.to_string())?;
        
        // Set size and center
        window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: 500.0, height: 700.0 })).map_err(|e| e.to_string())?;
        window.center().map_err(|e| e.to_string())?;
        
        // Set webview background to white for settings mode
        use tauri::window::Color;
        window.set_background_color(Some(Color(255, 255, 255, 255))).map_err(|e| e.to_string())?;
    }

    // Emit events to frontend
    app_handle.emit("view-mode-changed", ViewMode::Settings).map_err(|e| e.to_string())?;
    app_handle.emit("blur-state-changed", BlurState::default()).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings_state = Arc::new(Mutex::new(Settings::default()));
    let blur_state = Arc::new(Mutex::new(BlurState::default()));
    let view_mode = Arc::new(Mutex::new(ViewMode::Settings));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(settings_state.clone())
        .manage(blur_state.clone())
        .manage(view_mode.clone())
        .setup(move |app| {
            // Force initial window state for settings mode
            // This overrides any saved state from window-state plugin
            if let Some(window) = app.get_webview_window("main") {
                use tauri::window::Color;
                use tauri::{Size, LogicalSize, Position, LogicalPosition};
                
                // Set background color
                let _ = window.set_background_color(Some(Color(255, 255, 255, 255)));
                
                // Force settings mode window configuration
                let _ = window.set_decorations(true);
                let _ = window.set_always_on_top(false);
                let _ = window.set_skip_taskbar(false);
                let _ = window.set_ignore_cursor_events(false);
                
                // Unmaximize if maximized
                if let Ok(true) = window.is_maximized() {
                    let _ = window.unmaximize();
                }
                
                // Set size and center
                let _ = window.set_size(Size::Logical(LogicalSize { width: 500.0, height: 700.0 }));
                let _ = window.center();
            }
            
            // Setup system tray
            let quit = tauri::menu::MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let settings = tauri::menu::MenuItemBuilder::with_id("settings", "Back to Settings").build(app)?;
            let toggle_blur = tauri::menu::MenuItemBuilder::with_id("toggle_blur", "Toggle Blur").build(app)?;
            
            let menu = tauri::menu::MenuBuilder::new(app)
                .item(&settings)
                .item(&toggle_blur)
                .separator()
                .item(&quit)
                .build()?;

            let blur_state_tray = blur_state.clone();
            let view_mode_tray = view_mode.clone();
            
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "settings" => {
                            let view_state = view_mode_tray.clone();
                            let blur_state_clone = blur_state_tray.clone();
                            let app_handle = app.clone();
                            
                            tauri::async_runtime::spawn(async move {
                                // Reset blur
                                if let Ok(mut blur) = blur_state_clone.lock() {
                                    blur.active = false;
                                    blur.message = String::new();
                                }
                                
                                // Change view
                                if let Ok(mut mode) = view_state.lock() {
                                    *mode = ViewMode::Settings;
                                }
                                
                                // Restore window to settings mode
                                if let Some(window) = app_handle.get_webview_window("main") {                                    
                                    // Restore window properties in the correct order
                                    let _ = window.set_ignore_cursor_events(false);
                                    let _ = window.set_always_on_top(false);
                                    let _ = window.unmaximize();
                                    let _ = window.set_decorations(true);
                                    let _ = window.set_skip_taskbar(false);
                                    
                                    // Set size and center
                                    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: 500.0, height: 700.0 }));
                                    let _ = window.center();
                                    
                                    // Set background color
                                    use tauri::window::Color;
                                    let _ = window.set_background_color(Some(Color(255, 255, 255, 255)));
                                }
                                
                                let _ = app_handle.emit("blur-state-changed", BlurState::default());
                                let _ = app_handle.emit("view-mode-changed", ViewMode::Settings);
                            });
                        }
                        "toggle_blur" => {
                            let blur_state_clone = blur_state_tray.clone();
                            let app_handle = app.clone();
                            
                            tauri::async_runtime::spawn(async move {
                                if let Ok(mut blur) = blur_state_clone.lock() {
                                    blur.active = !blur.active;
                                    if !blur.active {
                                        blur.message = String::new();
                                    }
                                    let _ = app_handle.emit("blur-state-changed", blur.clone());
                                }
                            });
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Start API server for external communication
            let app_handle = app.handle().clone();
            let api_blur_state = blur_state.clone();
            let api_settings = settings_state.clone();
            
            tauri::async_runtime::spawn(async move {
                if let Err(e) = api_server::start_server(app_handle, api_blur_state, api_settings).await {
                    eprintln!("Failed to start API server: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            start_overlay_mode,
            back_to_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
