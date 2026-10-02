import { describe, it, expect } from '@jest/globals';
import { getSlideIndexAtLine, getSlideSourceLine } from '../src/utils/slideSourceLines';

const deck = [
  '---', // 0
  'theme: default', // 1
  '---', // 2
  '', // 3
  '# One', // 4
  '', // 5
  '---', // 6
  '', // 7
  '# Two', // 8
  '', // 9
  '```md', // 10
  '---', // 11
  '```', // 12
  '', // 13
  '<!-- notes', // 14
  '---', // 15
  '-->', // 16
  '', // 17
  '---', // 18
  'layout: section', // 19
  '---', // 20
  '', // 21
  '# Three', // 22
].join('\n');

describe('getSlideIndexAtLine', () => {
  it('returns the slide that contains the line', () => {
    expect(getSlideIndexAtLine(deck, 0)).toBe(0);
    expect(getSlideIndexAtLine(deck, 4)).toBe(0);
    expect(getSlideIndexAtLine(deck, 5)).toBe(0);
    expect(getSlideIndexAtLine(deck, 6)).toBe(1);
    expect(getSlideIndexAtLine(deck, 8)).toBe(1);
    expect(getSlideIndexAtLine(deck, 19)).toBe(2);
    expect(getSlideIndexAtLine(deck, 22)).toBe(2);
  });

  it('ignores `---` in code blocks and speaker notes', () => {
    expect(getSlideIndexAtLine(deck, 11)).toBe(1);
    expect(getSlideIndexAtLine(deck, 13)).toBe(1);
    expect(getSlideIndexAtLine(deck, 15)).toBe(1);
  });

  it('keeps the last slide after the end of the file', () => {
    expect(getSlideIndexAtLine(deck, 100)).toBe(2);
  });

  it('counts the document frontmatter as its own slide when a slide follows directly', () => {
    const markdown = ['---', 'theme: default', '---', '---', 'layout: intro', '---', '# One'].join(
      '\n',
    );
    expect(getSlideIndexAtLine(markdown, 1)).toBe(0);
    expect(getSlideIndexAtLine(markdown, 4)).toBe(1);
    expect(getSlideIndexAtLine(markdown, 6)).toBe(1);
  });

  it('maps an empty slide that the parser skips to the slide before it', () => {
    const markdown = ['# One', '', '---', '', '---', '', '# Two'].join('\n');
    expect(getSlideIndexAtLine(markdown, 2)).toBe(0);
    expect(getSlideIndexAtLine(markdown, 4)).toBe(1);
    expect(getSlideIndexAtLine(markdown, 6)).toBe(1);
  });

  it('supports CRLF line endings', () => {
    expect(getSlideIndexAtLine(deck.replace(/\n/g, '\r\n'), 8)).toBe(1);
  });

  it('returns undefined for a file without slides', () => {
    expect(getSlideIndexAtLine('', 0)).toBeUndefined();
  });
});

describe('getSlideSourceLine', () => {
  it('returns the first content line of the slide', () => {
    expect(getSlideSourceLine(deck, 0)).toBe(4);
    expect(getSlideSourceLine(deck, 1)).toBe(8);
    expect(getSlideSourceLine(deck, 2)).toBe(22);
  });

  it('returns the first line of a file without frontmatter', () => {
    expect(getSlideSourceLine('# One\n\n---\n\n# Two', 0)).toBe(0);
  });

  it('returns the start of a slide without content', () => {
    const markdown = ['---', 'theme: default', '---', '---', 'layout: intro', '---', '# One'].join(
      '\n',
    );
    expect(getSlideSourceLine(markdown, 0)).toBe(0);
    expect(getSlideSourceLine(markdown, 1)).toBe(6);
  });

  it('maps back to the same slide', () => {
    for (const idx of [0, 1, 2]) {
      expect(getSlideIndexAtLine(deck, getSlideSourceLine(deck, idx) as number)).toBe(idx);
    }
  });

  it('returns undefined for a slide that does not exist', () => {
    expect(getSlideSourceLine(deck, 3)).toBeUndefined();
  });
});
