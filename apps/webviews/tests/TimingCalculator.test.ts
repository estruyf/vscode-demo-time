/**
 * TimingCalculator Tests
 * Unit tests for animation timing calculations
 */

import { describe, it, expect } from '@jest/globals';
import { TimingCalculator, TimingConfig } from '../src/utils/svg/TimingCalculator';
import { SVGElementNode, SVGElementType } from '../src/types/svg';

describe('TimingCalculator', () => {
  describe('calculateDuration', () => {
    it('should calculate duration from path length and base speed', () => {
      const config: TimingConfig = {
        baseSpeed: 100, // 100 px/s
        speedModifier: 1.0,
      };

      const duration = TimingCalculator.calculateDuration(500, config);

      // 500px / 100px/s * 1000 = 5000ms
      expect(duration).toBe(5000);
    });

    it('should apply speed modifier correctly', () => {
      const config: TimingConfig = {
        baseSpeed: 100,
        speedModifier: 2.0, // 2x faster
      };

      const duration = TimingCalculator.calculateDuration(1000, config);

      // 1000px / (100px/s * 2.0) * 1000 = 5000ms
      expect(duration).toBe(5000);
    });

    it('should handle slow speed modifier', () => {
      const config: TimingConfig = {
        baseSpeed: 100,
        speedModifier: 0.5, // 0.5x slower
      };

      const duration = TimingCalculator.calculateDuration(500, config);

      // 500px / (100px/s * 0.5) * 1000 = 10000ms
      expect(duration).toBe(10000);
    });

    it('should return 0 for zero path length', () => {
      const config: TimingConfig = {
        baseSpeed: 100,
        speedModifier: 1.0,
      };

      const duration = TimingCalculator.calculateDuration(0, config);
      expect(duration).toBe(0);
    });

    it('should handle very large path lengths', () => {
      const config: TimingConfig = {
        baseSpeed: 100,
        speedModifier: 1.0,
      };

      const duration = TimingCalculator.calculateDuration(100000, config);

      // 100000px / 100px/s * 1000 = 1000000ms (1000s)
      expect(duration).toBe(1000000);
    });

    it('should fallback to default speed on invalid config', () => {
      const config: TimingConfig = {
        baseSpeed: 0, // invalid
        speedModifier: 1.0,
      };

      const duration = TimingCalculator.calculateDuration(1000, config);

      // Should use fallback: 100 px/s
      expect(duration).toBe(10000);
    });
  });

  describe('calculateTextDuration', () => {
    it('should calculate duration from character count', () => {
      const config: TimingConfig = {
        baseSpeed: 100,
        speedModifier: 1.0,
        textTypeWriterSpeed: 20, // 20ms per character
      };

      const duration = TimingCalculator.calculateTextDuration('Hello World', config);

      // 11 chars * 20ms = 220ms
      expect(duration).toBe(220);
    });

    it('should return 0 when textTypeWriterSpeed is undefined', () => {
      const config: TimingConfig = {
        baseSpeed: 100,
        speedModifier: 1.0,
        // textTypeWriterSpeed not set
      };

      const duration = TimingCalculator.calculateTextDuration('Hello World', config);
      expect(duration).toBe(0);
    });

    it('should return 0 for empty text', () => {
      const config: TimingConfig = {
        baseSpeed: 100,
        speedModifier: 1.0,
        textTypeWriterSpeed: 20,
      };

      const duration = TimingCalculator.calculateTextDuration('', config);
      expect(duration).toBe(0);
    });
  });

  describe('calculateSequence', () => {
    it('should calculate cumulative timings for multiple elements', () => {
      const elements: SVGElementNode[] = [
        createMockElement('path', 100),
        createMockElement('path', 200),
        createMockElement('path', 300),
      ];

      const config: TimingConfig = {
        baseSpeed: 100, // 100 px/s
        speedModifier: 1.0,
      };

      const timings = TimingCalculator.calculateSequence(elements, config);

      expect(timings).toHaveLength(3);

      // First element: starts at 0, duration 1000ms
      expect(timings[0].startTime).toBe(0);
      expect(timings[0].duration).toBe(1000);

      // Second element: starts at 1000, duration 2000ms
      expect(timings[1].startTime).toBe(1000);
      expect(timings[1].duration).toBe(2000);

      // Third element: starts at 3000, duration 3000ms
      expect(timings[2].startTime).toBe(3000);
      expect(timings[2].duration).toBe(3000);
    });

    it('should apply speed directives', () => {
      const elements: SVGElementNode[] = [
        createMockElement('path', 100),
        createMockElement('path', 100),
      ];

      const directives = [
        { type: 'speed', value: 2.0, position: 1 }, // 2x faster at element 1
      ];

      const config: TimingConfig = {
        baseSpeed: 100,
        speedModifier: 1.0,
      };

      const timings = TimingCalculator.calculateSequence(elements, config, directives);

      // First element: normal speed (100px / 100px/s = 1s)
      expect(timings[0].duration).toBe(1000);

      // Second element: 2x faster (100px / 200px/s = 0.5s)
      expect(timings[1].duration).toBe(500);
      expect(timings[1].startTime).toBe(1000);
    });

    it('should handle pause directives', () => {
      const elements: SVGElementNode[] = [
        createMockElement('path', 100),
        createMockElement('path', 100),
      ];

      const directives = [
        { type: 'pause', value: 500, position: 1 }, // pause 500ms after element 0
      ];

      const config: TimingConfig = {
        baseSpeed: 100,
        speedModifier: 1.0,
      };

      const timings = TimingCalculator.calculateSequence(elements, config, directives);

      expect(timings[0].pauseAfter).toBe(500);

      // Second element should start after first element duration + pause
      expect(timings[1].startTime).toBe(1000 + 500);
    });

    it('should handle pauseUntilPlay directives', () => {
      const elements: SVGElementNode[] = [
        createMockElement('path', 100),
        createMockElement('path', 100),
      ];

      const directives = [{ type: 'pauseUntilPlay', position: 1 }];

      const config: TimingConfig = {
        baseSpeed: 100,
        speedModifier: 1.0,
      };

      const timings = TimingCalculator.calculateSequence(elements, config, directives);

      expect(timings[0].waitForPlay).toBe(true);
    });
  });

  describe('getTotalDuration', () => {
    it('should return total duration including last element', () => {
      const timings = [
        { elementIndex: 0, startTime: 0, duration: 1000 },
        { elementIndex: 1, startTime: 1000, duration: 2000 },
        { elementIndex: 2, startTime: 3000, duration: 1500 },
      ];

      const total = TimingCalculator.getTotalDuration(timings);

      // Last element: 3000 + 1500 = 4500
      expect(total).toBe(4500);
    });

    it('should include pauseAfter in total', () => {
      const timings = [
        { elementIndex: 0, startTime: 0, duration: 1000 },
        { elementIndex: 1, startTime: 1000, duration: 2000, pauseAfter: 500 },
      ];

      const total = TimingCalculator.getTotalDuration(timings);

      // Last element: 1000 + 2000 + 500 = 3500
      expect(total).toBe(3500);
    });

    it('should return 0 for empty timings array', () => {
      const total = TimingCalculator.getTotalDuration([]);
      expect(total).toBe(0);
    });
  });

  describe('getElementAtTime', () => {
    const timings = [
      { elementIndex: 0, startTime: 0, duration: 1000 },
      { elementIndex: 1, startTime: 1000, duration: 2000 },
      { elementIndex: 2, startTime: 3000, duration: 1500 },
    ];

    it('should find element at beginning', () => {
      const result = TimingCalculator.getElementAtTime(timings, 0);

      expect(result).not.toBeNull();
      expect(result?.elementIndex).toBe(0);
      expect(result?.progress).toBe(0);
    });

    it('should find element in middle of animation', () => {
      const result = TimingCalculator.getElementAtTime(timings, 500);

      expect(result).not.toBeNull();
      expect(result?.elementIndex).toBe(0);
      expect(result?.progress).toBe(0.5); // 500ms / 1000ms
    });

    it('should find second element', () => {
      const result = TimingCalculator.getElementAtTime(timings, 2000);

      expect(result).not.toBeNull();
      expect(result?.elementIndex).toBe(1);
      expect(result?.progress).toBe(0.5); // (2000 - 1000) / 2000
    });

    it('should return null for time beyond all elements', () => {
      const result = TimingCalculator.getElementAtTime(timings, 5000);
      expect(result).toBeNull();
    });

    it('should return null for time in gap between elements', () => {
      const timingsWithGap = [
        { elementIndex: 0, startTime: 0, duration: 1000, pauseAfter: 500 },
        { elementIndex: 1, startTime: 1500, duration: 1000 },
      ];

      const result = TimingCalculator.getElementAtTime(timingsWithGap, 1200);
      expect(result).toBeNull();
    });
  });
});

// Helper function to create mock SVG elements
function createMockElement(type: SVGElementType, pathLength: number): SVGElementNode {
  const mockElement = {
    tagName: type,
    getAttribute: () => null,
    attributes: [],
    children: [],
  } as unknown as SVGElement;

  return {
    element: mockElement,
    type,
    order: 0,
    hasStroke: type === 'path',
    hasFill: false,
    pathLength,
    textContent: undefined,
    attributes: {},
  };
}
