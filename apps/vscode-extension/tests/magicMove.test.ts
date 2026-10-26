import { describe, it, expect } from '@jest/globals';
import { MAGIC_MOVE_DURATION, parseMagicMoveMeta, parseMagicMoveSteps } from '@demotime/common';

describe('parseMagicMoveMeta', () => {
  it('returns undefined for other code blocks', () => {
    expect(parseMagicMoveMeta('md', undefined)).toBeUndefined();
    expect(parseMagicMoveMeta('ts', 'title="magic-move.ts"')).toBeUndefined();
    expect(parseMagicMoveMeta('md', 'magic-moves')).toBeUndefined();
  });

  it('gets the defaults', () => {
    expect(parseMagicMoveMeta('md', 'magic-move')).toEqual({
      clicks: 1,
      duration: MAGIC_MOVE_DURATION,
      lineNumbers: false,
      meta: '',
    });
  });

  it('accepts magic-move as the language', () => {
    expect(parseMagicMoveMeta('magic-move', null)?.clicks).toBe(1);
  });

  it('gets the options and keeps the other options', () => {
    expect(
      parseMagicMoveMeta('md', 'magic-move title="app.ts" clicks=2 duration="400" showLineNumbers'),
    ).toEqual({
      clicks: 2,
      duration: 400,
      lineNumbers: true,
      meta: 'title="app.ts" showLineNumbers',
    });
  });

  it('allows a duration of 0 and no clicks below 1', () => {
    const parsed = parseMagicMoveMeta('md', 'magic-move duration=0 clicks=0');
    expect(parsed?.duration).toBe(0);
    expect(parsed?.clicks).toBe(1);
  });

  it('detects line numbers with a start line', () => {
    expect(parseMagicMoveMeta('md', 'magic-move showLineNumbers{10}')?.lineNumbers).toBe(true);
  });
});

describe('parseMagicMoveSteps', () => {
  it('gets every code block as a step', () => {
    const content = [
      '```ts',
      'const add = (a, b) => a + b;',
      '```',
      '',
      'Some text between the steps',
      '```ts {1}',
      'const add = (a: number, b: number) => a + b;',
      '',
      'add(1, 2);',
      '```',
    ].join('\n');

    expect(parseMagicMoveSteps(content)).toEqual([
      { lang: 'ts', code: 'const add = (a, b) => a + b;' },
      { lang: 'ts', code: 'const add = (a: number, b: number) => a + b;\n\nadd(1, 2);' },
    ]);
  });

  it('uses plaintext without a language and supports tilde fences', () => {
    expect(parseMagicMoveSteps('```\nhello\n```\n~~~py\nprint("hi")\n~~~')).toEqual([
      { lang: 'plaintext', code: 'hello' },
      { lang: 'py', code: 'print("hi")' },
    ]);
  });

  it('keeps shorter fences inside a longer fence', () => {
    expect(parseMagicMoveSteps('````md\n```ts\nconst a = 1;\n```\n````')).toEqual([
      { lang: 'md', code: '```ts\nconst a = 1;\n```' },
    ]);
  });

  it('runs an unclosed code block to the end', () => {
    expect(parseMagicMoveSteps('```ts\nconst a = 1;')).toEqual([
      { lang: 'ts', code: 'const a = 1;' },
    ]);
  });

  it('returns no steps without code blocks', () => {
    expect(parseMagicMoveSteps('just text')).toEqual([]);
  });
});
