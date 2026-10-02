import { describe, it, expect } from '@jest/globals';
import { SlideParser } from '@demotime/common';
import { setSlideNotes } from '../src/utils/setSlideNotes';

const parse = (markdown: string) =>
  new SlideParser().parseSlides(markdown).map(({ content, notes }) => ({ content, notes }));

const deck = `---
theme: default
---

# One

---

# Two

<!-- notes
Old notes
-->

---
layout: section
---

# Three
`;

describe('setSlideNotes', () => {
  it('adds a notes block after the content of the first slide', () => {
    const result = setSlideNotes(deck, 0, 'Say hi')!;
    expect(result).toContain('# One\n\n<!-- notes\nSay hi\n-->\n\n---\n\n# Two');
    expect(parse(result)[0]).toEqual({ content: '# One', notes: 'Say hi' });
  });

  it('replaces the notes block of a slide', () => {
    const result = setSlideNotes(deck, 1, 'New notes\n\n---\n\nMore')!;
    expect(result).not.toContain('Old notes');
    expect(parse(result)).toEqual([
      { content: '# One', notes: undefined },
      { content: '# Two', notes: 'New notes\n\n---\n\nMore' },
      { content: '# Three', notes: undefined },
    ]);
  });

  it('removes the notes block when the notes are empty', () => {
    const result = setSlideNotes(deck, 1, '  ')!;
    expect(result).toContain('# Two\n\n---\nlayout: section');
    expect(parse(result)[1]).toEqual({ content: '# Two', notes: undefined });
  });

  it('adds notes to the last slide and a slide with frontmatter', () => {
    const result = setSlideNotes(deck, 2, 'Last one')!;
    expect(result.endsWith('# Three\n\n<!-- notes\nLast one\n-->\n')).toBe(true);
    expect(parse(result)[2]).toEqual({ content: '# Three', notes: 'Last one' });
  });

  it('keeps one notes block when the slide has more than one', () => {
    const markdown = '# One\n<!-- notes First -->\nText\n<!-- notes\nSecond\n-->\n';
    const result = setSlideNotes(markdown, 0, 'Both')!;
    expect(result).toBe('# One\n<!-- notes\nBoth\n-->\nText\n');
  });

  it('escapes a closing comment in the notes', () => {
    const result = setSlideNotes('# One', 0, 'a --> b')!;
    expect(parse(result)[0]).toEqual({ content: '# One', notes: 'a -- > b' });
  });

  it('keeps the line endings of the file', () => {
    const result = setSlideNotes('# One\r\n\r\n---\r\n\r\n# Two\r\n', 0, 'Hi')!;
    expect(result).toBe('# One\r\n\r\n<!-- notes\r\nHi\r\n-->\r\n\r\n---\r\n\r\n# Two\r\n');
  });

  it('returns the same content when the notes did not change', () => {
    expect(setSlideNotes(deck, 1, 'Old notes')).toBe(deck);
  });

  it('returns undefined for a slide that does not exist', () => {
    expect(setSlideNotes(deck, 5, 'Hi')).toBeUndefined();
  });
});
