import { SlideParser } from '../src/services/SlideParser';
import { FrontMatterParser } from '../src/services/FrontMatterParser';
import { describe, it, expect } from '@jest/globals';

describe('SlideParser', () => {
  describe('parseSlides', () => {
    it('should return one slide for markdown with only frontmatter and content', () => {
      const markdown = `---
theme: monomi
---

# The end

`;
      
      // Debug the frontmatter parsing first
      const { frontmatter, remainingContent } = FrontMatterParser.extractFrontmatter(markdown);
      console.log('DEBUG FrontMatter - frontmatter:', JSON.stringify(frontmatter));
      console.log('DEBUG FrontMatter - remainingContent:', JSON.stringify(remainingContent));
      console.log('DEBUG FrontMatter - starts with ---:', remainingContent.trimStart().startsWith('---'));

      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      console.log('DEBUG - Number of slides:', slides.length);
      console.log('DEBUG - Slides:', JSON.stringify(slides, null, 2));

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

      console.log('DEBUG no trailing - Number of slides:', slides.length);
      console.log('DEBUG no trailing - Slides:', JSON.stringify(slides, null, 2));

      expect(slides.length).toBe(1);
      expect(slides[0].content).toBe('# The end');
      expect(slides[0].frontmatter.theme).toBe('monomi');
    });

    it('should return one slide when --- has no newline after it', () => {
      // This tests the case where the markdown ends directly after the closing ---
      // without a trailing newline after the frontmatter closing delimiter
      const markdown = "---\ntheme: monomi\n---\n# The end\n";
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      console.log('DEBUG no newline after --- - Number of slides:', slides.length);
      console.log('DEBUG no newline after --- - Slides:', JSON.stringify(slides, null, 2));

      expect(slides.length).toBe(1);
      expect(slides[0].content).toBe('# The end');
      expect(slides[0].frontmatter.theme).toBe('monomi');
    });

    it('should return one slide for minimal slide markdown', () => {
      // This is the exact case from the issue
      const markdown = "---\ntheme: monomi\n---\n\n# The end\n\n";
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      console.log('DEBUG minimal - Number of slides:', slides.length);
      console.log('DEBUG minimal - Slides:', JSON.stringify(slides, null, 2));

      expect(slides.length).toBe(1);
    });

    it('should return one slide when frontmatter closing has no newline after', () => {
      // If the closing --- has no trailing newline the FrontMatterParser regex won't match
      const markdown = "---\ntheme: monomi\n---";
      
      // Debug the frontmatter parsing
      const { frontmatter, remainingContent } = FrontMatterParser.extractFrontmatter(markdown);
      console.log('DEBUG edge - frontmatter:', JSON.stringify(frontmatter));
      console.log('DEBUG edge - remainingContent:', JSON.stringify(remainingContent));
      console.log('DEBUG edge - remainingContent is falsy:', !remainingContent);
      console.log('DEBUG edge - processedMarkdown will be:', remainingContent || markdown);

      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      console.log('DEBUG no content after frontmatter - Number of slides:', slides.length);
      console.log('DEBUG no content after frontmatter - Slides:', JSON.stringify(slides, null, 2));

      // This test exposes that when frontmatter regex doesn't match, 
      // the whole thing is treated as content. This is a known limitation.
      expect(slides.length).toBe(1);
    });

    it('should return one slide when frontmatter is followed by empty content', () => {
      // When frontmatter ends with ---\n and there's no content after
      const markdown = "---\ntheme: monomi\n---\n";
      
      // Debug the frontmatter parsing
      const { frontmatter, remainingContent } = FrontMatterParser.extractFrontmatter(markdown);
      console.log('DEBUG empty content - frontmatter:', JSON.stringify(frontmatter));
      console.log('DEBUG empty content - remainingContent:', JSON.stringify(remainingContent));
      console.log('DEBUG empty content - remainingContent is truthy:', !!remainingContent);
      console.log('DEBUG empty content - remainingContent starts with ---:', remainingContent.trimStart().startsWith('---'));

      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      console.log('DEBUG empty content - Number of slides:', slides.length);
      console.log('DEBUG empty content - Slides:', JSON.stringify(slides, null, 2));

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
