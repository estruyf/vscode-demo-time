import { isSlideHidden, SlideParser } from '@demotime/common';

const HIDE_LINE = /^hide\s*:/;

/**
 * Checks whether both markdown versions have the same slides, apart from `hide`.
 */
const hasSameSlides = (before: string, after: string): boolean => {
  const toComparable = (markdown: string) =>
    JSON.stringify(
      new SlideParser().parseSlides(markdown).map(({ content, frontmatter }) => {
        const { hide, ...rest } = frontmatter;
        return { content, frontmatter: rest };
      }),
    );
  return toComparable(before) === toComparable(after);
};

/**
 * Adds or removes `hide: true` in the frontmatter of a slide.
 *
 * - A slide with frontmatter gets `hide: true` added to it, or its `hide` line removed. When `hide`
 *   was its only property, the frontmatter block is removed as well.
 * - A slide without frontmatter gets a frontmatter block with `hide: true`.
 *
 * @param markdown The content of the slide file
 * @param slideIndex The 0-based index of the slide in the file
 * @param hidden Whether the slide should be hidden
 * @returns The updated content, or `undefined` when the slide doesn't exist
 */
export const setSlideHidden = (
  markdown: string,
  slideIndex: number,
  hidden: boolean,
): string | undefined => {
  const parser = new SlideParser();
  const slide = parser.parseSlides(markdown)[slideIndex];
  const location = parser.getSlideLocations(markdown)[slideIndex];
  if (!slide || !location) {
    return undefined;
  }

  if (isSlideHidden(slide) === hidden) {
    return markdown;
  }

  const eol = markdown.includes('\r\n') ? '\r\n' : '\n';
  const lines = markdown.split(/\r?\n/);

  if (location.frontmatter) {
    const { start, end } = location.frontmatter;
    const hideLines: number[] = [];
    for (let idx = start + 1; idx < end; idx++) {
      if (HIDE_LINE.test(lines[idx])) {
        hideLines.push(idx);
      }
    }

    if (hidden) {
      if (hideLines.length > 0) {
        // Replace a `hide: false`
        lines[hideLines[0]] = 'hide: true';
      } else {
        lines.splice(end, 0, 'hide: true');
      }
      return lines.join(eol);
    }

    const otherLines = lines
      .slice(start + 1, end)
      .filter((_, idx) => !hideLines.includes(start + 1 + idx));
    if (otherLines.some((line) => line.trim() !== '')) {
      for (const idx of [...hideLines].reverse()) {
        lines.splice(idx, 1);
      }
      return lines.join(eol);
    }

    // `hide` was the only property, so the frontmatter block can go: the document frontmatter
    // with the empty lines after it, or a slide frontmatter becomes a plain `---` separator
    const withoutBlock = [...lines];
    if (location.isDocument) {
      let next = end + 1;
      while (next < withoutBlock.length && withoutBlock[next].trim() === '') {
        next++;
      }
      withoutBlock.splice(start, next - start);
    } else {
      withoutBlock.splice(start, end - start + 1, '---');
    }

    const candidate = withoutBlock.join(eol);
    if (hasSameSlides(markdown, candidate)) {
      return candidate;
    }

    // Removing the block would change the slides, for instance when the next lines would be read
    // as frontmatter, so keep the block
    lines[hideLines[0]] = 'hide: false';
    return lines.join(eol);
  }

  if (location.separatorLine !== undefined) {
    // The separator becomes the opening `---` of the frontmatter
    lines.splice(location.separatorLine + 1, 0, 'hide: true', '---');
    return lines.join(eol);
  }

  // The first slide of a file without frontmatter
  lines.unshift('---', 'hide: true', '---', '');
  return lines.join(eol);
};
