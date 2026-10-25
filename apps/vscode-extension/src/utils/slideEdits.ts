import { getSlidePropertyInheritance, Slide, SlideLocation, SlideParser } from '@demotime/common';

/**
 * The first line of a slide: its frontmatter, the `---` separator before it, or the first line of
 * the file.
 */
const getStartLine = (location: SlideLocation): number =>
  location.frontmatter?.start ?? location.separatorLine ?? 0;

const parse = (markdown: string) => {
  const parser = new SlideParser();
  return {
    slides: parser.parseSlides(markdown),
    locations: parser.getSlideLocations(markdown),
  };
};

/**
 * The front matter of a slide as a string that doesn't depend on the order of the properties.
 */
const toComparable = (slide: Slide): string =>
  JSON.stringify(Object.entries(slide.frontmatter).sort(([a], [b]) => a.localeCompare(b)));

/**
 * Checks whether two slides have the same content and front matter.
 */
const isSameSlide = (a: Slide | undefined, b: Slide | undefined): boolean =>
  !!a && !!b && a.content === b.content && toComparable(a) === toComparable(b);

/**
 * Removes the properties that only the first slide uses, like `layout`, from the document
 * frontmatter. Their indented lines, like the lines of a multi-line value, go as well.
 */
const removeFirstSlideProperties = (lines: string[], start: number, end: number): string[] => {
  const result = lines.slice(0, start + 1);
  let isRemoving = false;
  for (let idx = start + 1; idx < end; idx++) {
    const key = /^([\w-]+)\s*:/.exec(lines[idx])?.[1];
    if (key) {
      isRemoving = key === 'slide' || getSlidePropertyInheritance(key) === 'firstSlide';
    } else if (!/^\s/.test(lines[idx])) {
      isRemoving = false;
    }

    if (!isRemoving) {
      result.push(lines[idx]);
    }
  }

  const hasProperties = result.slice(start + 1).some((line) => line.trim() !== '');
  if (!hasProperties) {
    // Without properties, the frontmatter block goes as well
    return [...result.slice(0, start), ...lines.slice(end + 1)];
  }
  return [...result, ...lines.slice(end)];
};

/**
 * Inserts the lines of a slide after a line, with an empty line before and after it.
 */
const insertLines = (lines: string[], afterLine: number, block: string[]): string[] => {
  const toInsert = [...block];
  if (lines[afterLine].trim() !== '') {
    toInsert.unshift('');
  }

  const next = lines[afterLine + 1];
  const isLastLine = next === undefined;
  if (
    isLastLine
      ? lines[afterLine] === '' // Keep the newline at the end of the file
      : next.trim() !== '' && toInsert[toInsert.length - 1].trim() !== ''
  ) {
    toInsert.push('');
  }

  return [...lines.slice(0, afterLine + 1), ...toInsert, ...lines.slice(afterLine + 1)];
};

/**
 * Sets `key: value` in the frontmatter of a slide.
 *
 * - A slide with frontmatter gets its `key` line replaced, or `key: value` added to it.
 * - A slide without frontmatter gets a frontmatter block with `key: value`.
 *
 * @param markdown The content of the slide file
 * @param slideIndex The 0-based index of the slide in the file
 * @param key The frontmatter property, like `layout`
 * @param value The YAML value to write
 * @returns The updated content, or `undefined` when the slide doesn't exist
 */
export const setSlideProperty = (
  markdown: string,
  slideIndex: number,
  key: string,
  value: string,
): string | undefined => {
  const { locations } = parse(markdown);
  const location = locations[slideIndex];
  if (!location) {
    return undefined;
  }

  const keyLine = new RegExp(`^${key}\\s*:`);
  const valueLine = `${key}: ${value}`;

  const eol = markdown.includes('\r\n') ? '\r\n' : '\n';
  const lines = markdown.split(/\r?\n/);

  if (location.frontmatter) {
    const { start, end } = location.frontmatter;
    for (let idx = start + 1; idx < end; idx++) {
      if (keyLine.test(lines[idx])) {
        lines[idx] = valueLine;
        return lines.join(eol);
      }
    }

    lines.splice(end, 0, valueLine);
    return lines.join(eol);
  }

  if (location.separatorLine !== undefined) {
    // The separator becomes the opening `---` of the frontmatter
    lines.splice(location.separatorLine + 1, 0, valueLine, '---');
    return lines.join(eol);
  }

  // The first slide of a file without frontmatter
  lines.unshift('---', valueLine, '---', '');
  return lines.join(eol);
};

/**
 * Inserts a slide after another slide.
 *
 * @param markdown The content of the slide file
 * @param afterIndex The 0-based index of the slide to insert the new slide after
 * @param content The markdown of the new slide
 * @returns The updated content, or `undefined` when the slide doesn't exist or the new slide
 * can't be added without changing the other slides
 */
