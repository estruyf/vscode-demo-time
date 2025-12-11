import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

type ViewMode = "settings" | "overlay";

interface BlurState {
  active: boolean;
  message: string;
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("settings");
  const [apiPort, setApiPort] = useState<number>(42042);
  const [blurState, setBlurState] = useState<BlurState>({
    active: false,
    message: "",
  });

  useEffect(() => {
    // Load saved settings
    loadSettings();

    // Listen for view mode changes
    const unlistenViewMode = listen<ViewMode>("view-mode-changed", (event) => {
      setViewMode(event.payload);
    });

    // Listen for blur toggle
    const unlistenBlur = listen<BlurState>("blur-state-changed", (event) => {
      setBlurState(event.payload);
    });

    return () => {
      unlistenViewMode.then((fn) => fn());
      unlistenBlur.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    // Update window properties based on view mode
    const window = getCurrentWindow();

    if (viewMode === "overlay") {
      // Make window transparent, fullscreen, click-through
      window.setDecorations(false);
      window.setAlwaysOnTop(true);
      window.setSkipTaskbar(true);
      window.maximize();
      window.setIgnoreCursorEvents(!blurState.active);
    } else {
      // Normal window for settings
      window.setDecorations(true);
      window.setAlwaysOnTop(false);
      window.setSkipTaskbar(false);
      window.unmaximize();
      window.setIgnoreCursorEvents(false);
      window.setSize({ width: 500, height: 400, type: 'Logical' });
      window.center();
    }
  }, [viewMode, blurState.active]);

  const loadSettings = async () => {
    try {
      const settings = await invoke<{ api_port: number }>("get_settings");
      setApiPort(settings.api_port);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleStart = async () => {
    try {
      await invoke("save_settings", { settings: { api_port: apiPort } });
      await invoke("start_overlay_mode");
    } catch (error) {
      console.error("Failed to start overlay:", error);
    }
  };

  if (viewMode === "settings") {
    return (
      <div className="settings-container">
        <header className="settings-header">
          <h1>🎬 Demo Time Companion</h1>
          <p className="subtitle">Presentation Overlay Tool</p>
        </header>

        <main className="settings-main">
          <div className="setting-group">
            <label htmlFor="api-port">API Port</label>
            <input
              id="api-port"
              type="number"
              value={apiPort}
              onChange={(e) => setApiPort(parseInt(e.target.value) || 42042)}
              min={1024}
              max={65535}
            />
            <p className="setting-hint">
              Port for HTTP API server (default: 42042)
            </p>
          </div>

          <button className="start-button" onClick={handleStart}>
            Start Overlay Mode
          </button>

          <div className="info-section">
            <h3>Features</h3>
            <ul>
              <li>🌫️ Screen blur with messages</li>
              <li>🔍 System zoom (macOS/Windows)</li>
              <li>🔦 Spotlight mode</li>
              <li>🔌 HTTP API for external control</li>
            </ul>
          </div>
        </main>

        <footer className="settings-footer">
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

  // Overlay mode
  return (
    <div className="overlay-container">
      {/* Blur overlay */}
      <div className={`blur-overlay ${blurState.active ? "active" : ""}`}>
        {blurState.message && (
          <div className="blur-message">{blurState.message}</div>
        )}
      </div>
    </div>
  );
}

export default App;
