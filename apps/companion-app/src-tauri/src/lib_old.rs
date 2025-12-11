use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri::tray::TrayIconBuilder;

mod api_server;
mod overlay;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub blur_opacity: f32,
    pub spotlight_size: u32,
    pub spotlight_opacity: f32,
    pub zoom_level: f32,
    pub overlay_color: String,
    pub overlay_text_color: String,
    pub shortcuts: ShortcutConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutConfig {
    pub spotlight_toggle: String,
    pub zoom_in: String,
    pub zoom_out: String,
    pub zoom_reset: String,
    pub blur_toggle: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            blur_opacity: 0.8,
            spotlight_size: 200,
            spotlight_opacity: 0.7,
            zoom_level: 1.5,
            overlay_color: "#000000".to_string(),
            overlay_text_color: "#FFFFFF".to_string(),
            shortcuts: ShortcutConfig::default(),
        }
    }
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        Self {
            spotlight_toggle: "CommandOrControl+Shift+L".to_string(),
            zoom_in: "CommandOrControl+Shift+=".to_string(),
            zoom_out: "CommandOrControl+Shift+-".to_string(),
            zoom_reset: "CommandOrControl+Shift+0".to_string(),
            blur_toggle: "CommandOrControl+Shift+B".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverlayState {
    pub blur_active: bool,
    pub spotlight_active: bool,
    pub zoom_active: bool,
    pub zoom_level: f32,
    pub message: Option<String>,
}

impl Default for OverlayState {
    fn default() -> Self {
        Self {
            blur_active: false,
            spotlight_active: false,
            zoom_active: false,
            zoom_level: 1.0,
            message: None,
        }
    }
}

pub type AppState = Arc<Mutex<OverlayState>>;
pub type ConfigState = Arc<Mutex<AppConfig>>;

// Tauri commands
#[tauri::command]
fn get_config(config: State<ConfigState>) -> Result<AppConfig, String> {
    config.lock().map_err(|e| e.to_string()).map(|c| c.clone())
}

#[tauri::command]
fn update_config(config: State<ConfigState>, new_config: AppConfig) -> Result<(), String> {
    let mut c = config.lock().map_err(|e| e.to_string())?;
    *c = new_config;
    Ok(())
}

#[tauri::command]
fn get_state(state: State<AppState>) -> Result<OverlayState, String> {
    state.lock().map_err(|e| e.to_string()).map(|s| s.clone())
}

#[tauri::command]
fn toggle_blur(
    app_handle: AppHandle,
    state: State<AppState>,
) -> Result<bool, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.blur_active = !s.blur_active;
    let is_active = s.blur_active;
    
    // Show or hide overlay window
    if is_active {
        overlay::show_overlay(&app_handle).map_err(|e| e.to_string())?;
    } else if !s.spotlight_active && s.message.is_none() {
        overlay::hide_overlay(&app_handle).map_err(|e| e.to_string())?;
    }
    
    // Emit event to overlay window
    app_handle.emit("blur-toggled", is_active).map_err(|e| e.to_string())?;
    
    Ok(is_active)
}

#[tauri::command]
fn toggle_spotlight(
    app_handle: AppHandle,
    state: State<AppState>,
) -> Result<bool, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.spotlight_active = !s.spotlight_active;
    let is_active = s.spotlight_active;
    
    // Show or hide overlay window
    if is_active {
        overlay::show_overlay(&app_handle).map_err(|e| e.to_string())?;
    } else if !s.blur_active && s.message.is_none() && !s.zoom_active {
        overlay::hide_overlay(&app_handle).map_err(|e| e.to_string())?;
    }
    
    // Emit event to overlay window
    app_handle.emit("spotlight-toggled", is_active).map_err(|e| e.to_string())?;
    
    Ok(is_active)
}

#[tauri::command]
fn set_zoom(
    app_handle: AppHandle,
    state: State<AppState>,
    level: f32,
) -> Result<f32, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.zoom_level = level;
    s.zoom_active = level > 1.0;
    
    // Apply system-level zoom
    overlay::set_system_zoom(level).map_err(|e| e.to_string())?;
    
    // Show overlay for zoom indicator
    if level > 1.0 {
        overlay::show_overlay(&app_handle).map_err(|e| e.to_string())?;
    } else if !s.blur_active && !s.spotlight_active && s.message.is_none() {
        overlay::hide_overlay(&app_handle).map_err(|e| e.to_string())?;
    }
    
    // Emit event to overlay window
    app_handle.emit("zoom-changed", level).map_err(|e| e.to_string())?;
    
    Ok(level)
}