export const insertSlide = (
  markdown: string,
  afterIndex: number,
  content: string,
): string | undefined => {
  const { slides, locations } = parse(markdown);
  const location = locations[afterIndex];
  if (!location || location.end === undefined) {
    return undefined;
  }

  const eol = markdown.includes('\r\n') ? '\r\n' : '\n';
  const lines = insertLines(markdown.split(/\r?\n/), location.end, [
    '---',
    '',
    ...content.split(/\r?\n/),
  ]);
  const result = lines.join(eol);

  const newSlides = parse(result).slides;
  if (
    newSlides.length !== slides.length + 1 ||
    newSlides[afterIndex + 1]?.content !== content.trim() ||
    !slides.every((slide, idx) => isSameSlide(slide, newSlides[idx > afterIndex ? idx + 1 : idx]))
  ) {
    return undefined;
  }
  return result;
};

/**
 * Adds a copy of a slide after it.
 *
 * @param markdown The content of the slide file
 * @param slideIndex The 0-based index of the slide to copy
 * @returns The updated content, or `undefined` when the slide doesn't exist or the copy can't be
 * added without changing the other slides
 */
export const duplicateSlide = (markdown: string, slideIndex: number): string | undefined => {
  const { slides, locations } = parse(markdown);
  const location = locations[slideIndex];
  if (!location || location.end === undefined) {
    return undefined;
  }

  const lines = markdown.split(/\r?\n/);
  let block: string[];
  if (slideIndex > 0) {
    block = lines.slice(getStartLine(location), location.end + 1);
  } else if (location.frontmatter) {
    // The document frontmatter becomes the frontmatter of the copy
    const { start, end } = location.frontmatter;
    block = [
      '---',
      ...lines.slice(start + 1, end),
      '---',
      ...lines.slice(end + 1, location.end + 1),
    ];
  } else {
    block = ['---', '', ...lines.slice(0, location.end + 1)];
  }

  // The empty lines at the end of the slide come back after the copy
  while (block.length > 0 && block[block.length - 1].trim() === '') {
    block.pop();
  }

  const eol = markdown.includes('\r\n') ? '\r\n' : '\n';
  const result = insertLines(lines, location.end, block).join(eol);

  const newSlides = parse(result).slides;
  if (
    newSlides.length !== slides.length + 1 ||
    newSlides[slideIndex + 1]?.content !== slides[slideIndex].content ||
    !slides.every((slide, idx) => isSameSlide(slide, newSlides[idx > slideIndex ? idx + 1 : idx]))
  ) {
    return undefined;
  }
  return result;
};

/**
 * Removes a slide from the file. The document frontmatter stays when the first slide is removed.
 *
 * @param markdown The content of the slide file
 * @param slideIndex The 0-based index of the slide to remove
 * @returns The updated content, or `undefined` when the slide doesn't exist, it is the only slide,
 * or it can't be removed without changing the other slides
 */
export const deleteSlide = (markdown: string, slideIndex: number): string | undefined => {
  const { slides, locations } = parse(markdown);
  const location = locations[slideIndex];
  if (!location || location.end === undefined || slides.length < 2) {
    return undefined;
  }

  const lines = markdown.split(/\r?\n/);
  const hasFinalNewline = lines[lines.length - 1] === '';
  let start = getStartLine(location);
  let end = location.end;

  if (slideIndex === 0) {
    // Keep the document frontmatter, and remove the separator of the next slide instead
    if (location.isDocument && location.frontmatter) {
      start = location.frontmatter.end + 1;
    }
    const next = locations[1];
    if (next.separatorLine !== undefined) {
      end = next.separatorLine;
    }
  }

  let result = [...lines];
  result.splice(start, end - start + 1);
  if (slideIndex === 0 && location.isDocument && location.frontmatter) {
    // The properties of the removed slide don't move to the next slide
    const before = result.length;
    result = removeFirstSlideProperties(
      result,
      location.frontmatter.start,
      location.frontmatter.end,
    );
    start -= before - result.length;
  }
  if (slideIndex === 0) {
    // No empty lines at the start of the file, and one after the document frontmatter
    while (result[start] !== undefined && result[start].trim() === '') {
      result.splice(start, 1);
    }
    if (start > 0) {
      result.splice(start, 0, '');
    }
  } else if (start >= result.length) {
    // The last slide was removed
    while (result.length > 0 && result[result.length - 1].trim() === '') {
      result.pop();
    }
    if (hasFinalNewline) {
      result.push('');
    }
  }

  const eol = markdown.includes('\r\n') ? '\r\n' : '\n';
  const newMarkdown = result.join(eol);

  const newSlides = parse(newMarkdown).slides;
  const expected = slides.filter((_, idx) => idx !== slideIndex);
  if (
    newSlides.length !== expected.length ||
    !expected.every((slide, idx) => isSameSlide(slide, newSlides[idx]))
  ) {
    return undefined;
  }
  return newMarkdown;
};
