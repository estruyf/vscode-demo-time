import { getReducedMotionPreference, isReducedMotion } from '@demotime/common';
import { describe, it, expect } from '@jest/globals';

describe('getReducedMotionPreference', () => {
  it('follows VS Code with the default auto setting', () => {
    expect(getReducedMotionPreference('auto', 'on')).toBe('on');
    expect(getReducedMotionPreference('auto', 'off')).toBe('off');
    expect(getReducedMotionPreference('auto', 'auto')).toBe('auto');
  });

  it('overrides VS Code both ways', () => {
    expect(getReducedMotionPreference('on', 'off')).toBe('on');
    expect(getReducedMotionPreference('off', 'on')).toBe('off');
  });

  it('falls back to auto for missing or unknown values', () => {
    expect(getReducedMotionPreference(undefined, undefined)).toBe('auto');
    expect(getReducedMotionPreference('sometimes', 'maybe')).toBe('auto');
    expect(getReducedMotionPreference(undefined, 'on')).toBe('on');
  });
});

describe('isReducedMotion', () => {
  it('ignores the OS with on and off', () => {
    expect(isReducedMotion('on', false)).toBe(true);
    expect(isReducedMotion('off', true)).toBe(false);
  });

  it('follows the prefers-reduced-motion media query with auto', () => {
    expect(isReducedMotion('auto', true)).toBe(true);
    expect(isReducedMotion('auto', false)).toBe(false);
    expect(isReducedMotion(undefined, true)).toBe(true);
  });
});
