import React, { useState } from 'react';
import { NextDemo as NextDemoType } from '../types/api';

interface NextDemoProps {
  nextDemo?: NextDemoType;
  onTriggerNext: (bringToFront?: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const NextDemo: React.FC<NextDemoProps> = ({
  nextDemo,
  onTriggerNext,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bringToFront, setBringToFront] = useState(true);

  const handleTriggerNext = async () => {
    try {
      setLoading(true);
      await onTriggerNext(bringToFront);
      // Refresh data after triggering to get updated state
      setTimeout(() => {
        handleRefresh();
      }, 500);
    } catch (error) {
      console.error('Failed to trigger next demo:', error);
      alert(`Failed to trigger next demo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await onRefresh();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Next Demo
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
        >
          {refreshing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <span>🔄</span>
          )}
          Refresh
        </button>
      </div>

      {nextDemo ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-white text-lg">{nextDemo.title}</h3>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              id="bringToFront"
              checked={bringToFront}
              onChange={(e) => setBringToFront(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="bringToFront" className="text-gray-300 font-medium">
              Bring VS Code to front
            </label>
          </div>

          <button
            onClick={handleTriggerNext}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Triggering...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                ▶ Start Next Demo
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 rounded-lg p-4">
            <h3 className="font-semibold text-gray-300 text-lg">Ready to Start</h3>
            <p className="text-sm text-gray-400 mt-1">No next demo available - click below to begin</p>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              id="bringToFront"
              checked={bringToFront}
              onChange={(e) => setBringToFront(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="bringToFront" className="text-gray-300 font-medium">
              Bring VS Code to front
            </label>
          </div>

          <button
            onClick={handleTriggerNext}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Starting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🚀 Start Demo
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
