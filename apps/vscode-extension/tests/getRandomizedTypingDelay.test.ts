import { getRandomizedTypingDelay } from '../src/utils/getRandomizedTypingDelay';
import { describe, it, expect, jest, afterEach } from '@jest/globals';

describe('getRandomizedTypingDelay', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the base delay when no randomness is provided', () => {
    expect(getRandomizedTypingDelay(50)).toBe(50);
  });

  it('returns the base delay when randomness is 0', () => {
    expect(getRandomizedTypingDelay(50, 0)).toBe(50);
  });

  it('returns the base delay when the base delay is 0', () => {
    expect(getRandomizedTypingDelay(0, 50)).toBe(0);
  });

  it('adds the full jitter when Math.random returns 1', () => {
    jest.spyOn(Math, 'random').mockReturnValue(1);
    // 50ms + (50ms * 10%) = 55ms
    expect(getRandomizedTypingDelay(50, 10)).toBe(55);
  });

  it('adds no jitter when Math.random returns 0', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(getRandomizedTypingDelay(50, 10)).toBe(50);
  });

  it('adds half the jitter when Math.random returns 0.5', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    // 50ms + (50ms * 20% * 0.5) = 55ms
    expect(getRandomizedTypingDelay(50, 20)).toBe(55);
  });

  it('clamps the randomness percentage to 100', () => {
    jest.spyOn(Math, 'random').mockReturnValue(1);
    // randomness above 100 is treated as 100 -> 50ms + 50ms = 100ms
    expect(getRandomizedTypingDelay(50, 250)).toBe(100);
  });

  it('never returns less than the base delay', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(getRandomizedTypingDelay(80, 50)).toBeGreaterThanOrEqual(80);
  });

  it('stays within the expected range for any random value', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.73);
    const result = getRandomizedTypingDelay(100, 10);
    expect(result).toBeGreaterThanOrEqual(100);
    expect(result).toBeLessThanOrEqual(110);
  });
});
