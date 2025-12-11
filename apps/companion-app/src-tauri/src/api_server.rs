use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use tauri::{AppHandle, Emitter, Manager};
use warp::Filter;

use crate::{BlurStateArc, BlurState, SettingsState};

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, clear_vibrancy, NSVisualEffectMaterial};

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_blur, clear_blur};

#[derive(Debug, Deserialize, Serialize)]
struct ActionRequest {
    action: String,
    #[serde(default)]
    message: Option<String>,
}

#[derive(Debug, Serialize)]
struct ActionResponse {
    success: bool,
    message: String,
}

pub async fn start_server(
    app_handle: AppHandle,
    blur_state: BlurStateArc,
    settings: SettingsState,
) -> Result<(), Box<dyn std::error::Error>> {
    let port = {
        let s = settings.lock().unwrap();
        s.api_port
    };

    let app_handle = warp::any().map(move || app_handle.clone());
    let state_filter = warp::any().map(move || blur_state.clone());

    // POST /action - Execute an action
    let action_route = warp::post()
        .and(warp::path("action"))
        .and(warp::body::json())
        .and(app_handle.clone())
        .and(state_filter.clone())
        .and_then(handle_action);

    // GET /status - Get current status
    let status_route = warp::get()
        .and(warp::path("status"))
        .and(state_filter.clone())
        .and_then(handle_status);

    // GET /health - Health check
    let health_route = warp::get()
        .and(warp::path("health"))
        .map(|| warp::reply::json(&serde_json::json!({ "status": "ok" })));

    let routes = action_route
        .or(status_route)
        .or(health_route)
        .with(
            warp::cors()
                .allow_any_origin()
                .allow_methods(vec!["GET", "POST", "OPTIONS"])
                .allow_headers(vec!["content-type"]),
        );

    println!("Starting API server on http://127.0.0.1:{}", port);
    warp::serve(routes).run(([127, 0, 0, 1], port)).await;
    Ok(())
}

async fn handle_action(
    req: ActionRequest,
    app_handle: AppHandle,
    state: BlurStateArc,
) -> Result<impl warp::Reply, Infallible> {
    let response = match req.action.as_str() {
        "blur.on" => {
            if let Ok(mut s) = state.lock() {
                s.active = true;
                s.message = req.message.unwrap_or_default();
                
                // Apply native backdrop blur effect
                if let Some(window) = app_handle.get_webview_window("main") {
                    #[cfg(target_os = "macos")]
                    let _ = apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None);
                    
                    #[cfg(target_os = "windows")]
                    let _ = apply_blur(&window, Some((18, 18, 18, 125)));
                    
                    let _ = window.set_ignore_cursor_events(false);
                }
                
                let _ = app_handle.emit("blur-state-changed", s.clone());
                ActionResponse {
                    success: true,
                    message: "Blur enabled".to_string(),
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Failed to enable blur".to_string(),
                }
            }
        }
        "blur.off" => {
            if let Ok(mut s) = state.lock() {
                s.active = false;
                s.message = String::new();
                
                // Clear native backdrop blur effect
                if let Some(window) = app_handle.get_webview_window("main") {
                    #[cfg(target_os = "macos")]
                    let _ = clear_vibrancy(&window);
                    
                    #[cfg(target_os = "windows")]
                    let _ = clear_blur(&window);
                    
                    let _ = window.set_ignore_cursor_events(true);
                }
                
                let _ = app_handle.emit("blur-state-changed", s.clone());
                ActionResponse {
                    success: true,
                    message: "Blur disabled".to_string(),
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Failed to disable blur".to_string(),
                }
            }
        }
        "blur.toggle" => {
            if let Ok(mut s) = state.lock() {
                s.active = !s.active;
                if !s.active {
                    s.message = String::new();
                }
                
                // Apply or clear native backdrop blur effect
                if let Some(window) = app_handle.get_webview_window("main") {
                    if s.active {
                        #[cfg(target_os = "macos")]
                        let _ = apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None);
                        
                        #[cfg(target_os = "windows")]
                        let _ = apply_blur(&window, Some((18, 18, 18, 125)));
                        
                        let _ = window.set_ignore_cursor_events(false);
                    } else {
                        #[cfg(target_os = "macos")]
                        let _ = clear_vibrancy(&window);
                        
                        #[cfg(target_os = "windows")]
                        let _ = clear_blur(&window);
                        
                        let _ = window.set_ignore_cursor_events(true);
                    }
                }
                
                let _ = app_handle.emit("blur-state-changed", s.clone());
                ActionResponse {
                    success: true,
                    message: format!("Blur {}", if s.active { "enabled" } else { "disabled" }),
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Failed to toggle blur".to_string(),
                }
            }
        }
        "blur.message" => {
            if let Ok(mut s) = state.lock() {
                s.active = true;
                s.message = req.message.unwrap_or_else(|| "Message".to_string());
                
                // Apply native backdrop blur effect
                if let Some(window) = app_handle.get_webview_window("main") {
                    #[cfg(target_os = "macos")]
                    let _ = apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None);
                    
                    #[cfg(target_os = "windows")]
                    let _ = apply_blur(&window, Some((18, 18, 18, 125)));
                    
                    let _ = window.set_ignore_cursor_events(false);
                }
                
                let _ = app_handle.emit("blur-state-changed", s.clone());
                ActionResponse {
                    success: true,
                    message: "Blur with message enabled".to_string(),
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Failed to show message".to_string(),
                }
            }
        }
        _ => ActionResponse {
            success: false,
            message: format!("Unknown action: {}", req.action),
        },
    };

    Ok(warp::reply::json(&response))
}

async fn handle_status(state: BlurStateArc) -> Result<impl warp::Reply, Infallible> {
    if let Ok(s) = state.lock() {
        Ok(warp::reply::json(&*s))
    } else {
        Ok(warp::reply::json(&BlurState::default()))
    }
}
