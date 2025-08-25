import React from "react";
import { useLoadingScreen } from "./hooks/useLoadingScreen";

const getDemoId = () => {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
};

export const RunByIdPage: React.FC = () => {
  const [demoId, setDemoId] = React.useState<string>("");
  useLoadingScreen();

  React.useEffect(() => {
    setDemoId(getDemoId());
  }, []);

  return (
    <div className="centered-container">
      <h1>You are about to open the Demo Time - Visual Studio Code extension.</h1>
      {demoId ? (
        <>
          <p>The demo you want to run is:</p>
          <div className="demo-id">{demoId}</div>
          <p>Click to open Visual Studio Code:</p>
          <a
            className="vscode-link"
            href={`vscode://eliostruyf.vscode-demo-time?command=${encodeURIComponent(demoId)}`}
          >
            Open in Visual Studio Code
          </a>
        </>
      ) : (
        <p style={{ color: "#fc5130" }}>No demo id provided in the URL.</p>
      )}
      <style>{`
        .centered-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #15181f;
          color: #fff;
          font-family: ui-sans-serif, system-ui, sans-serif;
          padding: 2rem;
          text-align: center;
        }
        .command-id {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          background: #202736;
          color: #ffd43b;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          margin: 1rem 0;
          display: inline-block;
          font-size: 1.1em;
        }
        .vscode-link {
          display: inline-block;
          margin-top: 1.5rem;
          padding: 0.75rem 1.5rem;
          background: #ffd43b;
          color: #15181f;
          border-radius: 0.25rem;
          font-weight: bold;
          text-decoration: none;
          transition: background 0.2s;
        }
        .vscode-link:hover {
          background: #e6be2a;
        }
      `}</style>
    </div>
  );
};
