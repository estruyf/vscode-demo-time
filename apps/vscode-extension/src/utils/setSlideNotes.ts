import { SlideParser } from '@demotime/common';

/**
 * Checks whether both markdown versions have the same slides, apart from the notes.
 */
const hasSameSlides = (before: string, after: string): boolean => {
  const toComparable = (markdown: string) =>
    JSON.stringify(
      new SlideParser()
        .parseSlides(markdown)
        .map(({ content, frontmatter }) => ({ content, frontmatter })),
    );
  return toComparable(before) === toComparable(after);
};

/**
 * Removes the lines of a notes block, and the empty line in front of it when it would leave two
 * empty lines behind.
 */
const removeLines = (lines: string[], start: number, end: number) => {
  lines.splice(start, end - start + 1);
  if (
    start > 0 &&
    lines[start - 1].trim() === '' &&
    (start >= lines.length || lines[start].trim() === '')
  ) {
    lines.splice(start - 1, 1);
  }
};

/**
 * Sets the speaker notes of a slide in its `<!-- notes ... -->` block.
 *
 * - A slide with notes gets its first notes block replaced, and its other notes blocks removed.
 * - A slide without notes gets a notes block after its content.
 * - Empty notes remove the notes blocks of the slide.
 *
 * @param markdown The content of the slide file
 * @param slideIndex The 0-based index of the slide in the file
 * @param notes The new notes of the slide
 * @returns The updated content, or `undefined` when the slide doesn't exist or the notes can't be
 * set without changing the slides
 */
export const setSlideNotes = (
  markdown: string,
  slideIndex: number,
  notes: string,
): string | undefined => {
  const parser = new SlideParser();
  const slide = parser.parseSlides(markdown)[slideIndex];
  const location = parser.getSlideLocations(markdown)[slideIndex];
  if (!slide || !location) {
    return undefined;
  }

  // A `-->` in the notes would close the comment
  const text = notes.trim().replace(/-->/g, '-- >');
  if ((slide.notes || '') === text) {
    return markdown;
  }

  const eol = markdown.includes('\r\n') ? '\r\n' : '\n';
  const lines = markdown.split(/\r?\n/);
  const block = text ? SlideParser.notesToMarkdown(text).split('\n') : [];
  const notesBlocks = location.notes || [];

  if (notesBlocks.length > 0) {
    // Bottom-up, so the line numbers of the first block stay the same
    for (const { start, end } of notesBlocks.slice(1).reverse()) {
      removeLines(lines, start, end);
    }

    const { start, end } = notesBlocks[0];
    if (block.length > 0) {
      lines.splice(start, end - start + 1, ...block);
    } else {
      removeLines(lines, start, end);
    }
  } else {
    // Add the notes after the last line of the slide content
    const contentStart = (location.frontmatter?.end ?? location.separatorLine ?? -1) + 1;
    let lastLine = location.end ?? lines.length - 1;
    while (lastLine >= contentStart && lines[lastLine].trim() === '') {
      lastLine--;
    }

    const insertAt = lastLine + 1;
    const before = lastLine >= contentStart ? [''] : [];
    const after = insertAt < lines.length && lines[insertAt].trim() !== '' ? [''] : [];
    lines.splice(insertAt, 0, ...before, ...block, ...after);
  }

  const result = lines.join(eol);
  const updated = parser.parseSlides(result)[slideIndex];
  if (!hasSameSlides(markdown, result) || (updated?.notes || '') !== text) {
    return undefined;
  }

  return result;
};
