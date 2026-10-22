import { placeholderFormatting } from '../src/utils/placeholderFormatting';
import { describe, it, expect } from '@jest/globals';

const columns = (left: string, right: string) => `
<div class="slide__left">

${left}

</div>
<div class="slide__right">

${right}

</div>`;

const section = (index: number, content: string) => `
<div class="slide__section section-${index}">

${content}

</div>`;

describe('placeholderFormatting', () => {
  it('returns content without markers unchanged', () => {
    expect(placeholderFormatting('# Title\n\nText')).toBe('# Title\n\nText');
    expect(placeholderFormatting('')).toBe('');
  });

  it('splits the content into two columns', () => {
    expect(placeholderFormatting('# Left\n\n::right::\n\n# Right')).toBe(
      columns('# Left', '# Right'),
    );
  });

  it('leaves the content unchanged with more than one ::right:: marker', () => {
    const markdown = 'One\n\n::right::\n\nTwo\n\n::right::\n\nThree';
    expect(placeholderFormatting(markdown)).toBe(markdown);
  });

  it('ignores a marker in a fenced code block', () => {
    const backticks = '# Title\n\n```md\nLeft\n\n::right::\n\nRight\n```';
    const tildes = '# Title\n\n~~~\n::section::\n~~~\n\nText';
    expect(placeholderFormatting(backticks)).toBe(backticks);
    expect(placeholderFormatting(tildes)).toBe(tildes);
  });

  it('only closes a code block with the same fence character and length', () => {
    const code = '````md\n```\n~~~\n::right::\n````';
    expect(placeholderFormatting(`${code}\n\n::right::\n\nRight`)).toBe(columns(code, 'Right'));
  });

  it('ignores markers after a code block that is not closed', () => {
    const markdown = 'Text\n\n```md\n::right::\n\nRight';
    expect(placeholderFormatting(markdown)).toBe(markdown);
  });

  it('ignores a marker in inline code', () => {
    const markdown = 'Use `::right::` or ``a ` ::section::`` to split.';
    expect(placeholderFormatting(markdown)).toBe(markdown);
  });

  it('treats backticks without a closing pair in the paragraph as text', () => {
    expect(placeholderFormatting('A ` tick\n\n::right::\n\nRight `')).toBe(
      columns('A ` tick', 'Right `'),
    );
  });

  it('ignores an escaped marker', () => {
    expect(placeholderFormatting('Use \\::right:: to split')).toBe('Use \\::right:: to split');
  });

  it('splits into columns when a code block shows a marker', () => {
    const left = '# Left\n\n```md\na\n::right::\nb\n```\n\nUse `::right::`';
    expect(placeholderFormatting(`${left}\n\n::right::\n\n# Right`)).toBe(columns(left, '# Right'));
  });

  it('splits the content into sections', () => {
    expect(placeholderFormatting('# One\n\n::section::\n\nTwo\n\n::section::\n\nThree')).toBe(
      [section(1, '# One'), section(2, 'Two'), section(3, 'Three')].join('\n'),
    );
  });

  it('skips empty sections and keeps their number', () => {
    expect(placeholderFormatting('::section::\n\nTwo')).toBe(section(2, 'Two'));
  });

  it('splits a section into two columns', () => {
    expect(placeholderFormatting('# Title\n\n::section::\n\nLeft\n\n::right::\n\nRight')).toBe(
      [section(1, '# Title'), section(2, columns('Left', 'Right'))].join('\n'),
    );
  });

  it('ignores markers in code blocks within sections', () => {
    const code = '```md\n::section::\n::right::\n```';
    expect(placeholderFormatting(`# Title\n\n::section::\n\n${code}\n\n::right::\n\nRight`)).toBe(
      [section(1, '# Title'), section(2, columns(code, 'Right'))].join('\n'),
    );
  });
});
