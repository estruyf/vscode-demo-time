import { describe, it, expect } from '@jest/globals';
import { SlideParser } from '@demotime/common';
import {
  deleteSlide,
  duplicateSlide,
  insertSlide,
  moveSlide,
  setSlideProperty,
} from '../src/utils/slideEdits';

const parse = (markdown: string) => new SlideParser().parseSlides(markdown);

const titles = (markdown: string) => parse(markdown).map((slide) => slide.content.split('\n')[0]);

const layouts = (markdown: string) => parse(markdown).map((slide) => slide.frontmatter.layout);

const deck = `---
theme: default
---

# One

---

# Two

---
layout: section
---

# Three
`;

describe('setSlideProperty', () => {
  it('adds the property to the document frontmatter of the first slide', () => {
    const result = setSlideProperty(deck, 0, 'layout', 'intro')!;
    expect(result.startsWith('---\ntheme: default\nlayout: intro\n---')).toBe(true);
    expect(layouts(result)).toEqual(['intro', 'default', 'section']);
  });

  it('turns the separator of a slide without frontmatter into frontmatter', () => {
    const result = setSlideProperty(deck, 1, 'layout', 'center')!;
    expect(result).toContain('# One\n\n---\nlayout: center\n---\n\n# Two');
    expect(layouts(result)).toEqual(['default', 'center', 'section']);
    expect(titles(result)).toEqual(['# One', '# Two', '# Three']);
  });

  it('replaces the property in the frontmatter of a slide', () => {
    const result = setSlideProperty(deck, 2, 'layout', 'quote')!;
    expect(result).toContain('---\nlayout: quote\n---\n\n# Three');
    expect(result).not.toContain('section');
  });

  it('adds frontmatter to the first slide of a file without frontmatter', () => {
    const result = setSlideProperty('# One\n\n---\n\n# Two', 0, 'layout', 'intro')!;
    expect(result).toBe('---\nlayout: intro\n---\n\n# One\n\n---\n\n# Two');
  });

  it('returns undefined for a slide that does not exist', () => {
    expect(setSlideProperty(deck, 5, 'layout', 'intro')).toBeUndefined();
  });
});

describe('insertSlide', () => {
  it('adds a slide between two slides', () => {
    const result = insertSlide(deck, 0, '# New')!;
    expect(titles(result)).toEqual(['# One', '# New', '# Two', '# Three']);
    expect(result).toContain('# One\n\n---\n\n# New\n\n---\n\n# Two');
  });

  it('adds a slide after the last slide and keeps the final newline', () => {
    const result = insertSlide(deck, 2, '# New')!;
    expect(titles(result)).toEqual(['# One', '# Two', '# Three', '# New']);
    expect(result.endsWith('# Three\n\n---\n\n# New\n')).toBe(true);
  });

  it('adds a slide to a file without a final newline', () => {
    expect(insertSlide('# One', 0, '# New')).toBe('# One\n\n---\n\n# New');
  });
});

describe('duplicateSlide', () => {
  it('copies a slide with frontmatter', () => {
    const result = duplicateSlide(deck, 2)!;
    expect(titles(result)).toEqual(['# One', '# Two', '# Three', '# Three']);
    expect(layouts(result)).toEqual(['default', 'default', 'section', 'section']);
  });

  it('copies a slide without frontmatter', () => {
    const result = duplicateSlide(deck, 1)!;
    expect(titles(result)).toEqual(['# One', '# Two', '# Two', '# Three']);
  });

  it('copies the first slide with the document frontmatter', () => {
    const markdown = '---\ntheme: default\nlayout: intro\n---\n\n# One\n\n---\n\n# Two';
    const result = duplicateSlide(markdown, 0)!;
    expect(titles(result)).toEqual(['# One', '# One', '# Two']);
    expect(layouts(result)).toEqual(['intro', 'intro', 'default']);
  });

  it('copies the first slide of a file without frontmatter', () => {
    const result = duplicateSlide('# One\n\n---\n\n# Two', 0)!;
    expect(result).toBe('# One\n\n---\n\n# One\n\n---\n\n# Two');
  });

  it('keeps the speaker notes of the slide', () => {
    const markdown = '# One\n\n<!-- notes\nSay hi\n-->\n\n---\n\n# Two';
    const result = duplicateSlide(markdown, 0)!;
    expect(parse(result).map((slide) => (slide as { notes?: string }).notes)).toEqual([
      'Say hi',
      'Say hi',
      undefined,
    ]);
  });
});

describe('deleteSlide', () => {
  it('removes a slide in the middle', () => {
    const result = deleteSlide(deck, 1)!;
    expect(titles(result)).toEqual(['# One', '# Three']);
    expect(result).toContain('# One\n\n---\nlayout: section\n---');
  });

  it('removes the last slide and keeps the final newline', () => {
    const result = deleteSlide(deck, 2)!;
    expect(result).toBe('---\ntheme: default\n---\n\n# One\n\n---\n\n# Two\n');
  });

  it('removes the first slide and keeps the document frontmatter', () => {
    const result = deleteSlide(deck, 0)!;
    expect(result.startsWith('---\ntheme: default\n---\n\n# Two\n')).toBe(true);
    expect(titles(result)).toEqual(['# Two', '# Three']);
  });

  it('removes the first slide of a file without frontmatter', () => {
    expect(deleteSlide('# One\n\n---\n\n# Two', 0)).toBe('# Two');
  });

  it('removes the properties of the first slide from the document frontmatter', () => {
    const markdown =
      '---\ntheme: default\nlayout: intro\nimage: |\n  /a.png\n---\n\n# One\n\n---\n\n# Two';
    expect(deleteSlide(markdown, 0)).toBe('---\ntheme: default\n---\n\n# Two');
  });

  it('removes the document frontmatter when it only has properties of the first slide', () => {
    const markdown = '---\nlayout: intro\n---\n\n# One\n\n---\n\n# Two\n\n---\n\n# Three';
    expect(deleteSlide(markdown, 0)).toBe('# Two\n\n---\n\n# Three');
  });

  it('does not remove the first slide when the next slide would get other properties', () => {
    const markdown = '---\ntheme: default\n---\n\n# One\n\n---\nlayout: section\n---\n\n# Two';
    expect(deleteSlide(markdown, 0)).toBeUndefined();
  });

  it('does not remove the only slide', () => {
    expect(deleteSlide('# One', 0)).toBeUndefined();
  });
});

