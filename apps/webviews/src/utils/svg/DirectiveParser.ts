/**
 * DirectiveParser
 * Parses XML comments in SVG for animation control
 */

import { AnimationDirective } from '../../types/svg';

export class DirectiveParser {
  private static SPEED_PATTERN = /^\s*speed:\s*([\d.]+)\s*$/i;
  private static PAUSE_PATTERN = /^\s*pause:\s*([\d.]+(?:ms|s)?)\s*$/i;
  private static PAUSE_UNTIL_PLAY = /^\s*pause:\s*untilPlay\s*$/i;

  /**
   * Parse a comment node into an animation directive
   */
  public static parse(comment: Comment, elementIndex: number): AnimationDirective | null {
    const text = comment.textContent?.trim() || '';

    // Speed modifier
    const speedMatch = text.match(this.SPEED_PATTERN);
    if (speedMatch) {
      const value = parseFloat(speedMatch[1]);
      if (isNaN(value) || value <= 0) {
        console.warn(`[DirectiveParser] Invalid speed value: ${speedMatch[1]}, must be > 0`);
        return null;
      }
      return {
        type: 'speed',
        position: elementIndex,
        value,
      };
    }

    // Timed pause
    const pauseMatch = text.match(this.PAUSE_PATTERN);
    if (pauseMatch) {
      const timeValue = this.parseTimeValue(pauseMatch[1]);
      if (timeValue === null) {
        console.warn(`[DirectiveParser] Invalid pause value: ${pauseMatch[1]}`);
        return null;
      }
      return {
        type: 'pause',
        position: elementIndex,
        value: timeValue,
      };
    }

    // Interactive pause
    if (this.PAUSE_UNTIL_PLAY.test(text)) {
      return {
        type: 'pauseUntilPlay',
        position: elementIndex,
      };
    }

    return null;
  }

  /**
   * Parse time value string to milliseconds
   */
  private static parseTimeValue(value: string): number | null {
    if (value.endsWith('ms')) {
      const num = parseFloat(value.slice(0, -2));
      return isNaN(num) ? null : num;
    }
    if (value.endsWith('s')) {
      const num = parseFloat(value.slice(0, -1));
      return isNaN(num) ? null : num * 1000;
    }
    // Default to seconds if no unit (convert to milliseconds)
    const num = parseFloat(value);
    return isNaN(num) ? null : num * 1000;
  }
}
