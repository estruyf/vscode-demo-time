import { describe, it, expect } from '@jest/globals';
import {
  getCodeStepIndex,
  getCodeStepsLastClick,
  parseCodeStepsMeta,
  parseLineRange,
} from '@demotime/common';

describe('parseCodeStepsMeta', () => {
  it('returns undefined without steps', () => {
    expect(parseCodeStepsMeta(undefined)).toBeUndefined();
    expect(parseCodeStepsMeta('{1-3}')).toBeUndefined();
    expect(parseCodeStepsMeta('title="app.ts" showLineNumbers')).toBeUndefined();
  });

  it('gets the steps and keeps the other options', () => {
    expect(parseCodeStepsMeta('title="app.ts" {1-2|4-6|all} showLineNumbers')).toEqual({
      steps: ['1-2', '4-6', 'all'],
      clicks: 1,
      meta: 'title="app.ts" showLineNumbers',
    });
  });

  it('gets the clicks option', () => {
    expect(parseCodeStepsMeta('{1|2} clicks=3')).toEqual({
      steps: ['1', '2'],
      clicks: 3,
      meta: '',
    });
    expect(parseCodeStepsMeta('{1|2} clicks="2"')?.clicks).toBe(2);
  });

  it('does not read a range inside a title as steps', () => {
    expect(parseCodeStepsMeta('title="a{1|2}b"')).toBeUndefined();
  });
});

describe('parseLineRange', () => {
  it('parses ranges and single lines', () => {
    expect(parseLineRange('1-3,5')).toEqual([1, 2, 3, 5]);
    expect(parseLineRange(' 8 ')).toEqual([8]);
    expect(parseLineRange('4-2')).toEqual([2, 3, 4]);
  });

  it('returns undefined for all lines', () => {
    expect(parseLineRange('all')).toBeUndefined();
    expect(parseLineRange('*')).toBeUndefined();
    expect(parseLineRange('')).toBeUndefined();
  });
});

describe('code step clicks', () => {
  it('shows the first range before the first click', () => {
    expect(getCodeStepIndex(0, 3)).toBe(0);
    expect(getCodeStepIndex(1, 3)).toBe(1);
    expect(getCodeStepIndex(5, 3)).toBe(2);
    expect(getCodeStepsLastClick(3)).toBe(2);
  });

  it('starts later with the clicks option', () => {
    expect(getCodeStepIndex(1, 3, 2)).toBe(0);
    expect(getCodeStepIndex(2, 3, 2)).toBe(1);
    expect(getCodeStepIndex(3, 3, 2)).toBe(2);
    expect(getCodeStepsLastClick(3, 2)).toBe(3);
  });
});
