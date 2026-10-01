import { describe, it, expect } from '@jest/globals';
import { isSlideHidden, SlideParser } from '@demotime/common';
import { setSlideHidden } from '../src/utils/setSlideHidden';

const hiddenSlides = (markdown: string) =>
  new SlideParser().parseSlides(markdown).map((slide) => isSlideHidden(slide));

const titles = (markdown: string) =>
  new SlideParser().parseSlides(markdown).map((slide) => slide.content.split('\n')[0]);

const deck = `---
theme: default
---

# One

---

# Two

---
layout: section
---

# Three`;

describe('setSlideHidden', () => {
  it('adds hide to the document frontmatter of the first slide', () => {
    const result = setSlideHidden(deck, 0, true)!;
    expect(result.startsWith('---\ntheme: default\nhide: true\n---')).toBe(true);
    expect(hiddenSlides(result)).toEqual([true, false, false]);
  });

  it('turns the separator of a slide without frontmatter into frontmatter', () => {
    const result = setSlideHidden(deck, 1, true)!;
    expect(result).toContain('# One\n\n---\nhide: true\n---\n\n# Two');
    expect(hiddenSlides(result)).toEqual([false, true, false]);
    expect(titles(result)).toEqual(['# One', '# Two', '# Three']);
  });

  it('adds hide to the frontmatter of a slide', () => {
    const result = setSlideHidden(deck, 2, true)!;
    expect(result).toContain('---\nlayout: section\nhide: true\n---');
    expect(hiddenSlides(result)).toEqual([false, false, true]);
  });

  it('adds frontmatter to the first slide of a file without frontmatter', () => {
    const result = setSlideHidden('# One\n\n---\n\n# Two', 0, true)!;
    expect(result).toBe('---\nhide: true\n---\n\n# One\n\n---\n\n# Two');
    expect(hiddenSlides(result)).toEqual([true, false]);
  });

  it('restores the original markdown when showing the slide again', () => {
    for (const idx of [0, 1, 2]) {
      const hidden = setSlideHidden(deck, idx, true)!;
      expect(setSlideHidden(hidden, idx, false)).toBe(deck);
    }

    const noFrontmatter = '# One\n\n---\n\n# Two';
    expect(setSlideHidden(setSlideHidden(noFrontmatter, 0, true)!, 0, false)).toBe(noFrontmatter);
  });

  it('replaces hide: false', () => {
    const result = setSlideHidden('# One\n\n---\nhide: false\n---\n\n# Two', 1, true)!;
    expect(result).toBe('# One\n\n---\nhide: true\n---\n\n# Two');
  });

  it('keeps hide: false when removing the frontmatter would change the slides', () => {
    const docOnly = '---\nhide: true\n---\n\n---\nlayout: section\n---\n\n# Two';
    expect(setSlideHidden(docOnly, 0, false)).toBe(
      '---\nhide: false\n---\n\n---\nlayout: section\n---\n\n# Two',
    );

    // Without the block, `title: x` would become the frontmatter of the next slide
    const keyLine = '# One\n\n---\nhide: true\n---\ntitle: x\n---\n\n# Two';
    expect(setSlideHidden(keyLine, 1, false)).toBe(
      '# One\n\n---\nhide: false\n---\ntitle: x\n---\n\n# Two',
    );
  });

  it('removes the frontmatter when a key line after it stays slide content', () => {
    const noteLine = '# One\n\n---\nhide: true\n---\nNote: remember this\n\nMore text';
    expect(setSlideHidden(noteLine, 1, false)).toBe(
      '# One\n\n---\nNote: remember this\n\nMore text',
    );
  });

  it('ignores separators in code blocks', () => {
    const markdown = '# One\n\n```md\n---\n```\n\n---\n\n# Two';
    const result = setSlideHidden(markdown, 1, true)!;
    expect(result).toBe('# One\n\n```md\n---\n```\n\n---\nhide: true\n---\n\n# Two');
    expect(hiddenSlides(result)).toEqual([false, true]);
  });

  it('keeps Windows line endings', () => {
    const result = setSlideHidden('# One\r\n\r\n---\r\n\r\n# Two', 1, true)!;
    expect(result).toBe('# One\r\n\r\n---\r\nhide: true\r\n---\r\n\r\n# Two');
  });

  it('returns the markdown unchanged when the slide already has the state', () => {
    expect(setSlideHidden(deck, 1, false)).toBe(deck);
  });

  it('returns undefined for a slide that does not exist', () => {
    expect(setSlideHidden(deck, 5, true)).toBeUndefined();
  });
});
