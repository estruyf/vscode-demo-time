import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

interface AppConfig {
  blur_opacity: number;
  spotlight_size: number;
  spotlight_opacity: number;
  zoom_level: number;
  overlay_color: string;
  overlay_text_color: string;
  shortcuts: {
    spotlight_toggle: string;
    zoom_in: string;
    zoom_out: string;
    zoom_reset: string;
    blur_toggle: string;
  };
}

interface OverlayState {
  blur_active: boolean;
  spotlight_active: boolean;
  zoom_active: boolean;
  zoom_level: number;
  message: string | null;
}

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [state, setState] = useState<OverlayState | null>(null);
  const [message, setMessage] = useState("");
  const [apiStatus, setApiStatus] = useState<string>("Checking...");

  useEffect(() => {
    // Load initial config and state
    loadConfig();
    loadState();
    checkApiStatus();

    // Listen for state changes
    const unlistenBlur = listen<boolean>("blur-toggled", () => {
      loadState();
    });

    const unlistenSpotlight = listen<boolean>("spotlight-toggled", () => {
      loadState();
    });

    const unlistenZoom = listen<number>("zoom-changed", () => {
      loadState();
    });

    const unlistenMessage = listen<string>("message-shown", () => {
      loadState();
    });

    return () => {
      unlistenBlur.then((fn) => fn());
      unlistenSpotlight.then((fn) => fn());
      unlistenZoom.then((fn) => fn());
      unlistenMessage.then((fn) => fn());
    };
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await invoke<AppConfig>("get_config");
      setConfig(cfg);
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  };

  const loadState = async () => {
    try {
      const st = await invoke<OverlayState>("get_state");
      setState(st);
    } catch (error) {
      console.error("Failed to load state:", error);
    }
  };

  const checkApiStatus = async () => {
    const API_URL = "http://127.0.0.1:42042";
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        setApiStatus("✓ API Server Running on port 42042");
      } else {
        setApiStatus("⚠ API Server Issue");
      }
    } catch (error) {
      setApiStatus("✗ API Server Not Running");
    }
  };

  const handleToggleBlur = async () => {
    try {
      await invoke("toggle_blur");
      await loadState();
    } catch (error) {
      console.error("Failed to toggle blur:", error);
    }
  };

  const handleToggleSpotlight = async () => {
    try {
      await invoke("toggle_spotlight");
      await loadState();
    } catch (error) {
      console.error("Failed to toggle spotlight:", error);
    }
  };

  const handleZoomIn = async () => {
    try {
      if (state) {
        await invoke("set_zoom", { level: state.zoom_level + 0.5 });
        await loadState();
      }
    } catch (error) {
      console.error("Failed to zoom in:", error);
    }
  };

  const handleZoomOut = async () => {
    try {
      if (state) {
        await invoke("set_zoom", { level: Math.max(1.0, state.zoom_level - 0.5) });
        await loadState();
      }
    } catch (error) {
      console.error("Failed to zoom out:", error);
    }
  };

  const handleZoomReset = async () => {
    try {
      await invoke("set_zoom", { level: 1.0 });
      await loadState();
    } catch (error) {
      console.error("Failed to reset zoom:", error);
    }
  };

  const handleShowMessage = async () => {
    try {
      await invoke("show_message", { message });
      await loadState();
      setMessage("");
    } catch (error) {
      console.error("Failed to show message:", error);
    }
  };

  const handleHideMessage = async () => {
    try {
      await invoke("hide_message");
      await loadState();
    } catch (error) {
      console.error("Failed to hide message:", error);
    }
  };

  const handleCreateOverlay = async (type: string) => {
    try {
      await invoke("create_overlay", { overlayType: type });
    } catch (error) {
      console.error(`Failed to create ${type} overlay:`, error);
    }
  };

  const handleCloseOverlay = async (type: string) => {
    try {
      await invoke("close_overlay", { overlayType: type });
    } catch (error) {
      console.error(`Failed to close ${type} overlay:`, error);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎬 Demo Time Companion</h1>
        <p className="subtitle">Overlay Controls for Presentations</p>
      </header>

      <div className="status-bar">
        <span className={apiStatus.includes("✓") ? "status-good" : "status-bad"}>
          {apiStatus}
        </span>
      </div>

      <main className="app-main">
        {state && (
          <>
            <section className="control-section">
              <h2>Effects</h2>
              <div className="control-grid">
                <div className="control-item">
                  <button
                    className={`control-button ${state.blur_active ? "active" : ""}`}
                    onClick={handleToggleBlur}
                  >
                    <span className="icon">🌫️</span>
                    <span>Blur</span>
                  </button>
                  <p className="control-hint">
                    {state.blur_active ? "Active" : "Inactive"}
                  </p>
                </div>

                <div className="control-item">
                  <button
                    className={`control-button ${state.spotlight_active ? "active" : ""}`}
                    onClick={handleToggleSpotlight}
                  >
                    <span className="icon">🔦</span>
                    <span>Spotlight</span>
                  </button>
                  <p className="control-hint">
                    {state.spotlight_active ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </section>

            <section className="control-section">
              <h2>Zoom</h2>
              <div className="zoom-controls">
                <button className="control-button small" onClick={handleZoomOut}>
                  <span className="icon">➖</span>
                </button>
                <div className="zoom-level">
                  <span className="zoom-value">{state.zoom_level.toFixed(1)}x</span>
                </div>
                <button className="control-button small" onClick={handleZoomIn}>
                  <span className="icon">➕</span>
                </button>
                <button className="control-button small" onClick={handleZoomReset}>
                  <span className="icon">↺</span>
                </button>
              </div>
            </section>

            <section className="control-section">
              <h2>Message Overlay</h2>
              <div className="message-controls">
                <input
                  type="text"
                  placeholder="Enter message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="message-input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleShowMessage();
                    }
                  }}
                />
                <div className="button-row">
                  <button
                    className="control-button small"
                    onClick={handleShowMessage}
                    disabled={!message}
                  >
                    Show
                  </button>
                  <button
                    className="control-button small"
                    onClick={handleHideMessage}
                    disabled={!state.message}
                  >
                    Hide
                  </button>
                </div>
                {state.message && (
                  <p className="current-message">
                    Current: <strong>{state.message}</strong>
                  </p>
                )}
              </div>
            </section>

            <section className="control-section">
              <h2>Overlays</h2>
              <div className="overlay-controls">
                <button
                  className="control-button small"
                  onClick={() => handleCreateOverlay("blur")}
                >
                  Create Blur Overlay
                </button>
                <button
                  className="control-button small"
                  onClick={() => handleCreateOverlay("spotlight")}
                >
                  Create Spotlight Overlay
                </button>
                <button
                  className="control-button small"
                  onClick={() => handleCloseOverlay("blur")}
                >
                  Close Blur Overlay
                </button>
                <button
                  className="control-button small"
                  onClick={() => handleCloseOverlay("spotlight")}
                >
                  Close Spotlight Overlay
                </button>
              </div>
            </section>
          </>
        )}

        {config && (
          <section className="control-section info-section">
            <h2>Keyboard Shortcuts</h2>
            <div className="shortcuts-list">
              <div className="shortcut-item">
                <span className="shortcut-label">Blur Toggle:</span>
                <code>{config.shortcuts.blur_toggle}</code>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-label">Spotlight Toggle:</span>
                <code>{config.shortcuts.spotlight_toggle}</code>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-label">Zoom In:</span>
                <code>{config.shortcuts.zoom_in}</code>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-label">Zoom Out:</span>
                <code>{config.shortcuts.zoom_out}</code>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-label">Zoom Reset:</span>
                <code>{config.shortcuts.zoom_reset}</code>
              </div>
            </div>
          </section>
        )}

        <section className="control-section info-section">
          <h2>API Information</h2>
          <div className="api-info">
            <p>
              <strong>Base URL:</strong> <code>http://127.0.0.1:42042</code>
            </p>
            <p>
              <strong>Endpoints:</strong>
            </p>
            <ul>
              <li>
                <code>POST /action</code> - Execute actions
              </li>
              <li>
                <code>GET /status</code> - Get current status
              </li>
              <li>
                <code>GET /health</code> - Health check
              </li>
            </ul>
            <p>
              <strong>Available Actions:</strong>
            </p>
            <div className="actions-grid">
              <code>spotlight.toggle</code>
              <code>spotlight.on</code>
              <code>spotlight.off</code>
              <code>blur.toggle</code>
              <code>blur.on</code>
              <code>blur.off</code>
              <code>zoom.in</code>
              <code>zoom.out</code>
              <code>zoom.reset</code>
              <code>zoom.set</code>
              <code>message.show</code>
              <code>message.hide</code>
            </div>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p>Demo Time Companion v0.1.0</p>
        <p>
          <a
            href="https://demotime.show"
            target="_blank"
            rel="noopener noreferrer"
          >
            demotime.show
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
