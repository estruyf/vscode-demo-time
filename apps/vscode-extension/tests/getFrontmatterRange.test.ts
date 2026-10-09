import { getFrontmatterRange } from '../src/utils/getFrontmatterRange';
import { describe, it, expect } from '@jest/globals';

const lines = (content: string) => content.split('\n');

describe('getFrontmatterRange', () => {
  const slides = lines(
    [
      '---', // 0
      'theme: default', // 1
      '---', // 2
      '', // 3
      '# Slide 1', // 4
      '', // 5
      '---', // 6
      '', // 7
      '# Slide 2', // 8
      '', // 9
      '---', // 10
      'layout: intro', // 11
      'transition: fade', // 12
      '---', // 13
      '', // 14
      '# Slide 3', // 15
    ].join('\n'),
  );

  it('finds the document frontmatter', () => {
    expect(getFrontmatterRange(slides, 1)).toEqual({ start: 0, end: 2 });
  });

  it('finds the frontmatter of a later slide', () => {
    expect(getFrontmatterRange(slides, 11)).toEqual({ start: 10, end: 13 });
    expect(getFrontmatterRange(slides, 12)).toEqual({ start: 10, end: 13 });
  });

  it('does not treat slide content between separators as frontmatter', () => {
    expect(getFrontmatterRange(slides, 4)).toBeUndefined();
    expect(getFrontmatterRange(slides, 7)).toBeUndefined();
    expect(getFrontmatterRange(slides, 8)).toBeUndefined();
    expect(getFrontmatterRange(slides, 15)).toBeUndefined();
  });

  it('does not include the delimiter lines', () => {
    expect(getFrontmatterRange(slides, 0)).toBeUndefined();
    expect(getFrontmatterRange(slides, 10)).toBeUndefined();
    expect(getFrontmatterRange(slides, 13)).toBeUndefined();
  });

  it('finds a slide frontmatter with a partially typed key', () => {
    const content = lines('# Slide 1\n\n---\nlayout: intro\nlay\n---\n\n# Slide 2');
    expect(getFrontmatterRange(content, 4)).toEqual({ start: 2, end: 5 });
  });

  it('finds a slide frontmatter that follows a separator', () => {
    const content = lines('# Slide 1\n\n---\n\n---\nlayout: intro\n---\n\n# Slide 2');
    expect(getFrontmatterRange(content, 5)).toEqual({ start: 4, end: 6 });
    expect(getFrontmatterRange(content, 3)).toBeUndefined();
  });

  it('ignores --- inside code blocks', () => {
    const content = lines('# Slide 1\n\n```yaml\n---\nlayout: intro\n---\n```\n');
    expect(getFrontmatterRange(content, 4)).toBeUndefined();
  });

  it('does not treat a heading after an empty line as frontmatter', () => {
    const content = lines('# Slide 1\n\n---\nNote: remember\n\n# Slide 2\n\n---\n\n# Slide 3');
    expect(getFrontmatterRange(content, 3)).toBeUndefined();
  });

  it('returns undefined for a file without frontmatter', () => {
    expect(getFrontmatterRange(lines('# Title\n\nSome text'), 2)).toBeUndefined();
  });
});
