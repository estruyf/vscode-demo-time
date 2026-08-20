import { Config } from '@demotime/common';
import { Extension } from '../services/Extension';

const DEFAULT_TYPING_RANDOMNESS = 0;

/**
 * Resolves the semi-random typing speed variation (in percent).
 *
 * The value is the maximum percentage (0-100) of extra delay that can be added on
 * top of the configured typing speed for each character. An action-level value takes
 * precedence over the global `demoTime.insertTypingSpeedRandomness` setting.
 *
 * @param actionRandomness - The action-level randomness percentage (optional).
 * @returns The clamped randomness percentage between 0 and 100.
 */
export const getInsertionSpeedRandomness = (actionRandomness?: number): number => {
  let randomness = Extension.getInstance().getSetting<number>(Config.insert.typingSpeedRandomness);

  if (typeof actionRandomness !== 'undefined') {
    randomness = actionRandomness;
  }

  if (typeof randomness !== 'number' || isNaN(randomness)) {
    return DEFAULT_TYPING_RANDOMNESS;
  }

  // Clamp between 0 and 100 percent
  return Math.min(Math.max(randomness, 0), 100);
};
