import { getVideoAutoplay, SlideMetadata } from '@demotime/common';
import { describe, it, expect } from '@jest/globals';

describe('getVideoAutoplay', () => {
  it('autoplays background videos by default', () => {
    expect(getVideoAutoplay({ video: 'intro.mp4' })).toBe(true);
    expect(getVideoAutoplay(undefined)).toBe(true);
  });

  it('does not autoplay videos with controls by default', () => {
    expect(getVideoAutoplay({ video: 'intro.mp4', controls: true })).toBe(false);
  });

  it('respects autoplay: false for background videos', () => {
    expect(getVideoAutoplay({ video: 'intro.mp4', autoplay: false })).toBe(false);
  });

  it('respects autoplay: true for videos with controls', () => {
    expect(getVideoAutoplay({ video: 'intro.mp4', controls: true, autoplay: true })).toBe(true);
  });

  it('supports autoPlay as an alias', () => {
    expect(getVideoAutoplay({ video: 'intro.mp4', autoPlay: false })).toBe(false);
    expect(getVideoAutoplay({ video: 'intro.mp4', controls: true, autoPlay: true })).toBe(true);
  });

  it('prefers autoplay over autoPlay', () => {
    expect(getVideoAutoplay({ video: 'intro.mp4', autoplay: false, autoPlay: true })).toBe(false);
  });

  it('accepts string values', () => {
    // Front matter is not type checked, so string values can reach the slide metadata
    const matter = (autoplay: string) =>
      ({ video: 'intro.mp4', autoplay }) as unknown as SlideMetadata;
    expect(getVideoAutoplay(matter('false'))).toBe(false);
    expect(getVideoAutoplay({ ...matter('true'), controls: true })).toBe(true);
    expect(getVideoAutoplay({ video: 'intro.mp4', autoPlay: 'false' })).toBe(false);
  });
});
