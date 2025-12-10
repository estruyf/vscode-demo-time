use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use tauri::{AppHandle, Emitter};
use warp::Filter;

use crate::AppState;

#[derive(Debug, Deserialize, Serialize)]
struct ActionRequest {
    action: String,
    #[serde(default)]
    params: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct ActionResponse {
    success: bool,
    message: String,
}

pub async fn start_server(app_handle: AppHandle, state: AppState) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = warp::any().map(move || app_handle.clone());
    let state_filter = warp::any().map(move || state.clone());

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
        .with(warp::cors().allow_any_origin());

    println!("Starting API server on http://127.0.0.1:42042");
    warp::serve(routes).run(([127, 0, 0, 1], 42042)).await;
    Ok(())
}

async fn handle_action(
    req: ActionRequest,
    app_handle: AppHandle,
    state: AppState,
) -> Result<impl warp::Reply, Infallible> {
    let response = match req.action.as_str() {
        "spotlight.toggle" => {
            if let Ok(mut s) = state.lock() {
                s.spotlight_active = !s.spotlight_active;
                let _ = app_handle.emit("spotlight-toggled", s.spotlight_active);
                ActionResponse {
                    success: true,
                    message: format!("Spotlight {}", if s.spotlight_active { "enabled" } else { "disabled" }),
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Failed to toggle spotlight".to_string(),
                }
            }
        }
        "spotlight.on" => {
            if let Ok(mut s) = state.lock() {
                s.spotlight_active = true;
                let _ = app_handle.emit("spotlight-toggled", true);
                ActionResponse {
                    success: true,
                    message: "Spotlight enabled".to_string(),
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Failed to enable spotlight".to_string(),
                }
            }
        }
        "spotlight.off" => {
            if let Ok(mut s) = state.lock() {
                s.spotlight_active = false;
                let _ = app_handle.emit("spotlight-toggled", false);
                ActionResponse {
                    success: true,
                    message: "Spotlight disabled".to_string(),
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Failed to disable spotlight".to_string(),
                }
            }
        }
        "blur.toggle" => {
            if let Ok(mut s) = state.lock() {
                s.blur_active = !s.blur_active;
                let _ = app_handle.emit("blur-toggled", s.blur_active);
                ActionResponse {
                    success: true,
                    message: format!("Blur {}", if s.blur_active { "enabled" } else { "disabled" }),
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Failed to toggle blur".to_string(),
                }
            }
        }
        "blur.on" => {
            if let Ok(mut s) = state.lock() {
                s.blur_active = true;
                let _ = app_handle.emit("blur-toggled", true);
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
                s.blur_active = false;
                let _ = app_handle.emit("blur-toggled", false);
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
        "zoom.in" => {
            if let Ok(mut s) = state.lock() {
                s.zoom_level = (s.zoom_level + 0.5).min(5.0);
                s.zoom_active = s.zoom_level > 1.0;
                let _ = app_handle.emit("zoom-changed", s.zoom_level);
                ActionResponse {
                    success: true,
                    message: format!("Zoom level: {}", s.zoom_level),
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Failed to zoom in".to_string(),
                }
            }
        }
        "zoom.out" => {
            if let Ok(mut s) = state.lock() {
                s.zoom_level = (s.zoom_level - 0.5).max(1.0);
                s.zoom_active = s.zoom_level > 1.0;
                let _ = app_handle.emit("zoom-changed", s.zoom_level);
                ActionResponse {
                    success: true,
                    message: format!("Zoom level: {}", s.zoom_level),
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Failed to zoom out".to_string(),
                }
            }
        }
        "zoom.reset" => {
            if let Ok(mut s) = state.lock() {
                s.zoom_level = 1.0;
                s.zoom_active = false;
                let _ = app_handle.emit("zoom-changed", 1.0);
                ActionResponse {
                    success: true,
                    message: "Zoom reset".to_string(),
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Failed to reset zoom".to_string(),
                }
            }
        }
        "zoom.set" => {
            if let Some(level) = req.params.get("level").and_then(|v| v.as_f64()) {
                if let Ok(mut s) = state.lock() {
                    s.zoom_level = level as f32;
                    s.zoom_active = s.zoom_level > 1.0;
                    let _ = app_handle.emit("zoom-changed", s.zoom_level);
                    ActionResponse {
                        success: true,
                        message: format!("Zoom level set to: {}", s.zoom_level),
                    }
                } else {
                    ActionResponse {
                        success: false,
                        message: "Failed to set zoom level".to_string(),
                    }
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Invalid zoom level parameter".to_string(),
                }
            }
        }
        "message.show" => {
            if let Some(text) = req.params.get("text").and_then(|v| v.as_str()) {
                if let Ok(mut s) = state.lock() {
                    s.message = Some(text.to_string());
                    let _ = app_handle.emit("message-shown", text);
                    ActionResponse {
                        success: true,
                        message: "Message displayed".to_string(),
                    }
                } else {
                    ActionResponse {
                        success: false,
                        message: "Failed to show message".to_string(),
                    }
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Missing message text parameter".to_string(),
                }
            }
        }
        "message.hide" => {
            if let Ok(mut s) = state.lock() {
                s.message = None;
                let _ = app_handle.emit("message-hidden", ());
                ActionResponse {
                    success: true,
                    message: "Message hidden".to_string(),
                }
            } else {
                ActionResponse {
                    success: false,
                    message: "Failed to hide message".to_string(),
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

async fn handle_status(state: AppState) -> Result<impl warp::Reply, Infallible> {
    if let Ok(s) = state.lock() {
        Ok(warp::reply::json(&*s))
    } else {
        Ok(warp::reply::json(&serde_json::json!({
            "error": "Failed to get status"
        })))
    }
}
