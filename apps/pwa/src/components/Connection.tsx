import React, { useState } from 'react';
import { ConnectionStatus } from '../types/api';

interface ConnectionProps {
  connectionStatus: ConnectionStatus;
  loading: boolean;
  onConnect: (url: string) => void;
  onDisconnect: () => void;
  onCheckForUpdates: () => void;
}

export const Connection: React.FC<ConnectionProps> = ({
  connectionStatus,
  loading,
  onConnect,
  onCheckForUpdates,
}) => {
  const [url, setUrl] = useState('localhost:3710');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onConnect(url.trim());
    }
  };

  if (connectionStatus.connected) {
    return null;
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">
            API Server URL
          </label>
          <input
            type="text"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="localhost:3710"
            className="input-field w-full text-base md:text-lg"
            disabled={loading}
          />
          <p className="text-xs text-gray-300 mt-2">
            Use the URL to your Demo Time API server (e.g., <code>localhost:3710</code> or your <code>ngrok</code> URL).
          </p>
        </div>

        {connectionStatus.error && (
          <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3">
            <p className="text-red-300 text-sm">
              {connectionStatus.error}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="btn-primary w-full text-base md:text-lg py-3.5 md:py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Connecting...
            </span>
          ) : (
            'Connect to Demo Time'
          )}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-300">
        <a
          href="https://demotime.show"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#FFD23F] underline hover:opacity-90"
        >
          Visit Demo Time
        </a>
        <span className="ml-2">for docs, examples, and release notes.</span>
      </div>

      <div className="mt-6 bg-gray-800/20 border border-gray-700/30 rounded-lg p-4">
        <h3 className="font-semibold text-[#FFD23F] text-sm mb-2">
          Quick Setup
        </h3>
        <ol className="text-xs md:text-sm text-gray-400 space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-[#FFD23F] font-semibold">1.</span>
            <span>Enable API in Demo Time settings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#FFD23F] font-semibold">2.</span>
            <span>Start <code>ngrok http 3710</code></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#FFD23F] font-semibold">3.</span>
            <span>Enter the <code>ngrok</code> URL above</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#FFD23F] font-semibold">4.</span>
            <span>Click <code>Connect to Demo Time</code></span>
          </li>
        </ol>
      </div>

      <div className="mt-4 text-sm">
        {onCheckForUpdates && (
          <button
            onClick={onCheckForUpdates}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
          >
            Check for Updates
          </button>
        )}
      </div>
    </div>
  );
};
