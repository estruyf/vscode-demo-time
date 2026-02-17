/**
 * AnimatedSVGSlide Component
 * Main component for rendering animated SVG slides
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { SVGParser } from '../../utils/svg/SVGParser';
import { ParsedSVG } from '../../utils/svg/types';
import { AnimationEngine, AnimationState, AnimationCommand } from '../../utils/svg/AnimationEngine';
import { SVGRenderer } from './SVGRenderer';
import { TransportControls } from './TransportControls';
import { messageHandler, Messenger } from '@estruyf/vscode/dist/client/webview';
import { EventData, WebViewMessages } from '@demotime/common';

export interface AnimatedSVGSlideProps {
  svgContent: string;
  animationSpeed?: number | string; // pixels per second
  textTypeWriterEffect?: boolean;
  textTypewriterSpeed?: number | string; // characters per second
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
  textTypewriterSpeed = 20,
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
  const [animationEngine, setAnimationEngine] = useState<AnimationEngine | null>(null);

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
    
    if (!parsedSVG || showCompleteDiagram || !isActive) {
      // Clean up existing engine
      if (animationEngine) {
        animationEngine.destroy();
        setAnimationEngine(null);
      }
      return;
    }

    // Parse speed values
    const baseSpeed = typeof animationSpeed === 'string' 
      ? parseFloat(animationSpeed) 
      : animationSpeed;
    
    const DEFAULT_TEXT_SPEED = 20; // chars per second
    const textSpeed = textTypeWriterEffect
      ? (typeof textTypewriterSpeed === 'string'
          ? (isNaN(parseFloat(textTypewriterSpeed)) ? DEFAULT_TEXT_SPEED : parseFloat(textTypewriterSpeed))
          : (textTypewriterSpeed ?? DEFAULT_TEXT_SPEED))
      : undefined;


    const engine = new AnimationEngine({
      elements: parsedSVG.elements,
      directives: parsedSVG.directives,
      baseSpeed,
      textTypewriterSpeed: textSpeed,
      autoplay,
      onStateChange: (state) => {
        setAnimationState(state);
      },
    });

    setAnimationEngine(engine);

    // Cleanup on unmount or when slide becomes inactive
    return () => {
      engine.destroy();
    };
  }, [parsedSVG, animationSpeed, textTypeWriterEffect, textTypewriterSpeed, autoplay, showCompleteDiagram, isActive]);

  // Handle control commands. Return the underlying result so callers
  // can handle potential Promise rejections (e.g. media play AbortError).
  const handleCommand = useCallback((command: AnimationCommand) => {
    if (animationEngine) {
      return animationEngine.handleCommand(command);
    }
    return undefined;
  }, [animationEngine]);

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
  const recentlyResumedRef = useRef(false);
  const consumedAtIndexRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevStatusRef.current;
    const curr = animationState?.status;
    if (prev === 'waiting' && curr === 'playing') {
      try { window.dispatchEvent(new CustomEvent('demotime.preview.nextConsumed', { detail: { slideIndex } })); } catch {}
      // mark that this slide consumed a next action and has resumed
      consumedAtIndexRef.current = slideIndex;
      recentlyResumedRef.current = true;
      const t = setTimeout(() => { recentlyResumedRef.current = false; }, 300);
      return () => clearTimeout(t);
    }
    // Clear consumed flag when animation finishes
    if (curr === 'complete' && consumedAtIndexRef.current === slideIndex) {
      try { window.dispatchEvent(new CustomEvent('demotime.preview.animationComplete', { detail: { slideIndex } })); } catch {}
      consumedAtIndexRef.current = null;
    }
    prevStatusRef.current = curr;
    return undefined;
  }, [animationState?.status, slideIndex]);

  // Listen for in-webview 'checkNext' handshake so paused animations
  // can consume next-slide requests from the preview. If we are
  // currently waiting (pauseUntilPlay) we resume and notify consumption.
  useEffect(() => {
    const onCheckNext = (ev: any) => {
      try {
        console.debug('[AnimatedSVGSlide] received demotime.preview.checkNext', { slideIndex, status: animationState?.status });
        if (animationState?.status === 'waiting') {
          // Resume animation
          consumedAtIndexRef.current = slideIndex;
          const res = handleCommand('play');
          // Mark the syncCheck as consumed if this was a sync check
          try {
            if (ev && ev.detail) {
              ev.detail.consumed = true;
            }
          } catch {}
          // Notify preview this slide consumed the next action
          try { window.dispatchEvent(new CustomEvent('demotime.preview.nextConsumed', { detail: { slideIndex } })); } catch {}
          if (res && typeof (res as any).catch === 'function') {
            (res as any).catch((err: any) => {
              if (err && err.name === 'AbortError') { return; }
              console.error('Error while resuming animation from checkNext', err);
            });
          }
        }
      } catch (err) {
        // swallow errors; handshake is best-effort
        console.error('Error handling demotime.preview.checkNext', err);
      }
    };

    window.addEventListener('demotime.preview.checkNext', onCheckNext as EventListener);
    // Also listen for synchronous checks where listeners can mutate the
    // event detail before dispatch returns.
    window.addEventListener('demotime.preview.syncCheck', onCheckNext as EventListener);
    return () => {
      window.removeEventListener('demotime.preview.checkNext', onCheckNext as EventListener);
      window.removeEventListener('demotime.preview.syncCheck', onCheckNext as EventListener);
    };
  }, [animationState?.status, handleCommand, slideIndex]);

  // Listen for DemoTime navigation events to resume from pauseUntilPlay
  const slidesListener = useCallback((message: MessageEvent<EventData<any>>) => {
    const { command } = message.data;
    console.debug('[AnimatedSVGSlide] Messenger message received', { command, slideIndex, status: animationState?.status });
    if (!command || !isActive || !animationState) {
      return;
    }


    // Only intercept when waiting at pauseUntilPlay
    if (animationState.status === 'waiting') {
      if (command === WebViewMessages.toWebview.nextSlide) {
        // Resume animation - parent will block navigation via onNavigationBlock
        consumedAtIndexRef.current = slideIndex;
        const res = handleCommand('play');
        // Notify preview that we consumed the next action so it doesn't advance
        try { window.dispatchEvent(new CustomEvent('demotime.preview.nextConsumed', { detail: { slideIndex } })); } catch {}
        if (res && typeof (res as any).catch === 'function') {
          (res as any).catch((err: any) => {
            if (err && err.name === 'AbortError') {
              // Ignore media play aborted by a concurrent load
              return;
            }
            console.error('Error while resuming animation on nextSlide', err);
          });
        }
      }
    }
  }, [isActive, animationState, handleCommand]);

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
        consumedAtIndexRef.current = slideIndex;
        const res = handleCommand('play');
        // Inform preview that we consumed the next action (resume)
        try { window.dispatchEvent(new CustomEvent('demotime.preview.nextConsumed', { detail: { slideIndex } })); } catch {}
        if (res && typeof (res as any).catch === 'function') {
          (res as any).catch((err: any) => {
            if (err && err.name === 'AbortError') { return; }
            console.error('Error while resuming animation via keyboard', err);
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, animationState, handleCommand]);

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
    <div className="animated-svg-slide w-full h-full flex items-center justify-center relative">
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

