import { SlideLocation, SlideParser } from '@demotime/common';

/**
 * The first line of a slide: its frontmatter, the `---` separator before it, or the first line of
 * the file.
 */
const getStartLine = (location: SlideLocation): number =>
  location.frontmatter?.start ?? location.separatorLine ?? 0;

/**
 * Gets the slide that contains the given line of a slide file. A line before the first slide, or
 * on an empty slide that the parser skips, belongs to the slide before it.
 *
 * @param markdown The content of the slide file
 * @param line The zero-based line
 * @returns The 0-based slide index, or `undefined` when the file has no slides
 */
export const getSlideIndexAtLine = (markdown: string, line: number): number | undefined => {
  const locations = new SlideParser().getSlideLocations(markdown);
  if (locations.length === 0) {
    return undefined;
  }

  let slideIndex = 0;
  for (let idx = 1; idx < locations.length; idx++) {
    if (getStartLine(locations[idx]) > line) {
      break;
    }
    slideIndex = idx;
  }
  return slideIndex;
};

/**
 * Gets the line to put the cursor on to edit a slide: the first non-empty line after its
 * frontmatter or separator, or the first line of the slide when it has no content.
 *
 * @param markdown The content of the slide file
 * @param slideIndex The 0-based slide index
 * @returns The zero-based line, or `undefined` when the slide doesn't exist
 */
export const getSlideSourceLine = (markdown: string, slideIndex: number): number | undefined => {
  const location = new SlideParser().getSlideLocations(markdown)[slideIndex];
  if (!location) {
    return undefined;
  }

  const lines = markdown.split(/\r?\n/);
  const start = getStartLine(location);
  const contentStart = location.frontmatter
    ? location.frontmatter.end + 1
    : location.separatorLine !== undefined
      ? location.separatorLine + 1
      : 0;
  const end = Math.min(location.end ?? lines.length - 1, lines.length - 1);

  for (let line = contentStart; line <= end; line++) {
    if (lines[line].trim() !== '') {
      return line;
    }
  }
  return start;
};
