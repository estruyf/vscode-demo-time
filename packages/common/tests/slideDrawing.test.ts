import { describe, it, expect } from '@jest/globals';
import {
  addSlideDrawingPoint,
  getSlideDrawingKey,
  getSlideDrawingPath,
  isSlideDrawingStrokeHit,
} from '../src/utils/slideDrawing';
import { SlideDrawingStroke } from '../src/models';

const stroke = (
  points: number[],
  tool: SlideDrawingStroke['tool'] = 'pen',
): SlideDrawingStroke => ({
  tool,
  color: '#ef4444',
  points,
});

describe('getSlideDrawingKey', () => {
  it('combines the file and slide index', () => {
    expect(getSlideDrawingKey('/slides/intro.md', 2)).toBe('/slides/intro.md#2');
  });
});

describe('addSlideDrawingPoint', () => {
  it('adds the first point, rounded to one decimal', () => {
    const points: number[] = [];
    expect(addSlideDrawingPoint(points, 10.123, 20.987)).toBe(true);
    expect(points).toEqual([10.1, 21]);
  });

  it('skips a point that is too close to the last one', () => {
    const points = [10, 10];
    expect(addSlideDrawingPoint(points, 10.5, 10.5)).toBe(false);
    expect(points).toEqual([10, 10]);
  });

  it('adds a point that is far enough from the last one', () => {
    const points = [10, 10];
    expect(addSlideDrawingPoint(points, 15, 10)).toBe(true);
    expect(points).toEqual([10, 10, 15, 10]);
  });
});

describe('getSlideDrawingPath', () => {
  it('returns nothing without points', () => {
    expect(getSlideDrawingPath([])).toBe('');
  });

  it('draws a single point as a dot', () => {
    expect(getSlideDrawingPath([10, 20])).toBe('M10 20L10.1 20');
  });

  it('draws a line between two points', () => {
    expect(getSlideDrawingPath([10, 20, 30, 40])).toBe('M10 20L30 40');
  });

  it('curves through the middle of the segments', () => {
    expect(getSlideDrawingPath([0, 0, 10, 0, 20, 10])).toBe('M0 0Q10 0 15 5L20 10');
  });
});

describe('isSlideDrawingStrokeHit', () => {
  it('hits a stroke close to one of its segments', () => {
    expect(isSlideDrawingStrokeHit(stroke([0, 0, 100, 0]), 50, 8, 6)).toBe(true);
  });

  it('misses a stroke that is further away', () => {
    expect(isSlideDrawingStrokeHit(stroke([0, 0, 100, 0]), 50, 20, 6)).toBe(false);
  });

  it('counts the width of the highlighter', () => {
    expect(isSlideDrawingStrokeHit(stroke([0, 0, 100, 0], 'highlighter'), 50, 16, 6)).toBe(true);
  });

  it('hits a dot', () => {
    expect(isSlideDrawingStrokeHit(stroke([10, 10]), 14, 10, 6)).toBe(true);
    expect(isSlideDrawingStrokeHit(stroke([10, 10]), 30, 10, 6)).toBe(false);
  });

  it('does not reach past the end of a segment', () => {
    expect(isSlideDrawingStrokeHit(stroke([0, 0, 100, 0]), 120, 0, 6)).toBe(false);
  });
});
