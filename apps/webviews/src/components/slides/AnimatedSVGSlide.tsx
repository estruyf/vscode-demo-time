/**
 * AnimatedSVGSlide Component
 * Main component for rendering animated SVG slides
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { SVGParser } from '../../utils/svg/SVGParser';
import { ParsedSVG } from '../../types/svg';
import { AnimationEngine, AnimationState, AnimationCommand, AnimationStatus } from '../../utils/svg/AnimationEngine';
import { SVGRenderer } from './SVGRenderer';
import { TransportControls } from './TransportControls';
import { Messenger } from '@estruyf/vscode/dist/client/webview';
import { WebViewMessages } from '@demotime/common';
import type { EventData } from '@estruyf/vscode';

export interface AnimatedSVGSlideProps {
  svgContent: string;
  animationSpeed?: number | string; // pixels per second
  textTypeWriterEffect?: boolean;
  textTypeWriterSpeed?: number | string; // characters per second
  autoplay?: boolean;
  showCompleteDiagram?: boolean;
  invertLightAndDarkColours?: boolean;
  transportControlsPosition?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'none';
  slideIndex: number;
  isActive: boolean;
  onNavigationBlock?: (isBlocking: boolean) => void;
}

export const AnimatedSVGSlide: React.FC<AnimatedSVGSlideProps> = ({
  svgContent,
  animationSpeed = 100,
  textTypeWriterEffect = true,
  textTypeWriterSpeed = 20,
  autoplay = true,
  showCompleteDiagram = false,
  invertLightAndDarkColours = false,
  transportControlsPosition = 'bottomRight',
  slideIndex,
  isActive,
  onNavigationBlock
}) => {
  const [parsedSVG, setParsedSVG] = useState<ParsedSVG | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [animationState, setAnimationState] = useState<AnimationState | null>(null);
  const animationEngineRef = useRef<AnimationEngine | null>(null);

  // Parse SVG content on mount or when content changes
  useEffect(() => {
    if (!svgContent) {
      setError('No SVG content provided');
      return;
    }

    try {
      const parsed = SVGParser.parse(svgContent);
      setParsedSVG(parsed);

      if (parsed.errors.length > 0) {
        if (parsed.errors[0].type === 'structure') {
          setError(parsed.errors[0].message);
        }
      } else {
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to parse SVG: ${errorMessage}`);
      console.error('SVG parsing error:', err);
      setParsedSVG(null);
    }
  }, [svgContent]);

  // Initialize animation engine when parsed SVG is available
  useEffect(() => {
    // Destroy any existing engine before creating a new one
    animationEngineRef.current?.destroy();
    animationEngineRef.current = null;

    if (!parsedSVG || showCompleteDiagram || !isActive) {
      return;
    }

    // Parse speed values
    const baseSpeed = typeof animationSpeed === 'string'
      ? parseFloat(animationSpeed)
      : animationSpeed;

    const DEFAULT_TEXT_SPEED = 20; // chars per second
    const textSpeed = textTypeWriterEffect
      ? (typeof textTypeWriterSpeed === 'string'
        ? (isNaN(parseFloat(textTypeWriterSpeed)) ? DEFAULT_TEXT_SPEED : parseFloat(textTypeWriterSpeed))
        : (textTypeWriterSpeed ?? DEFAULT_TEXT_SPEED))
      : undefined;

    const engine = new AnimationEngine({
      elements: parsedSVG.elements,
      directives: parsedSVG.directives,
      baseSpeed,
      textTypeWriterSpeed: textSpeed,
      autoplay,
      onStateChange: (state) => {
        setAnimationState(state);
      },
    });

    animationEngineRef.current = engine;

    return () => {
      engine.destroy();
      animationEngineRef.current = null;
    };
  }, [parsedSVG, animationSpeed, textTypeWriterEffect, textTypeWriterSpeed, autoplay, showCompleteDiagram, isActive]);

  // Handle control commands. Return the underlying result so callers
  // can handle potential Promise rejections (e.g. media play AbortError).
  const handleCommand = useCallback((command: AnimationCommand) => {
    return animationEngineRef.current?.handleCommand(command);
  }, []);

  // Centralized helper to resume a paused animation and notify the preview
  const resumeAnimation = useCallback(() => {
    consumedAtIndexRef.current = slideIndex;
    const res = handleCommand('play');
    window.dispatchEvent(new CustomEvent('demotime.preview.nextConsumed', { detail: { slideIndex } }));
    if (res) {
      (res as Promise<void>).catch((err: Error) => {
        if (err?.name === 'AbortError') { return; }
        console.error('Error while resuming animation', err);
      });
    }
  }, [handleCommand, slideIndex]);

  // Notify parent when animation is waiting (blocking navigation)
  useEffect(() => {
    if (onNavigationBlock) {
      const isBlocking = animationState?.status === 'waiting';
      onNavigationBlock(isBlocking);
    }
  }, [animationState?.status, onNavigationBlock]);

  // Track transitions from 'waiting' -> 'playing' so we can notify the
  // preview that we consumed a next action even if the consumption
  // happened slightly after the preview dispatched its syncCheck.
  const prevStatusRef = useRef<AnimationStatus | undefined>(undefined);
  const consumedAtIndexRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevStatusRef.current;
    const curr = animationState?.status;
    prevStatusRef.current = curr;
    if (prev === 'waiting' && curr === 'playing') {
      window.dispatchEvent(new CustomEvent('demotime.preview.nextConsumed', { detail: { slideIndex } }));
      consumedAtIndexRef.current = slideIndex;
      return;
    }
    // Clear consumed flag when animation finishes
    if (curr === 'complete' && consumedAtIndexRef.current === slideIndex) {
      window.dispatchEvent(new CustomEvent('demotime.preview.animationComplete', { detail: { slideIndex } }));
      consumedAtIndexRef.current = null;
    }
  }, [animationState?.status, slideIndex]);

  // Listen for in-webview 'checkNext' handshake so paused animations
  // can consume next-slide requests from the preview. If we are
  // currently waiting (pauseUntilPlay) we resume and notify consumption.
  useEffect(() => {
    const onCheckNext = (ev: Event) => {
      try {
        console.debug('[AnimatedSVGSlide] received demotime.preview.checkNext', { slideIndex, status: animationState?.status });
        if (animationState?.status === 'waiting') {
          // Mark the syncCheck as consumed before resuming
          const customEv = ev as CustomEvent;
          if (customEv?.detail) {
            customEv.detail.consumed = true;
          }
          resumeAnimation();
        }
      } catch (err) {
        console.error('Error handling demotime.preview.checkNext', err);
      }
    };

    window.addEventListener('demotime.preview.checkNext', onCheckNext);
    // Also listen for synchronous checks where listeners can mutate the
    // event detail before dispatch returns.
    window.addEventListener('demotime.preview.syncCheck', onCheckNext);
    return () => {
      window.removeEventListener('demotime.preview.checkNext', onCheckNext);
      window.removeEventListener('demotime.preview.syncCheck', onCheckNext);
    };
  }, [animationState?.status, resumeAnimation, slideIndex]);

  // Listen for DemoTime navigation events to resume from pauseUntilPlay
  const slidesListener = useCallback((message: MessageEvent<EventData<unknown>>) => {
    const { command } = message.data;
    console.debug('[AnimatedSVGSlide] Messenger message received', { command, slideIndex, status: animationState?.status });
    if (!command || !isActive || !animationState) {
      return;
    }

    // Only intercept when waiting at pauseUntilPlay
    if (animationState.status === 'waiting' && command === WebViewMessages.toWebview.nextSlide) {
      resumeAnimation();
    }
  }, [isActive, animationState, resumeAnimation, slideIndex]);

  // Register/unregister message listener
  useEffect(() => {
    Messenger.listen(slidesListener);
    return () => {
      Messenger.unlisten(slidesListener);
    };
  }, [slidesListener]);

  // Handle keyboard events for advancing when paused at pauseUntilPlay
  useEffect(() => {
    if (!isActive || !animationState) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle when animation is waiting (pauseUntilPlay)
      if (animationState.status !== 'waiting') {
        return;
      }

      // Right arrow or Space to resume from pauseUntilPlay
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        resumeAnimation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, animationState, resumeAnimation]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold mb-4 text-red-500">SVG Error</h2>
          <p className="text-lg mb-4">{error}</p>
          <p className="text-sm opacity-70">
            Check the SVG file path in your slide frontmatter and ensure the file is valid.
          </p>
        </div>
      </div>
    );
  }

  if (!parsedSVG) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-lg">Loading SVG...</div>
      </div>
    );
  }

  return (
    <div className="animated-slide w-full h-full flex items-center justify-center relative">
      <SVGRenderer
        parsedSVG={parsedSVG}
        animationState={showCompleteDiagram ? null : animationState}
        showComplete={showCompleteDiagram}
        invertColors={invertLightAndDarkColours}
      />

      {!showCompleteDiagram && (
        <TransportControls
          position={transportControlsPosition}
          state={animationState}
          onCommand={handleCommand}
        />
      )}
    </div>
  );
};

