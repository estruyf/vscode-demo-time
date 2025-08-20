import { Extension } from '../src/services/Extension';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InsertTypingMode } from '../src/models';

jest.mock(
  'vscode',
  () => ({
    workspace: { getConfiguration: jest.fn() },
  }),
  { virtual: true },
);

jest.mock('../src/services/Extension');

const getInstanceMock = Extension.getInstance as jest.Mock;

describe('Hacker-Typer Typing Mode', () => {
  beforeEach(() => {
    getInstanceMock.mockReturnValue({ getSetting: jest.fn() });
  });

  describe('InsertTypingMode type', () => {
    it('accepts hacker-typer as a valid typing mode', () => {
      const mode: InsertTypingMode = 'hacker-typer';
      expect(mode).toBe('hacker-typer');
    });

    it('accepts all existing typing modes', () => {
      const instant: InsertTypingMode = 'instant';
      const lineByLine: InsertTypingMode = 'line-by-line';
      const charByChar: InsertTypingMode = 'character-by-character';
      const hackerTyper: InsertTypingMode = 'hacker-typer';
      
      expect(instant).toBe('instant');
      expect(lineByLine).toBe('line-by-line');
      expect(charByChar).toBe('character-by-character');
      expect(hackerTyper).toBe('hacker-typer');
    });
  });
});