/**
 * TransportControls Component
 * Playback controls for animated SVG slides
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AnimationState, AnimationCommand } from '../../utils/svg/AnimationEngine';

type ControlPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'none';

export interface TransportControlsProps {
  position: ControlPosition;
  state: AnimationState | null;
  onCommand: (command: AnimationCommand) => void;
}

export const TransportControls: React.FC<TransportControlsProps> = ({
  position,
  state,
  onCommand,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Space to play/pause
      if (e.code === 'Space' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (state?.status === 'playing' || state?.status === 'waiting') {
          onCommand('pause');
        } else {
          onCommand('play');
        }
      }
      // R to reset
      else if (e.key === 'r' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onCommand('reset');
      }
      // E to skip to end
      else if (e.key === 'e' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onCommand('skip');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [state?.status, onCommand]);

  if (position === 'none') {
    return null;
  }

  // Position classes
  const positionClasses = {
    topLeft: 'top-4 left-4',
    topRight: 'top-4 right-4',
    bottomLeft: 'bottom-4 left-4',
    bottomRight: 'bottom-4 right-4',
  };

  const isPlaying = state?.status === 'playing';
  const isPaused = state?.status === 'paused';
  const isWaiting = state?.status === 'waiting';
  const isComplete = state?.status === 'complete';
  const isIdle = state?.status === 'idle';

  return (
    <div
      className={`absolute ${positionClasses[position]} transition-opacity duration-200 ${
        isHovered ? 'opacity-100' : 'opacity-30'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2 bg-black bg-opacity-70 rounded-lg p-2 shadow-lg">
        {/* Play/Pause button */}
        <button
          onClick={() => onCommand(isPlaying ? 'pause' : 'play')}
          className="w-8 h-8 flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5 3h2v10H5V3zm4 0h2v10H9V3z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5 3l8 5-8 5V3z" />
            </svg>
          )}
        </button>

        {/* Reset button */}
        <button
          onClick={() => onCommand('reset')}
          className="w-8 h-8 flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          title="Reset (R)"
          aria-label="Reset"
          disabled={isIdle}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3V1L5 4l3 3V5a4 4 0 110 8 4 4 0 01-4-4H2a6 6 0 106-6z" />
          </svg>
        </button>

        {/* Skip to end button */}
        <button
          onClick={() => onCommand('skip')}
          className="w-8 h-8 flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          title="Skip to end (E)"
          aria-label="Skip to end"
          disabled={isComplete}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5 3l6 5-6 5V3zm6 0h2v10h-2V3z" />
          </svg>
        </button>

        {/* Status indicator */}
        {isWaiting && (
          <div className="ml-2 text-xs text-white flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
            <span>Waiting</span>
          </div>
        )}
      </div>
    </div>
  );
};
