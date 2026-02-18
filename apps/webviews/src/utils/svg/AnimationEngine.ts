/**
 * AnimationEngine
 * State machine for managing SVG animation playback
 */

import { SVGElementNode, AnimationDirective } from './types';
import { TimingCalculator, ElementTiming, TimingConfig } from './TimingCalculator';

export type AnimationStatus = 'idle' | 'playing' | 'paused' | 'waiting' | 'complete';

export type AnimationCommand = 'play' | 'pause' | 'reset' | 'skip';

export interface AnimationState {
  status: AnimationStatus;
  currentElementIndex: number;
  currentProgress: number; // 0-1 for current element
  visibleElements: Set<number>;
  elapsedTime: number; // ms since animation start
  isPaused: boolean;
  isComplete: boolean;
}

export interface AnimationEngineConfig {
  elements: SVGElementNode[];
  directives: AnimationDirective[];
  baseSpeed: number; // pixels per second
  textTypewriterSpeed?: number; // characters per second
  autoplay: boolean;
  onStateChange: (state: AnimationState) => void;
  onComplete?: () => void;
}

export class AnimationEngine {
  private config: AnimationEngineConfig;
  private state: AnimationState;
  private timings: ElementTiming[];
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private pausedAtTime: number = 0;
  private consumedWaitPoints = new Set<number>();

  constructor(config: AnimationEngineConfig) {
    this.config = config;

    // Calculate timings for all elements
    const timingConfig: TimingConfig = {
      baseSpeed: config.baseSpeed,
      speedModifier: 1.0,
      textTypewriterSpeed: config.textTypewriterSpeed,
    };

    this.timings = TimingCalculator.calculateSequence(
      config.elements,
      timingConfig,
      config.directives
    );

    // Log timings for elements affected by speed directives for debugging
    const affected = this.timings
      .map(t => ({ index: t.elementIndex, duration: t.duration, waitForPlay: t.waitForPlay }))
      .filter(t => t.duration > 0)
      .slice(0, 20); // limit output

    // Initialize state - always start as idle, let play() change to playing
    this.state = {
      status: 'idle',
      currentElementIndex: -1,
      currentProgress: 0,
      visibleElements: new Set(),
      elapsedTime: 0,
      isPaused: false,
      isComplete: false,
    };

    // Start animation if autoplay
    if (config.autoplay) {
      this.play();
    } else {
      this.notifyStateChange();
    }
  }

  /**
   * Handle control commands
   */
  public handleCommand(command: AnimationCommand): void {
    switch (command) {
      case 'play':
        this.play();
        break;
      case 'pause':
        this.pause();
        break;
      case 'reset':
        this.reset();
        break;
      case 'skip':
        this.skipToEnd();
        break;
    }
  }

  /**
   * Start or resume animation
   */
  private play(): void {
    if (this.state.status === 'playing') {
      return;
    }

    if (this.state.isComplete) {
      this.reset();
    }

    this.state.status = 'playing';
    this.state.isPaused = false;
    this.lastFrameTime = performance.now();
    this.notifyStateChange();
    this.startAnimationLoop();
  }

  /**
   * Pause animation
   */
  private pause(): void {
    if (this.state.status !== 'playing' && this.state.status !== 'waiting') {
      return;
    }

    this.state.status = 'paused';
    this.state.isPaused = true;
    this.pausedAtTime = this.state.elapsedTime;
    this.notifyStateChange();
    this.stopAnimationLoop();
  }

  /**
   * Reset animation to beginning
   */
  private reset(): void {
    this.stopAnimationLoop();
    
    this.state = {
      status: 'idle',
      currentElementIndex: -1,
      currentProgress: 0,
      visibleElements: new Set(),
      elapsedTime: 0,
      isPaused: false,
      isComplete: false,
    };

    this.pausedAtTime = 0;
    this.consumedWaitPoints.clear();
    this.notifyStateChange();
  }

  /**
   * Skip to end (show all elements)
   */
  private skipToEnd(): void {
    this.stopAnimationLoop();

    const allIndices = new Set(this.config.elements.map((_, i) => i));
    
    this.state = {
      status: 'complete',
      currentElementIndex: this.config.elements.length - 1,
      currentProgress: 1.0,
      visibleElements: allIndices,
      elapsedTime: TimingCalculator.getTotalDuration(this.timings),
      isPaused: false,
      isComplete: true,
    };

    this.notifyStateChange();
    
    if (this.config.onComplete) {
      this.config.onComplete();
    }
  }

