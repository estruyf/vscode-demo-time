import { getSlideActionTags } from '../src/utils/getSlideActionTags';
import { describe, it, expect } from '@jest/globals';

describe('getSlideActionTags', () => {
  it('returns the id and the position of its value', () => {
    const content = [
      '# Slide',
      '',
      'Try it: <dt-action id="run-tests">Run the tests</dt-action>',
    ].join('\n');

    const tags = getSlideActionTags(content);

    expect(tags).toEqual([{ id: 'run-tests', line: 2, start: 23, end: 32 }]);
    expect(content.split('\n')[2].slice(tags[0].start, tags[0].end)).toBe('run-tests');
  });

  it('supports single quotes, unquoted values and other attributes', () => {
    const content = [
      `<dt-action variant="link" id='open-terminal'>Open</dt-action>`,
      `<dt-action id=intro>Intro</dt-action>`,
    ].join('\n');

    const lines = content.split('\n');
    const tags = getSlideActionTags(content);

    expect(tags.map((tag) => tag.id)).toEqual(['open-terminal', 'intro']);
    tags.forEach((tag) => {
      expect(lines[tag.line].slice(tag.start, tag.end)).toBe(tag.id);
    });
  });

  it('finds multiple tags on one line', () => {
    const tags = getSlideActionTags(
      '<dt-action id="one">One</dt-action> | <dt-action id="two">Two</dt-action>',
    );

    expect(tags.map((tag) => tag.id)).toEqual(['one', 'two']);
  });

  it('reports the tag name when the id is missing or empty', () => {
    const content = ['<dt-action>Run</dt-action>', '<dt-action id="  ">Run</dt-action>'].join('\n');

    const tags = getSlideActionTags(content);

    expect(tags).toEqual([
      { line: 0, start: 1, end: 10 },
      { line: 1, start: 1, end: 10 },
    ]);
  });

  it('does not treat data-id as the id', () => {
    const tags = getSlideActionTags('<dt-action data-id="nope">Run</dt-action>');

    expect(tags).toEqual([{ line: 0, start: 1, end: 10 }]);
  });

  it('skips tags in code blocks and inline code', () => {
    const content = [
      '```html',
      '<dt-action id="in-code-block">Run</dt-action>',
      '```',
      'Use `<dt-action id="inline">` to run a scene',
      '~~~',
      '<dt-action id="tilde">Run</dt-action>',
      '~~~',
      '<dt-action id="real">Run</dt-action>',
    ].join('\n');

    expect(getSlideActionTags(content).map((tag) => tag.id)).toEqual(['real']);
  });
});
