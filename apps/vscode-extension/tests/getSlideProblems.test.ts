import { describe, it, expect } from '@jest/globals';
import {
  getClosestMatch,
  getSlideProblems,
  SlideProblemsHost,
} from '../src/utils/getSlideProblems';

const host = (files: Record<string, string> = {}, templates: string[] = []): SlideProblemsHost => ({
  fileExists: async (path) => path in files,
  readFile: async (path) => files[path],
  templates,
});

const problems = async (markdown: string, files?: Record<string, string>, templates?: string[]) =>
  (await getSlideProblems(markdown, host(files, templates))).map(
    ({ code, severity, range, fix }) => ({
      code,
      severity,
      line: range.line,
      fix: fix?.text,
    }),
  );

describe('getClosestMatch', () => {
  it('matches a different case', () => {
    expect(getClosestMatch('Autoplay', ['autoplay', 'autoPlay'])).toBe('autoplay');
  });

  it('matches a typo', () => {
    expect(getClosestMatch('transtion', ['theme', 'transition'])).toBe('transition');
    expect(getClosestMatch('two-column', ['two-columns', 'image'])).toBe('two-columns');
  });

  it('does not match unrelated values', () => {
    expect(getClosestMatch('speaker', ['theme', 'transition'])).toBeUndefined();
    expect(getClosestMatch('job', ['jobs'])).toBeUndefined();
  });
});

describe('getSlideProblems', () => {
  it('has no problems for valid slides', async () => {
    const markdown = `---
theme: frost
transition: fadeIn
---

# One

---
layout: image
image: .demo/assets/bg.png
autoFit: true
---

# Two`;
    expect(await problems(markdown, { '.demo/assets/bg.png': '' })).toEqual([]);
  });

  it('suggests a known property for a typo', async () => {
    const markdown = `---
transtion: fadeIn
---

# One`;
    expect(await problems(markdown)).toEqual([
      { code: 'slide-unknown-property', severity: 'warning', line: 1, fix: 'transition' },
    ]);
  });

  it('reports unknown properties that no template reads', async () => {
    const markdown = `---
speaker: Elio
---

# One`;
    expect(await problems(markdown)).toEqual([
      { code: 'slide-unknown-property', severity: 'information', line: 1, fix: undefined },
    ]);
  });

  it('accepts properties that a custom layout, header or footer reads', async () => {
    const markdown = `---
name: Demo Time
footer: "<span>{{name}}</span>"
---

# One

---
customLayout: .demo/layouts/about.hbs
job: Developer
---

# Two

---
company: Contoso
---

# Three`;
    const files = { '.demo/layouts/about.hbs': '<p>{{metadata.job}}</p>{{{content}}}' };
    expect(await problems(markdown, files, ['{{company}}'])).toEqual([]);
  });

  it('reports invalid enum values with a suggestion', async () => {
    const markdown = `---
layout: two-column
theme: dracula
---

# One`;
    expect(await problems(markdown)).toEqual([
      { code: 'slide-invalid-value', severity: 'warning', line: 1, fix: 'two-columns' },
      { code: 'slide-invalid-value', severity: 'warning', line: 2, fix: undefined },
    ]);
  });

  it('reports invalid boolean and number values', async () => {
    const markdown = `---
autoFit: yes please
autoAdvanceAfter: soon
progress: TOP
---

# One`;
    expect(await problems(markdown)).toEqual([
      { code: 'slide-invalid-value', severity: 'warning', line: 1, fix: undefined },
      { code: 'slide-invalid-value', severity: 'warning', line: 2, fix: undefined },
    ]);
  });

  it('reports missing files, but not URLs', async () => {
    const markdown = `---
layout: video
video: .demo/assets/missing.mp4
image: https://example.com/bg.png
customTheme: .demo/theme.css
---

# One

---
layout: animated
svgFile: .demo/assets/missing.svg
customLayout: .demo/layouts/missing.hbs
---

# Two`;
    expect(await problems(markdown, { '.demo/theme.css': '' })).toEqual([
      { code: 'slide-missing-file', severity: 'warning', line: 2, fix: undefined },
      { code: 'slide-missing-file', severity: 'warning', line: 11, fix: undefined },
      { code: 'slide-missing-file', severity: 'error', line: 12, fix: undefined },
    ]);
  });

  it('reports a missing background image, but not colours, gradients or URLs', async () => {
    const markdown = `---
background: .demo/assets/missing.png
---

# One

---
background: 'linear-gradient(135deg, #1e3a8a, #9333ea)'
class: section-break
---

# Two

---
background: "#1e3a8a"
---

# Three

---
background: https://example.com/bg.png
---

# Four`;
    expect(await problems(markdown)).toEqual([
      { code: 'slide-missing-file', severity: 'warning', line: 1, fix: undefined },
    ]);
  });

  it('reports Handlebars errors in custom layouts and inline templates', async () => {
    const markdown = `---
customLayout: .demo/layouts/broken.hbs
header: "{{#if title}}<h1>{{title}}</h1>"
---

# One`;
    const files = {
      '.demo/layouts/broken.hbs': '{{#if metadata.title}}<h1>{{metadata.title}}</h1>',
    };
    expect(await problems(markdown, files)).toEqual([
      { code: 'slide-template-error', severity: 'error', line: 1, fix: undefined },
      { code: 'slide-template-error', severity: 'error', line: 2, fix: undefined },
    ]);
  });

  it('reports YAML errors at the right line', async () => {
    const markdown = `# One

---
layout: section
theme: frost: dark
---

# Two`;
    expect(await problems(markdown)).toEqual([
      { code: 'slide-yaml-error', severity: 'error', line: 4, fix: undefined },
    ]);
  });

  it('reports YAML errors in the document front matter', async () => {
    const markdown = `---
theme: frost
theme: minimal
---

# One`;
    expect(await problems(markdown)).toEqual([
      { code: 'slide-yaml-error', severity: 'error', line: 2, fix: undefined },
    ]);
  });

  it('does not report slide content after a separator as invalid YAML', async () => {
    const markdown = `# One

---
Note: this is slide content

and more content
---

# Three`;
    expect(await problems(markdown)).toEqual([]);
  });

  it('warns about a separator that makes slide content front matter', async () => {
    const markdown = `# One

---
Note: remember this
---

# Three`;
    expect(await problems(markdown)).toEqual([
      { code: 'slide-ambiguous-separator', severity: 'warning', line: 2, fix: '\n' },
    ]);
  });

  it('reports an unused lowercase property of a slide as unknown, not as a separator', async () => {
    const markdown = `# One

---
speaker: Jane Doe
---

# Two`;
    expect(await problems(markdown)).toEqual([
      { code: 'slide-unknown-property', severity: 'information', line: 3, fix: undefined },
    ]);
  });

  it('skips code blocks and speaker notes', async () => {
    const markdown = `# One

\`\`\`yaml
---
layout: nope
theme: frost: dark
---
\`\`\`

<!-- notes
---
Note: not a slide
---
-->`;
    expect(await problems(markdown)).toEqual([]);
  });
});