describe('moveSlide', () => {
  const deck4 = `---
theme: default
---

# One

---

# Two

---

# Three

---
layout: section
---

# Four
`;

  it('moves a slide in the middle and keeps the document frontmatter', () => {
    const result = moveSlide(deck4, 1, 2)!;
    expect(titles(result)).toEqual(['# One', '# Three', '# Two', '# Four']);
    expect(result.startsWith('---\ntheme: default\n---\n\n# One')).toBe(true);
    expect(layouts(result)).toEqual(['default', 'default', 'default', 'section']);
  });

  it('moves the last slide up with its own frontmatter and keeps the final newline', () => {
    expect(moveSlide(deck4, 3, 1)).toBe(
      '---\ntheme: default\n---\n\n# One\n\n---\nlayout: section\n---\n\n# Four\n\n---\n\n# Two\n\n---\n\n# Three\n',
    );
  });

  it('moves the properties of the first slide along when it moves down', () => {
    const markdown =
      '---\ntheme: default\nlayout: intro\nhide: true\n---\n\n# One\n\n---\n\n# Two\n';
    expect(moveSlide(markdown, 0, 1)).toBe(
      '---\ntheme: default\n---\n\n# Two\n\n---\nlayout: intro\nhide: true\n---\n\n# One\n',
    );
  });

  it('merges the frontmatter of a slide that moves to the top in the document frontmatter', () => {
    const markdown =
      '---\ntheme: default\nlayout: intro\n---\n\n# One\n\n---\nlayout: section\n---\n\n# Two';
    expect(moveSlide(markdown, 1, 0)).toBe(
      '---\ntheme: default\nlayout: section\n---\n\n# Two\n\n---\nlayout: intro\n---\n\n# One',
    );
  });

  it('removes the document frontmatter when only first slide properties remain', () => {
    const markdown = '---\nlayout: intro\n---\n\n# One\n\n---\n\n# Two';
    expect(moveSlide(markdown, 0, 1)).toBe('# Two\n\n---\nlayout: intro\n---\n\n# One');
  });

  it('moves slides of a file without frontmatter', () => {
    expect(moveSlide('# One\n\n---\n\n# Two', 0, 1)).toBe('# Two\n\n---\n\n# One');
    expect(moveSlide('# One\n\n---\n\n# Two\n\n---\n\n# Three', 2, 0)).toBe(
      '# Three\n\n---\n\n# One\n\n---\n\n# Two',
    );
  });

  it('refuses a move that would apply the properties of a slide to all slides', () => {
    const markdown =
      '---\ntheme: default\n---\n\n# One\n\n---\ntransition: fadeIn\n---\n\n# Two\n\n---\n\n# Three';
    expect(moveSlide(markdown, 1, 0)).toBeUndefined();
  });

  it('allows a move when the document frontmatter has the same value', () => {
    const markdown =
      '---\ntransition: fadeIn\n---\n\n# One\n\n---\ntransition: fadeIn\n---\n\n# Two';
    expect(moveSlide(markdown, 1, 0)).toBe('---\ntransition: fadeIn\n---\n\n# Two\n\n---\n\n# One');
  });

  it('moves the speaker notes with the slide', () => {
    const result = moveSlide('# One\n\n<!-- notes\nSay hi\n-->\n\n---\n\n# Two', 0, 1)!;
    expect(parse(result).map((slide) => slide.notes)).toEqual([undefined, 'Say hi']);
  });

  it('does not split on a separator in a code block', () => {
    const markdown = '# One\n\n```yaml\n---\nkey: value\n---\n```\n\n---\n\n# Two';
    const result = moveSlide(markdown, 0, 1)!;
    expect(titles(result)).toEqual(['# Two', '# One']);
    expect(result).toContain('```yaml\n---\nkey: value\n---\n```');
  });

  it('keeps the spacing at the positions', () => {
    expect(moveSlide('# One\n\n\n---\n\n# Two\n\n---\n\n# Three', 1, 2)).toBe(
      '# One\n\n\n---\n\n# Three\n\n---\n\n# Two',
    );
  });

  it('keeps the CRLF line endings', () => {
    const result = moveSlide(deck4.replace(/\n/g, '\r\n'), 1, 2)!;
    expect(result).toContain('\r\n');
    expect(/[^\r]\n/.test(result)).toBe(false);
    expect(titles(result)).toEqual(['# One', '# Three', '# Two', '# Four']);
  });

  it('returns the same content when the index does not change', () => {
    expect(moveSlide(deck4, 1, 1)).toBe(deck4);
  });

  it('returns undefined for invalid indexes or a single slide', () => {
    expect(moveSlide(deck4, 0, 5)).toBeUndefined();
    expect(moveSlide(deck4, -1, 0)).toBeUndefined();
    expect(moveSlide('# One', 0, 0)).toBeUndefined();
  });
});
