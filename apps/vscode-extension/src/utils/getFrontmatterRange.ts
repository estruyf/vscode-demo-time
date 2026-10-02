/**
 * Finds the frontmatter block that contains the given line of a slide file. A slide file can
 * have a frontmatter block for the document and for every slide, so this looks at each `---`
 * line outside of code blocks instead of only at the start of the file.
 *
 * Unlike the slide parser, the block does not need to be valid YAML, as it is being edited.
 *
 * @param lines The lines of the slide file
 * @param line The zero-based line to look for
 * @returns The lines of the opening and closing `---`, or undefined when the line is not inside a
 * frontmatter block
 */
export const getFrontmatterRange = (
  lines: string[],
  line: number,
): { start: number; end: number } | undefined => {
  // The opening fence (``` or ~~~) of the code block we are in
  let codeFence: string | undefined;

  for (let i = 0; i < line && i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (codeFence) {
      const closingFence = /^(`{3,}|~{3,})$/.exec(trimmed);
      if (
        closingFence &&
        closingFence[1][0] === codeFence[0] &&
        closingFence[1].length >= codeFence.length
      ) {
        codeFence = undefined;
      }
      continue;
    }

    const openingFence = /^(`{3,}|~{3,})/.exec(trimmed);
    if (openingFence) {
      codeFence = openingFence[1];
      continue;
    }

    if (trimmed !== '---') {
      continue;
    }

    const end = findFrontmatterEnd(lines, i);
    if (end === undefined) {
      // A plain slide separator
      continue;
    }

    if (line < end) {
      return { start: i, end };
    }

    i = end;
  }

  return undefined;
};

/**
 * Checks if the `---` on the given line starts a frontmatter block. The document frontmatter
 * starts on the first line. A slide frontmatter needs a (partially typed) key on the next line,
 * otherwise the `---` is a slide separator. A markdown heading after an empty line is slide
 * content.
 *
 * @returns The index of the closing `---` line, or undefined when it does not start frontmatter
 */
const findFrontmatterEnd = (lines: string[], start: number): number | undefined => {
  if (start > 0 && !/^\w+\s*(:|$)/.test(lines[start + 1] ?? '')) {
    return undefined;
  }

  for (let end = start + 1; end < lines.length; end++) {
    if (lines[end].trim() === '---') {
      return end;
    }

    if (end > start + 1 && lines[end - 1].trim() === '' && /^#{1,6}\s/.test(lines[end])) {
      return undefined;
    }
  }

  return undefined;
};
