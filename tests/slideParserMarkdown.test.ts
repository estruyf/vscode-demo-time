import { SlideParser } from '../src/services/SlideParser';
import { Slide } from '../src/models';
import YAML from 'yaml';
import { describe, it, expect } from '@jest/globals';

describe('SlideParser.slidesToMarkdown', () => {
  it('escapes values containing colons', () => {
    const parser = new SlideParser();
    const slides: Slide[] = [
      {
        content: 'content',
        rawContent: 'content',
        frontmatter: { title: 'foo: bar' },
        index: 0,
      },
    ];

    const md = parser.slidesToMarkdown(slides);
    const fm = md.split('---\n')[1].split('\n---')[0];
    const parsed = YAML.parse(fm);
    expect(parsed.title).toBe('foo: bar');
  });

  it('handles quotes in values', () => {
    const parser = new SlideParser();
    const slides: Slide[] = [
      {
        content: 'content',
        rawContent: 'content',
        frontmatter: { quote: 'He said "hi"' },
        index: 0,
      },
    ];

    const md = parser.slidesToMarkdown(slides);
    const fm = md.split('---\n')[1].split('\n---')[0];
    const parsed = YAML.parse(fm);
    expect(parsed.quote).toBe('He said "hi"');
  });

  it('supports multi-line strings', () => {
    const parser = new SlideParser();
    const slides: Slide[] = [
      {
        content: 'content',
        rawContent: 'content',
        frontmatter: { text: 'line1\nline2' },
        index: 0,
      },
    ];

    const md = parser.slidesToMarkdown(slides);
    const fm = md.split('---\n')[1].split('\n---')[0];
    const parsed = YAML.parse(fm);
    expect(parsed.text).toBe('line1\nline2');
  });
});
