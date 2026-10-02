import { SlideParser, toBoolean } from '@demotime/common';

/**
 * Checks whether both markdown versions have the same slides, apart from `key`.
 */
const hasSameSlides = (before: string, after: string, key: string): boolean => {
  const toComparable = (markdown: string) =>
    JSON.stringify(
      new SlideParser().parseSlides(markdown).map(({ content, frontmatter }) => {
        const { [key]: _, ...rest } = frontmatter;
        return { content, frontmatter: rest };
      }),
    );
  return toComparable(before) === toComparable(after);
};

/**
 * Adds `hide: true` to the frontmatter of a slide, or removes it.
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
): string | undefined => setSlideBooleanProperty(markdown, slideIndex, 'hide', hidden);

/**
 * Adds `key: true` to the frontmatter of a slide, or removes it.
 *
 * - A slide with frontmatter gets `key: true` added to it, or its `key` line removed. When `key`
 *   was its only property, the frontmatter block is removed as well.
 * - A slide without frontmatter gets a frontmatter block with `key: true`.
 *
 * Removing only looks at the frontmatter of the slide itself, not at a value it inherits from the
 * document frontmatter.
 *
 * @param markdown The content of the slide file
 * @param slideIndex The 0-based index of the slide in the file
 * @param key The frontmatter property, like `hide` or `autoFit`
 * @param enabled Whether the property should be `true`
 * @returns The updated content, or `undefined` when the slide doesn't exist
 */
export const setSlideBooleanProperty = (
  markdown: string,
  slideIndex: number,
  key: string,
  enabled: boolean,
): string | undefined => {
  const parser = new SlideParser();
  const slide = parser.parseSlides(markdown)[slideIndex];
  const location = parser.getSlideLocations(markdown)[slideIndex];
  if (!slide || !location) {
    return undefined;
  }

  if ((toBoolean(slide.frontmatter[key]) === true) === enabled) {
    return markdown;
  }

  const keyLine = new RegExp(`^${key}\\s*:`);
  const enabledLine = `${key}: true`;

  const eol = markdown.includes('\r\n') ? '\r\n' : '\n';
  const lines = markdown.split(/\r?\n/);

  if (location.frontmatter) {
    const { start, end } = location.frontmatter;
    const keyLines: number[] = [];
    for (let idx = start + 1; idx < end; idx++) {
      if (keyLine.test(lines[idx])) {
        keyLines.push(idx);
      }
    }

    if (enabled) {
      if (keyLines.length > 0) {
        // Replace a `key: false`
        lines[keyLines[0]] = enabledLine;
      } else {
        lines.splice(end, 0, enabledLine);
      }
      return lines.join(eol);
    }

    const otherLines = lines
      .slice(start + 1, end)
      .filter((_, idx) => !keyLines.includes(start + 1 + idx));
    if (otherLines.some((line) => line.trim() !== '')) {
      for (const idx of [...keyLines].reverse()) {
        lines.splice(idx, 1);
      }
      return lines.join(eol);
    }

    // `key` was the only property, so the frontmatter block can go: the document frontmatter
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
    if (hasSameSlides(markdown, candidate, key)) {
      return candidate;
    }

    // Removing the block would change the slides, for instance when the next lines would be read
    // as frontmatter, so keep the block
    lines[keyLines[0]] = `${key}: false`;
    return lines.join(eol);
  }

  if (location.separatorLine !== undefined) {
    // The separator becomes the opening `---` of the frontmatter
    lines.splice(location.separatorLine + 1, 0, enabledLine, '---');
    return lines.join(eol);
  }

  // The first slide of a file without frontmatter
  lines.unshift('---', enabledLine, '---', '');
  return lines.join(eol);
};
