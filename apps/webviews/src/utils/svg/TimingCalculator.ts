/**
 * TimingCalculator
 * Calculates animation durations based on line speed model
 */

import { SVGElementNode } from '../../types/svg';

export interface TimingConfig {
  baseSpeed: number; // pixels per second
  speedModifier: number; // multiplier for current speed
  textTypeWriterSpeed?: number; // milliseconds per character
}

export interface ElementTiming {
  elementIndex: number;
  startTime: number; // ms from animation start
  duration: number; // ms
  pauseAfter?: number; // ms to pause after this element
  waitForPlay?: boolean; // true if pause:untilPlay directive
}

export class TimingCalculator {
  /**
   * Calculate animation duration for an element
   * Formula: duration = (pathLength / (baseSpeed * speedModifier)) * 1000
   */
  public static calculateDuration(pathLength: number, config: TimingConfig): number {
    if (pathLength <= 0) {
      return 0;
    }

    const effectiveSpeed = config.baseSpeed * config.speedModifier;
    if (effectiveSpeed <= 0) {
      console.warn(`Invalid effective speed: ${effectiveSpeed}, using default`);
      return (pathLength / 100) * 1000; // fallback: 100 px/s
    }

    const duration = (pathLength / effectiveSpeed) * 1000;
    return Math.max(0, duration); // ensure non-negative
  }

  /**
   * Calculate text typewriter duration
   * Formula: duration = characterCount * millisecondsPerCharacter
   */
  public static calculateTextDuration(text: string, config: TimingConfig): number {
    if (!text || !config.textTypeWriterSpeed) {
      return 0;
    }

    const charCount = text.length;
    // Tie text typing to the current speed modifier so directives like speed:0.5 slow it down.
    const effectiveMsPerChar = (config.textTypeWriterSpeed || 0) / (config.speedModifier || 1);
    if (effectiveMsPerChar <= 0) {
      // Fallback to 50ms/char (equivalent to 20 chars/s) if invalid.
      const fallback = 50;
      return Math.max(0, charCount * fallback);
    }

    const duration = charCount * effectiveMsPerChar;
    return Math.max(0, duration);
  }

  /**
   * Calculate timing for all elements in sequence
   * Returns array of ElementTiming with cumulative start times
   */
  public static calculateSequence(
    elements: SVGElementNode[],
    baseConfig: TimingConfig,
    directives?: Array<{ type: string; value?: number; position: number }>,
  ): ElementTiming[] {
    const timings: ElementTiming[] = [];
    let currentTime = 0;
    let currentSpeedModifier = 1.0;

    // Group directives by position for easy lookup
    const directivesByPosition = new Map<number, Array<{ type: string; value?: number }>>();
    if (directives) {
      directives.forEach((dir) => {
        const existing = directivesByPosition.get(dir.position) || [];
        existing.push({ type: dir.type, value: dir.value });
        directivesByPosition.set(dir.position, existing);
      });
    }

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      // Process directives at this position (they appear between elements i-1 and i)
      const elementDirectives = directivesByPosition.get(i) || [];

      for (const dir of elementDirectives) {
        if (dir.type === 'speed' && dir.value !== undefined) {
          // Speed directives affect this element and all subsequent
          currentSpeedModifier = dir.value;
        } else if (dir.type === 'pause' && dir.value !== undefined) {
          // Pause applies after the previous element (before this one)
          if (timings.length > 0) {
            timings[timings.length - 1].pauseAfter = dir.value;
            currentTime += dir.value;
          }
        } else if (dir.type === 'pauseUntilPlay') {
          // WaitForPlay applies after the previous element (before this one)
          if (timings.length > 0) {
            timings[timings.length - 1].waitForPlay = true;
          }
        }
      }

      // Calculate duration for this element
      const config: TimingConfig = {
        ...baseConfig,
        speedModifier: currentSpeedModifier,
      };

      let duration = 0;

      if (element.type === 'text' && element.textContent) {
        if (baseConfig.textTypeWriterSpeed) {
          duration = this.calculateTextDuration(element.textContent, config);
        }
      } else if (element.pathLength && element.pathLength > 0) {
        duration = this.calculateDuration(element.pathLength, config);
      }

      timings.push({
        elementIndex: i,
        startTime: currentTime,
        duration,
      });

      currentTime += duration;
    }

    return timings;
  }

  /**
   * Get total animation duration (excluding pauseUntilPlay)
   */
  public static getTotalDuration(timings: ElementTiming[]): number {
    if (timings.length === 0) {
      return 0;
    }

    const lastTiming = timings[timings.length - 1];
    let total = lastTiming.startTime + lastTiming.duration;

    if (lastTiming.pauseAfter !== undefined) {
      total += lastTiming.pauseAfter;
    }

    return total;
  }

  /**
   * Find which element should be animating at a given time
   */
  public static getElementAtTime(
    timings: ElementTiming[],
    currentTime: number,
  ): { elementIndex: number; progress: number } | null {
    for (const timing of timings) {
      const elementEnd = timing.startTime + timing.duration;

      // For zero-duration elements, they are "current" at exactly their start time
      if (timing.duration === 0) {
        if (currentTime >= timing.startTime && currentTime < timing.startTime + 16.67) {
          // Show for one frame (16.67ms at 60fps)
          return {
            elementIndex: timing.elementIndex,
            progress: 1.0,
          };
        }
      } else if (currentTime >= timing.startTime && currentTime < elementEnd) {
        // Currently animating this element
        const progress = (currentTime - timing.startTime) / timing.duration;

        return {
          elementIndex: timing.elementIndex,
          progress: Math.min(1.0, Math.max(0, progress)),
        };
      }
    }

    // Not currently animating any element
    return null;
  }
}