  /**
   * Main animation loop using requestAnimationFrame
   */
  private startAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    const loop = (timestamp: number) => {
      if (this.state.status !== 'playing') {
        this.animationFrameId = null;
        return;
      }

      // Calculate delta time
      const deltaTime = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;

      // Update elapsed time
      this.state.elapsedTime += deltaTime;

      // Track previous state to detect changes
      const previousElementIndex = this.state.currentElementIndex;
      const previousVisibleCount = this.state.visibleElements.size;
      const previousProgress = this.state.currentProgress;

      // Update animation state based on current time
      this.updateStateForTime(this.state.elapsedTime);

      // If we hit a pauseUntilPlay, the updateStateForTime will have set status to 'waiting'
      // Stop the loop here and don't check for completion
      if (this.state.status === 'waiting') {
        this.notifyStateChange();
        this.stopAnimationLoop();
        return;
      }

      // Check if complete
      const totalDuration = TimingCalculator.getTotalDuration(this.timings);
      if (this.state.elapsedTime >= totalDuration) {
        // Ensure ALL elements are visible at completion
        const allIndices = new Set(this.config.elements.map((_, i) => i));
        this.state.status = 'complete';
        this.state.isComplete = true;
        this.state.currentElementIndex = this.config.elements.length - 1;
        this.state.currentProgress = 1.0;
        this.state.visibleElements = allIndices;
        
        this.notifyStateChange();
        this.stopAnimationLoop();
        
        if (this.config.onComplete) {
          this.config.onComplete();
        }
        return;
      }

      // Only notify if something meaningful changed
      const elementChanged = this.state.currentElementIndex !== previousElementIndex;
      const visibilityChanged = this.state.visibleElements.size !== previousVisibleCount;
      // Lower threshold so short text animations emit enough frames for per-character updates.
      const progressChanged = Math.abs(this.state.currentProgress - previousProgress) > 0.0005; // 0.05%
      
      // Always notify on element transitions, otherwise check progress threshold
      if (elementChanged || visibilityChanged || (this.state.currentElementIndex >= 0 && progressChanged)) {
        this.notifyStateChange();
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop animation loop
   */
  private stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Update state for current elapsed time
   */
  private updateStateForTime(elapsedTime: number): void {
    // Check for unconsumed waitForPlay points BEFORE advancing the element index.
    // waitForPlay is set on the element that finishes just before the pause.
    // Once elapsed time passes that element's end, we must pause.
    for (const timing of this.timings) {
      if (!timing.waitForPlay) continue;
      if (this.consumedWaitPoints.has(timing.elementIndex)) continue;

      const elementEnd = timing.startTime + timing.duration;
      if (elapsedTime >= elementEnd) {
        // Mark consumed so it won't re-trigger after resume
        this.consumedWaitPoints.add(timing.elementIndex);

        // Clamp elapsed time to the end of this element
        this.state.elapsedTime = elementEnd;
        this.state.currentElementIndex = timing.elementIndex;
        this.state.currentProgress = 1.0;

        // Make all elements up to and including this one visible
        this.state.visibleElements.clear();
        for (let i = 0; i <= timing.elementIndex; i++) {
          this.state.visibleElements.add(i);
        }

        // Enter waiting state (the animation loop will stop on seeing this)
        this.state.status = 'waiting';
        this.state.isPaused = true;
        return;
      }
    }

    // No wait point hit - normal time-based update
    const current = TimingCalculator.getElementAtTime(this.timings, elapsedTime);

    if (current) {
      this.state.currentElementIndex = current.elementIndex;
      this.state.currentProgress = current.progress;

      // Update visible elements (all elements up to and including current)
      this.state.visibleElements.clear();
      for (let i = 0; i <= current.elementIndex; i++) {
        this.state.visibleElements.add(i);
      }
    } else {
      // No element is currently animating - we're in a gap or completed
      // Keep all elements visible up to the last completed element
      let lastCompletedIndex = -1;
      for (let i = 0; i < this.timings.length; i++) {
        const timing = this.timings[i];
        const elementEnd = timing.startTime + timing.duration;
        if (elapsedTime >= elementEnd) {
          lastCompletedIndex = i;
        } else {
          break; // Stop at first incomplete element
        }
      }

      if (lastCompletedIndex >= 0) {
        this.state.currentElementIndex = lastCompletedIndex;
        this.state.currentProgress = 1.0;

        // Make all completed elements visible
        this.state.visibleElements.clear();
        for (let i = 0; i <= lastCompletedIndex; i++) {
          this.state.visibleElements.add(i);
        }
      }
    }
  }

  /**
   * Notify listeners of state change
   */
  private notifyStateChange(): void {
    // Create a deep copy for immutability
    const stateCopy: AnimationState = {
      ...this.state,
      visibleElements: new Set(this.state.visibleElements),
    };

    this.config.onStateChange(stateCopy);
  }

  /**
   * Get current animation state
   */
  public getState(): AnimationState {
    return {
      ...this.state,
      visibleElements: new Set(this.state.visibleElements),
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopAnimationLoop();
  }
}

