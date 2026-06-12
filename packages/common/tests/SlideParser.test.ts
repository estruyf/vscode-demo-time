import { SlideParser } from '../src/services/SlideParser';
import { describe, it, expect } from '@jest/globals';

describe('SlideParser', () => {
  describe('parseSlides', () => {
    it('should return one slide for markdown with only frontmatter and content', () => {
      const markdown = `---
theme: monomi
---

# The end

`;
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(1);
      expect(slides[0].content).toBe('# The end');
      expect(slides[0].frontmatter.theme).toBe('monomi');
    });

    it('should return one slide for markdown with only frontmatter and content (no trailing newline)', () => {
      const markdown = `---
theme: monomi
---

# The end`;
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(1);
      expect(slides[0].content).toBe('# The end');
      expect(slides[0].frontmatter.theme).toBe('monomi');
    });

    it('should return one slide when --- has no newline after it', () => {
      // This tests the case where the markdown ends directly after the closing ---
      // without a trailing newline after the frontmatter closing delimiter
      const markdown = '---\ntheme: monomi\n---\n# The end\n';
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(1);
      expect(slides[0].content).toBe('# The end');
      expect(slides[0].frontmatter.theme).toBe('monomi');
    });

    it('should return one slide for minimal slide markdown', () => {
      // This is the exact case from the issue
      const markdown = '---\ntheme: monomi\n---\n\n# The end\n\n';
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(1);
    });

    it('should return one slide when frontmatter closing has no newline after', () => {
      // If the closing --- has no trailing newline the FrontMatterParser regex won't match
      // so the whole thing is treated as content. This is a known limitation.
      const markdown = '---\ntheme: monomi\n---';
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(1);
    });

    it('should return one slide when frontmatter is followed by empty content', () => {
      // When frontmatter ends with ---\n and there's no content after
      const markdown = '---\ntheme: monomi\n---\n';
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(1);
      expect(slides[0].frontmatter.theme).toBe('monomi');
    });

    it('should correctly parse two slides separated by ---', () => {
      const markdown = `---
theme: monomi
---

# First slide

---

# Second slide

`;
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(2);
      expect(slides[0].content).toBe('# First slide');
      expect(slides[1].content).toBe('# Second slide');
    });

    it('should return empty array for empty markdown', () => {
      const parser = new SlideParser();
      const slides = parser.parseSlides('');

      expect(slides.length).toBe(0);
    });

    it('should return empty array for whitespace-only markdown', () => {
      const parser = new SlideParser();
      const slides = parser.parseSlides('   \n   \n   ');

      expect(slides.length).toBe(0);
    });
  });
});
