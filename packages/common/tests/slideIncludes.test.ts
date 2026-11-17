import { describe, it, expect } from '@jest/globals';
import { SlideParser } from '../src/services/SlideParser';
import { collectSlideIncludes, getSlideIncludeCycle } from '../src/services/SlideIncludes';
import {
  getSlideFileIndex,
  getSlideIndexForSource,
  isIncludedSlide,
  normalizeSlidePath,
  resolveIncludedCodeFilePaths,
  resolveSlideIncludePath,
} from '../src/utils/slideIncludes';
import { SlideIncludes } from '../src/models';

const MAIN = '.demo/slides/main.md';

const parse = (markdown: string, files: Record<string, string | undefined>) =>
  new SlideParser({ includes: { filePath: MAIN, files } }).parseSlides(markdown);

describe('resolveSlideIncludePath', () => {
  it('resolves a path relative to the file', () => {
    expect(resolveSlideIncludePath(MAIN, './about.md')).toBe('.demo/slides/about.md');
    expect(resolveSlideIncludePath(MAIN, 'about.md')).toBe('.demo/slides/about.md');
    expect(resolveSlideIncludePath(MAIN, '../shared/about.md')).toBe('.demo/shared/about.md');
  });

  it('resolves a path that starts with / relative to the workspace folder', () => {
    expect(resolveSlideIncludePath(MAIN, '/shared/about.md')).toBe('shared/about.md');
    expect(resolveSlideIncludePath('/.demo/slides/main.md', '../x.md')).toBe('.demo/x.md');
  });

  it('does not resolve paths outside the workspace folder or URLs', () => {
    expect(resolveSlideIncludePath(MAIN, '../../../outside.md')).toBeUndefined();
    expect(resolveSlideIncludePath(MAIN, 'https://example.com/slides.md')).toBeUndefined();
    expect(resolveSlideIncludePath(MAIN, ' ')).toBeUndefined();
  });

  it('normalizes Windows paths', () => {
    expect(normalizeSlidePath('.\\.demo\\slides\\..\\x.md')).toBe('.demo/x.md');
    expect(resolveSlideIncludePath(MAIN, '..\\shared\\a.md')).toBe('.demo/shared/a.md');
  });
});

describe('resolveIncludedCodeFilePaths', () => {
  it('makes relative code file paths relative to the workspace folder', () => {
    const content = '```ts file="./app.ts#L1-2" {1}\n```\n\n```ts file="src/b.ts"\n```';
    expect(resolveIncludedCodeFilePaths(content, '.demo/shared/about.md')).toBe(
      '```ts file="/.demo/shared/app.ts#L1-2" {1}\n```\n\n```ts file="src/b.ts"\n```',
    );
  });
});

describe('SlideParser with includes', () => {
  it('replaces a slide with src by the slides of the file', () => {
    const slides = parse(
      `# One

---
src: ../shared/about.md
---

---

# Last`,
      { '.demo/shared/about.md': '# About\n\n---\n\n# Contact' },
    );

    expect(slides.map((slide) => slide.content)).toEqual([
      '# One',
      '# About',
      '# Contact',
      '# Last',
    ]);
    expect(slides.map((slide) => slide.index)).toEqual([0, 1, 2, 3]);
    expect(slides.map((slide) => slide.source)).toEqual([
      { path: MAIN, index: 0 },
      { path: '.demo/shared/about.md', index: 0, srcIndex: 1 },
      { path: '.demo/shared/about.md', index: 1, srcIndex: 1 },
      { path: MAIN, index: 2 },
    ]);
    expect(slides[1].frontmatter.src).toBeUndefined();
  });

  it('keeps the front matter of the included slides, and the theme of the including file wins', () => {
    const slides = parse(
      `---
theme: monomi
header: Main header
---

# One

---
src: /shared/about.md
---
`,
      {
        'shared/about.md': `---
theme: frost
layout: intro
header: About header
---

# About

---
layout: section
---

# Section`,
      },
    );

    expect(slides[1].frontmatter).toMatchObject({
      theme: 'monomi',
      layout: 'intro',
      header: 'About header',
    });
    expect(slides[2].frontmatter).toMatchObject({
      theme: 'monomi',
      layout: 'section',
      header: 'About header',
    });
  });

  it('applies the other properties of the src slide to every included slide', () => {
    const slides = parse('# One\n\n---\nsrc: a.md\nhide: true\n---\n', {
      '.demo/slides/a.md': '# A\n\n---\n\n# B',
    });

    expect(slides.map((slide) => slide.frontmatter.hide)).toEqual([undefined, true, true]);
  });

  it('includes the files that an included file includes', () => {
    const slides = parse('---\nsrc: a.md\n---\n', {
      '.demo/slides/a.md': '# A\n\n---\nsrc: ../shared/b.md\n---\n',
      '.demo/shared/b.md': '# B',
    });

    expect(slides.map((slide) => slide.content)).toEqual(['# A', '# B']);
    expect(slides.map((slide) => slide.source)).toEqual([
      { path: '.demo/slides/a.md', index: 0, srcIndex: 0 },
      { path: '.demo/shared/b.md', index: 0, srcIndex: 0 },
    ]);
    expect(slides[0].frontmatter.src).toBeUndefined();
  });

  it('shows an error slide for a missing file and an include cycle', () => {
    const slides = parse('# One\n\n---\nsrc: missing.md\n---\n\n---\nsrc: a.md\n---\n', {
      '.demo/slides/missing.md': undefined,
      '.demo/slides/a.md': '# A\n\n---\nsrc: main.md\n---\n',
    });

    expect(slides).toHaveLength(4);
    expect(slides[1].content).toContain('File not found: .demo/slides/missing.md');
    expect(slides[2].content).toBe('# A');
    expect(slides[3].content).toContain(
      'The files include each other: .demo/slides/main.md → .demo/slides/a.md → .demo/slides/main.md',
    );
    expect(slides[3].source).toEqual({ path: '.demo/slides/a.md', index: 1, srcIndex: 2 });
  });

  it('resolves relative code file paths of included slides', () => {
    const slides = parse('---\nsrc: ../shared/code.md\n---\n', {
      '.demo/shared/code.md': '```ts file="./app.ts"\n```',
    });

    expect(slides[0].content).toBe('```ts file="/.demo/shared/app.ts"\n```');
  });

  it('keeps a slide with src without the includes option', () => {
    const slides = new SlideParser().parseSlides('# One\n\n---\nsrc: a.md\n---\n');

    expect(slides).toHaveLength(2);
    expect(slides[1].frontmatter.src).toBe('a.md');
    expect(slides[1].source).toBeUndefined();
  });

  it('keeps the slide locations of the file itself', () => {
    const markdown = '# One\n\n---\nsrc: a.md\n---\n\n---\n\n# Two';
    const parser = new SlideParser({
      includes: { filePath: MAIN, files: { '.demo/slides/a.md': '# A\n\n---\n\n# B' } },
    });

    expect(parser.getSlideLocations(markdown)).toHaveLength(3);
  });
});

