import { SlideParser } from '../src/services/SlideParser';
import { SlideLayout } from '../src/constants';
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

    it('should not render document frontmatter as content when followed by a slide delimiter', () => {
      const markdown = `---
theme: default
---

---
layout: intro
---

# One
`;
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(2);
      expect(slides[0].content).toBe('');
      expect(slides[0].frontmatter.theme).toBe('default');
      expect(slides[1].content).toBe('# One');
      expect(slides[1].frontmatter.layout).toBe('intro');
      expect(slides[1].frontmatter.theme).toBe('default');
    });

    it('should keep quoted and nested document frontmatter values when followed by a slide delimiter', () => {
      const markdown = `---
theme: default
footer: "{{crntSlideIdx}} / {{totalSlides}}"
custom:
  color: red
---
---
layout: intro
---

# One
`;
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(2);
      expect(slides[0].content).toBe('');
      expect(slides[0].frontmatter.footer).toBe('{{crntSlideIdx}} / {{totalSlides}}');
      expect(slides[0].frontmatter.custom).toEqual({ color: 'red' });
      expect(slides[1].frontmatter.footer).toBe('{{crntSlideIdx}} / {{totalSlides}}');
    });

    it('should parse frontmatter of a slide that follows a separator', () => {
      const markdown = `# One

---
layout: section
title: "Part: two"
---

# Two
`;
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(2);
      expect(slides[1].content).toBe('# Two');
      expect(slides[1].frontmatter.layout).toBe('section');
      expect(slides[1].frontmatter.title).toBe('Part: two');
    });

    it('should treat --- followed by a "Word:" line as a separator when the block is not YAML', () => {
      const markdown = `# One

---
Note: remember this

# Two

Some text

---

# Three
`;
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.map((slide) => slide.content)).toEqual([
        '# One',
        'Note: remember this\n\n# Two\n\nSome text',
        '# Three',
      ]);
      expect(slides[2].frontmatter.Note).toBeUndefined();
    });

    it('should not swallow a slide when the content between separators is valid YAML', () => {
      const markdown = '# One\n\n---\nNote: remember this\n\n# Two\n\n---\n\n# Three';
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.map((slide) => slide.content)).toEqual([
        '# One',
        'Note: remember this\n\n# Two',
        '# Three',
      ]);
      expect(slides[1].frontmatter.Note).toBeUndefined();
      expect(slides[2].frontmatter.Note).toBeUndefined();
    });

    it('should treat --- followed by a "Word:" line as a separator when no closing --- follows', () => {
      const markdown = '# One\n\n---\nNote: the last slide';
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.map((slide) => slide.content)).toEqual(['# One', 'Note: the last slide']);
    });

    it('should keep YAML comments in slide frontmatter', () => {
      const markdown = `# One

---
layout: section
# transition: fadeIn
---

# Two
`;
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(2);
      expect(slides[1].content).toBe('# Two');
      expect(slides[1].frontmatter.layout).toBe('section');
    });

    it('should not split slides on --- inside a backtick code block', () => {
      const markdown = '# One\n\n```md\n---\n# not a slide\n```\n\n---\n\n# Two';
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.map((slide) => slide.content)).toEqual([
        '# One\n\n```md\n---\n# not a slide\n```',
        '# Two',
      ]);
    });

    it('should not split slides on --- inside a tilde code block', () => {
      const markdown = '# One\n\n~~~md\n---\n# not a slide\n~~~';
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(1);
      expect(slides[0].content).toBe(markdown);
    });

    it('should only close a code block with the same fence character and length', () => {
      const markdown = '# One\n\n````md\n```\n~~~\n---\n````\n\n---\n\n# Two';
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.map((slide) => slide.content)).toEqual([
        '# One\n\n````md\n```\n~~~\n---\n````',
        '# Two',
      ]);
    });

    it('should not treat a scalar document frontmatter block as frontmatter', () => {
      const markdown = '---\njust some text\n---\n\n# One';
      const parser = new SlideParser();
      const slides = parser.parseSlides(markdown);

      expect(slides.map((slide) => slide.content)).toEqual(['just some text', '# One']);
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

  describe('slidesToMarkdown', () => {
    it('should write frontmatter values that parse back to the same values', () => {
      const parser = new SlideParser();
      const markdown = parser.slidesToMarkdown([
        {
          content: '# One',
          rawContent: '# One',
          index: 0,
          frontmatter: {
            layout: SlideLayout.Intro,
            footer: '{{crntSlideIdx}} / {{totalSlides}}',
            custom: { color: 'red' },
          },
        },
        {
          content: '# Two',
          rawContent: '# Two',
          index: 1,
          frontmatter: { title: 'Step: two' },
        },
      ]);

      const slides = parser.parseSlides(markdown);

      expect(slides.length).toBe(2);
      expect(slides[0].content).toBe('# One');
      expect(slides[0].frontmatter.footer).toBe('{{crntSlideIdx}} / {{totalSlides}}');
      expect(slides[0].frontmatter.custom).toEqual({ color: 'red' });
      expect(slides[1].content).toBe('# Two');
      expect(slides[1].frontmatter.title).toBe('Step: two');
    });

    it('should write the speaker notes back as a notes block', () => {
      const parser = new SlideParser();
      const markdown = parser.slidesToMarkdown([
        { content: '# One', rawContent: '# One', index: 0, frontmatter: {}, notes: 'Say hi' },
        { content: '# Two', rawContent: '# Two', index: 1, frontmatter: {} },
      ]);

      const slides = parser.parseSlides(markdown);

      expect(slides.map((slide) => slide.content)).toEqual(['# One', '# Two']);
      expect(slides[0].notes).toBe('Say hi');
      expect(slides[1].notes).toBeUndefined();
    });
  });

  describe('speaker notes', () => {
    it('should move the notes block out of the slide content', () => {
      const markdown = `# Why Demo Time

- Point one

<!-- notes
Mention the conference from last year.
Pause for questions here.
-->

---

# Next`;
      const slides = new SlideParser().parseSlides(markdown);

      expect(slides.length).toBe(2);
      expect(slides[0].content).toBe('# Why Demo Time\n\n- Point one');
      expect(slides[0].rawContent).not.toContain('notes');
      expect(slides[0].notes).toBe(
        'Mention the conference from last year.\nPause for questions here.',
      );
      expect(slides[1].notes).toBeUndefined();
    });

    it('should keep a --- in the notes in the same slide', () => {
      const markdown = `# One

<!-- notes
First part

---

Second part
-->

---

# Two`;
      const slides = new SlideParser().parseSlides(markdown);

      expect(slides.map((slide) => slide.content)).toEqual(['# One', '# Two']);
      expect(slides[0].notes).toBe('First part\n\n---\n\nSecond part');
    });

    it('should support single line notes and combine multiple blocks', () => {
      const markdown = `# One
<!-- notes Say hello -->
Some text
<!--notes
  Indented
    more
-->`;
      const slides = new SlideParser().parseSlides(markdown);

      expect(slides[0].content).toBe('# One\nSome text');
      expect(slides[0].notes).toBe('Say hello\n\nIndented\n  more');
    });

    it('should ignore regular comments, notes in code blocks and unclosed blocks', () => {
      const markdown = `# One

<!-- just a comment -->

\`\`\`html
<!-- notes
not notes
-->
\`\`\`

---

# Two

<!-- notes
never closed`;
      const slides = new SlideParser().parseSlides(markdown);

      expect(slides.length).toBe(2);
      expect(slides[0].notes).toBeUndefined();
      expect(slides[0].content).toContain('<!-- just a comment -->');
      expect(slides[0].content).toContain('not notes');
      expect(slides[1].notes).toBeUndefined();
      expect(slides[1].content).toContain('never closed');
    });

    it('should keep a slide that only has notes', () => {
      const markdown = `# One

---

<!-- notes
Talk over a blank slide
-->

---

# Three`;
      const slides = new SlideParser().parseSlides(markdown);

      expect(slides.length).toBe(3);
      expect(slides[1].content).toBe('');
      expect(slides[1].notes).toBe('Talk over a blank slide');
    });

    it('should return the lines of the notes blocks and the end of each slide', () => {
      const markdown = `---
theme: default
---

# One

<!-- notes
Hello
-->

---
layout: section
---

# Two
<!-- notes Bye -->
`;
      const parser = new SlideParser();
      const locations = parser.getSlideLocations(markdown);

      expect(locations[0].notes).toEqual([{ start: 6, end: 8 }]);
      expect(locations[0].end).toBe(9);
      expect(locations[1].notes).toEqual([{ start: 15, end: 15 }]);
      expect(locations[1].end).toBe(16);
    });
  });
});
