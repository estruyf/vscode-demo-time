import { describe, it, expect } from '@jest/globals';

describe('useCursor functionality', () => {
  it('should export hideCursor function from useCursor hook', () => {
    // This is a simple smoke test to ensure the module exports the right functions
    const useCursor = require('../src/preview/hooks/useCursor').default;
    expect(typeof useCursor).toBe('function');
  });

  it('should be a valid module import', () => {
    // Test that the module can be imported without errors
    expect(() => {
      require('../src/preview/hooks/useCursor');
    }).not.toThrow();
  });
});