import { Action } from '@demotime/common';
import { describe, it, expect } from '@jest/globals';

describe('Selection Action', () => {
  it('should include Selection in the Action enum', () => {
    expect(Action.Selection).toBe('selection');
  });

  it('should be a valid action type', () => {
    const action: Action = Action.Selection;
    expect(action).toBe('selection');
  });

  it('should be different from Highlight action', () => {
    expect(Action.Selection).not.toBe(Action.Highlight);
  });

  it('should be different from PositionCursor action', () => {
    expect(Action.Selection).not.toBe(Action.PositionCursor);
  });
});