describe('getSlideIndexForSource', () => {
  const slides = parse('# One\n\n---\nsrc: a.md\n---\n\n---\n\n# Two', {
    '.demo/slides/a.md': '# A\n\n---\n\n# B',
  });

  it('finds the slides of the file and of the included files', () => {
    expect(getSlideIndexForSource(slides, MAIN, { path: MAIN, index: 0 })).toBe(0);
    expect(getSlideIndexForSource(slides, MAIN, { path: MAIN, index: 1 })).toBe(1);
    expect(getSlideIndexForSource(slides, MAIN, { path: MAIN, index: 1 }, true)).toBe(2);
    expect(getSlideIndexForSource(slides, MAIN, { path: MAIN, index: 2 })).toBe(3);
    expect(getSlideIndexForSource(slides, MAIN, { path: '/.demo/slides/a.md', index: 1 })).toBe(2);
  });

  it('gets the position of a new slide after the last slide', () => {
    expect(getSlideIndexForSource(slides, MAIN, { path: MAIN, index: 3 })).toBe(4);
  });

  it('does not find slides of other files', () => {
    expect(getSlideIndexForSource(slides, MAIN, { path: 'other.md', index: 0 })).toBeUndefined();
  });

  it('uses the index of the file without includes', () => {
    const plain = new SlideParser().parseSlides('# One\n\n---\n\n# Two');
    expect(getSlideIndexForSource(plain, MAIN, { path: MAIN, index: 1 })).toBe(1);
  });

  it('gets the index of a slide in its file', () => {
    expect(slides.map(getSlideFileIndex)).toEqual([0, 1, 1, 2]);
    expect(slides.map((slide) => isIncludedSlide(slide))).toEqual([false, true, true, false]);
  });
});

describe('collectSlideIncludes', () => {
  it('reads the included files and the files they include', async () => {
    const files: Record<string, string> = {
      '.demo/slides/a.md': '---\nsrc: /shared/b.md\n---\n',
      'shared/b.md': '---\nsrc: ../.demo/slides/main.md\n---\n',
    };
    const read: string[] = [];
    const includes = await collectSlideIncludes(
      '---\nsrc: a.md\n---\n\n---\nsrc: c.md\n---\n',
      `/${MAIN}`,
      async (path) => {
        read.push(path);
        return files[path];
      },
    );

    expect(includes.filePath).toBe(MAIN);
    expect(includes.files).toEqual({
      '.demo/slides/a.md': files['.demo/slides/a.md'],
      '.demo/slides/c.md': undefined,
      'shared/b.md': files['shared/b.md'],
    });
    // The file itself is not read again
    expect(read).not.toContain(MAIN);
  });

  it('does not read files without includes', async () => {
    const includes = await collectSlideIncludes('# One', MAIN, async () => {
      throw new Error('Should not read');
    });
    expect(includes.files).toEqual({});
  });
});

describe('getSlideIncludeCycle', () => {
  const includes: SlideIncludes = {
    filePath: MAIN,
    files: {
      '.demo/slides/a.md': '---\nsrc: /shared/b.md\n---\n',
      'shared/b.md': '---\nsrc: /.demo/slides/main.md\n---\n',
      '.demo/slides/c.md': '# C',
    },
  };

  it('finds the files that include the file again', () => {
    expect(getSlideIncludeCycle(includes, '.demo/slides/a.md')).toEqual([
      MAIN,
      '.demo/slides/a.md',
      'shared/b.md',
      MAIN,
    ]);
    expect(getSlideIncludeCycle(includes, MAIN)).toEqual([MAIN, MAIN]);
  });

  it('has no cycle for a file that does not include the file', () => {
    expect(getSlideIncludeCycle(includes, '.demo/slides/c.md')).toBeUndefined();
  });
});