#[tauri::command]
fn show_message(
    app_handle: AppHandle,
    state: State<AppState>,
    message: String,
) -> Result<(), String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.message = Some(message.clone());
    s.blur_active = true; // Automatically enable blur for messages
    
    // Show overlay window
    overlay::show_overlay(&app_handle).map_err(|e| e.to_string())?;
    
    // Emit event to frontend
    app_handle.emit("message-shown", message).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn hide_message(
    app_handle: AppHandle,
    state: State<AppState>,
) -> Result<(), String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.message = None;
    s.blur_active = false; // Disable blur when message is hidden
    
    // Hide overlay if no other effects are active
    if !s.spotlight_active && !s.zoom_active {
        overlay::hide_overlay(&app_handle).map_err(|e| e.to_string())?;
    }
    
    // Emit event to overlay window
    app_handle.emit("message-hidden", ()).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn zoom_in(
    app_handle: AppHandle,
    state: State<AppState>,
    config: State<ConfigState>,
) -> Result<f32, String> {
    let cfg = config.lock().map_err(|e| e.to_string())?;
    let mut s = state.lock().map_err(|e| e.to_string())?;
    
    let new_level = (s.zoom_level + 0.5).min(5.0);
    s.zoom_level = new_level;
    s.zoom_active = new_level > 1.0;
    drop(s);
    drop(cfg);
    
    set_zoom(app_handle, state, new_level)
}

#[tauri::command]
fn zoom_out(
    app_handle: AppHandle,
    state: State<AppState>,
) -> Result<f32, String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    
    let new_level = (s.zoom_level - 0.5).max(1.0);
    s.zoom_level = new_level;
    s.zoom_active = new_level > 1.0;
    drop(s);
    
    set_zoom(app_handle, state, new_level)
}

#[tauri::command]
fn zoom_reset(
    app_handle: AppHandle,
    state: State<AppState>,
) -> Result<f32, String> {
    set_zoom(app_handle, state, 1.0)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = Arc::new(Mutex::new(OverlayState::default()));
    let config_state = Arc::new(Mutex::new(AppConfig::default()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(app_state.clone())
        .manage(config_state.clone())
        .setup(move |app| {
            // Setup system tray
            let quit = tauri::menu::MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let show = tauri::menu::MenuItemBuilder::with_id("show", "Show").build(app)?;
            let toggle_blur = tauri::menu::MenuItemBuilder::with_id("toggle_blur", "Toggle Blur").build(app)?;
            let toggle_spotlight = tauri::menu::MenuItemBuilder::with_id("toggle_spotlight", "Toggle Spotlight").build(app)?;
            
            let menu = tauri::menu::MenuBuilder::new(app)
                .item(&show)
                .separator()
                .item(&toggle_blur)
                .item(&toggle_spotlight)
                .separator()
                .item(&quit)
                .build()?;

            let tray_state = app_state.clone();
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("config") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "toggle_blur" => {
                            let app_state_clone = tray_state.clone();
                            let app_handle = app.clone();
                            let _ = tauri::async_runtime::spawn(async move {
                                if let Ok(mut state) = app_state_clone.lock() {
                                    state.blur_active = !state.blur_active;
                                    let _ = app_handle.emit("blur-toggled", state.blur_active);
                                }
                            });
                        }
                        "toggle_spotlight" => {
                            let app_state_clone = tray_state.clone();
                            let app_handle = app.clone();
                            let _ = tauri::async_runtime::spawn(async move {
                                if let Ok(mut state) = app_state_clone.lock() {
                                    state.spotlight_active = !state.spotlight_active;
                                    let _ = app_handle.emit("spotlight-toggled", state.spotlight_active);
                                }
                            });
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Start API server for external communication
            let app_handle = app.handle().clone();
            let api_state = app_state.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = api_server::start_server(app_handle, api_state).await {
                    eprintln!("Failed to start API server: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            update_config,
            get_state,
            toggle_blur,
            toggle_spotlight,
            set_zoom,
            zoom_in,
            zoom_out,
            zoom_reset,
            show_message,
            hide_message,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
