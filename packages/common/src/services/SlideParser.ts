import yaml from 'js-yaml';
import { ParserOptions, Slide, InternalSlide, SlideLocation, SlideMetadata } from '../models';
import { getSlidePropertyInheritance, SlideLayout } from '../constants';
import { FrontMatterParser } from '.';
import { getOpeningFence, isClosingFence } from '../utils/codeFence';
import {
  getSlideIncludeSrc,
  normalizeSlidePath,
  renderSlideIncludeError,
  resolveIncludedCodeFilePaths,
  resolveSlideIncludePath,
} from '../utils/slideIncludes';

// The opening line of a speaker notes block: `<!-- notes`
const NOTES_START = /^<!--\s*notes(?=\s|-->|$)/i;

// A slide without a value, or with an empty one, uses the value of the document front matter
const isUnset = (value: unknown) => value === undefined || value === null || value === '';

// The front matter without the `src` of an included file
const withoutSrc = (frontmatter: SlideMetadata): SlideMetadata => {
  const result = { ...frontmatter };
  delete result.src;
  return result;
};

export class SlideParser {
  private defaultOptions: Required<Omit<ParserOptions, 'includes'>> = {
    delimiterPattern: /^---(?:\s*|\s+(.+?)\s*)---$/gm,
    includeEmpty: false,
    trimContent: true,
  };

  constructor(private options: ParserOptions = {}) {}

  /**
   * Parses markdown content into an array of slides. With the `includes` option, a slide with a
   * `src` is replaced by the slides of that file.
   *
   * @param markdown The markdown content to parse
   * @returns Array of parsed slides
   */
  public parseSlides(markdown: string): Slide[] {
    return this.parse(markdown, true).slides;
  }

  /**
   * Returns where each slide starts in the markdown, in the same order as `parseSlides`
   *
   * @param markdown The markdown content to parse
   * @returns The location of each slide
   */
  public getSlideLocations(markdown: string): SlideLocation[] {
    return this.parse(markdown, false).locations;
  }

  /**
   * @param withIncludes Replaces the slides with a `src` by the slides of that file
   * @param includeStack The files that include this file, to detect include cycles
   */
  private parse(
    markdown: string,
    withIncludes: boolean,
    includeStack: string[] = [],
  ): { slides: Slide[]; locations: SlideLocation[] } {
    const mergedOptions: Required<Omit<ParserOptions, 'includes'>> = {
      ...this.defaultOptions,
      ...this.options,
    };

    if (!markdown || markdown.trim() === '') {
      return { slides: [], locations: [] };
    }

    const { frontmatter: docFrontMatter, remainingContent } =
      FrontMatterParser.extractFrontmatter(markdown);
    // Use remainingContent if frontmatter was extracted (even if remainingContent is empty string),
    // otherwise fall back to original markdown (for cases where frontmatter regex didn't match)
    const hasDocFrontmatter = Object.keys(docFrontMatter).length > 0;
    const processedMarkdown = hasDocFrontmatter ? remainingContent : markdown;

    // The document frontmatter lines, to map the lines of the remaining content to the file
    const docLines = hasDocFrontmatter
      ? markdown.slice(0, markdown.length - remainingContent.length).split(/\r?\n/)
      : [];
    const lineOffset = Math.max(docLines.length - 1, 0);
    const docLocation: SlideLocation = {
      frontmatter: {
        start: 0,
        end: docLines.map((line) => line.trim()).lastIndexOf('---'),
      },
      isDocument: true,
    };

    const lines = processedMarkdown.split(/\r?\n/);

    const slideBlocks: { text: string; location: SlideLocation }[] = [];
    const slides: InternalSlide[] = [];
    const locations: SlideLocation[] = [];
    let buffer: string[] = [];
    let blockLocation: SlideLocation = {};
    // The opening fence (``` or ~~~) of the code block we are in
    let codeFence: string | undefined;

    // If document frontmatter exists and remaining content starts with another slide delimiter,
    // the document frontmatter gets its own (empty) first slide. The frontmatter object is used
    // directly, so it does not need to be serialized and parsed again.
    const remainingStartsWithSlide = processedMarkdown.trimStart().startsWith('---');

    if (hasDocFrontmatter && remainingStartsWithSlide) {
      slides.push({
        content: '',
        rawContent: '',
        docFrontMatter: { ...docFrontMatter },
        frontmatter: {},
        index: 0,
      });
      locations.push({ ...docLocation, end: docLocation.frontmatter?.end });
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (codeFence) {
        buffer.push(line);
        if (isClosingFence(trimmed, codeFence)) {
          codeFence = undefined;
        }
        continue;
      }

      const openingFence = getOpeningFence(trimmed);
      if (openingFence) {
        codeFence = openingFence;
        buffer.push(line);
        continue;
      }

      // A `---` in the speaker notes doesn't start a new slide
      const notesEnd = SlideParser.findNotesEnd(lines, i);
      if (notesEnd !== undefined) {
        blockLocation.notes = [
          ...(blockLocation.notes || []),
          { start: i + lineOffset, end: notesEnd + lineOffset },
        ];
        buffer.push(...lines.slice(i, notesEnd + 1));
        i = notesEnd;
        continue;
      }

      if (trimmed === '---') {
        // Possible start of frontmatter for the next slide
        const frontmatterEnd = SlideParser.findFrontmatterEnd(lines, i);
        if (frontmatterEnd !== undefined) {
          if (buffer.length > 0 || mergedOptions.includeEmpty) {
            blockLocation.end = i - 1 + lineOffset;
            slideBlocks.push({ text: buffer.join('\n'), location: blockLocation });
            buffer = [];
          }

          blockLocation = {
            frontmatter: { start: i + lineOffset, end: frontmatterEnd + lineOffset },
          };
          buffer.push(...lines.slice(i, frontmatterEnd + 1));
          i = frontmatterEnd;
          continue;
        }

        blockLocation.end = i - 1 + lineOffset;
        slideBlocks.push({ text: buffer.join('\n'), location: blockLocation });
        buffer = [];
        blockLocation = { separatorLine: i + lineOffset };
        continue;
      }

      buffer.push(line);
    }

    if (buffer.length > 0 || mergedOptions.includeEmpty) {
      blockLocation.end = lines.length - 1 + lineOffset;
      slideBlocks.push({ text: buffer.join('\n'), location: blockLocation });
    }

    for (const { text: block, location } of slideBlocks) {
      const trimmedBlock = mergedOptions.trimContent ? block.trimStart() : block;
      const { frontmatter, remainingContent: content } =
        FrontMatterParser.extractFrontmatter(trimmedBlock);
      const { content: slideContent, notes } = SlideParser.extractNotes(content ?? trimmedBlock);

      // Skip empty slides unless:
      // - includeEmpty option is true
      // - the block has its own frontmatter
      // - this is the first slide and we have document-level frontmatter
      // - the slide has speaker notes
      const isFirstSlide = slides.length === 0;
      const hasBlockFrontmatter = frontmatter && Object.keys(frontmatter).length > 0;
      const shouldIncludeEmptySlide =
        mergedOptions.includeEmpty ||
        hasBlockFrontmatter ||
        (isFirstSlide && hasDocFrontmatter) ||
        !!notes;

      if (slideContent.trim() === '' && !shouldIncludeEmptySlide) {
        continue;
      }

      // The first slide also gets the document frontmatter
      locations.push(
        isFirstSlide && hasDocFrontmatter
          ? { ...docLocation, end: location.end, notes: location.notes }
          : location,
      );
      slides.push({
        content: mergedOptions.trimContent ? slideContent.trim() : slideContent,
        rawContent: slideContent,
        docFrontMatter: { ...docFrontMatter },
        frontmatter: frontmatter || {},
        index: slides.length,
        ...(notes ? { notes } : {}),
      });
    }

    const allSlides =
      withIncludes && this.options.includes ? this.expandIncludes(slides, includeStack) : slides;

    // Apply default layout where not specified
    const parsedSlides = allSlides.map((slide, idx) => {
      slide.index = idx;

      if (idx === 0) {
        slide.frontmatter = {
          ...slide.frontmatter,
          ...slide.docFrontMatter,
        };
      }

      if (!slide.frontmatter.layout) {
        slide.frontmatter.layout = SlideLayout.Default;
      }

      // The document front matter applies to the other slides as `SLIDE_PROPERTIES` describes
      for (const [key, value] of Object.entries(slide.docFrontMatter)) {
        // Only the first slide uses `slide`
        if (key === 'slide') {
          continue;
        }

        const inheritance = getSlidePropertyInheritance(key);
        if (inheritance === 'always' && value) {
          slide.frontmatter[key] = value;
        } else if (inheritance === 'fallback' && isUnset(slide.frontmatter[key])) {
          slide.frontmatter[key] = value;
        }
      }

      return slide;
    });

    return { slides: parsedSlides, locations };
  }

  /**
   * Replaces the slides with a `src` by the slides of that file, and adds the file and index
   * each slide comes from.
   *
   * @param slides The slides of the file, before the document front matter is applied
   * @param includeStack The files that include this file
   */
  private expandIncludes(slides: InternalSlide[], includeStack: string[]): InternalSlide[] {
    const { filePath: crntPath, files } = this.options.includes!;
    const filePath = normalizeSlidePath(crntPath) ?? crntPath;
    const stack = includeStack.length > 0 ? includeStack : [filePath];
    const result: InternalSlide[] = [];
    let isFirstIncluded = false;

    slides.forEach((slide, idx) => {
      // The first slide also has the properties of the document front matter
      const frontmatter =
        idx === 0 ? { ...slide.frontmatter, ...slide.docFrontMatter } : slide.frontmatter;
      const src = getSlideIncludeSrc(frontmatter);
      if (!src) {
        result.push({ ...slide, source: { path: filePath, index: idx } });
        return;
      }

      isFirstIncluded = isFirstIncluded || idx === 0;
      // The other properties of the slide apply to every included slide
      const overrides = withoutSrc(frontmatter);
      const errorSlide = (message: string): InternalSlide => {
        const content = renderSlideIncludeError(src, message);
        return {
          content,
          rawContent: content,
          docFrontMatter: slide.docFrontMatter,
          frontmatter: overrides,
          index: idx,
          source: { path: filePath, index: idx },
        };
      };

      const includePath = resolveSlideIncludePath(filePath, src);
      if (!includePath) {
        result.push(errorSlide('Only files in the workspace folder can be included.'));
        return;
      }

      if (stack.includes(includePath)) {
        result.push(
          errorSlide(`The files include each other: ${[...stack, includePath].join(' → ')}`),
        );
        return;
      }

      const content = files[includePath];
      if (content === undefined) {
        result.push(errorSlide(`File not found: ${includePath}`));
        return;
      }

      const parser = new SlideParser({
        ...this.options,
        includes: { filePath: includePath, files },
      });
      const included = parser.parse(content, true, [...stack, includePath]).slides;
      for (const includedSlide of included) {
        result.push({
          ...includedSlide,
          content: resolveIncludedCodeFilePaths(includedSlide.content, includePath),
          rawContent: resolveIncludedCodeFilePaths(includedSlide.rawContent, includePath),
          frontmatter: { ...includedSlide.frontmatter, ...overrides },
          docFrontMatter: slide.docFrontMatter,
          source: {
            path: includedSlide.source?.path ?? includePath,
            index: includedSlide.source?.index ?? includedSlide.index,
            srcIndex: idx,
          },
        });
      }
    });

    // The `src` of the document front matter only replaces the first slide
    if (isFirstIncluded) {
      result.forEach((slide) => {
        slide.docFrontMatter = withoutSrc(slide.docFrontMatter);
      });
    }

    return result;
  }

  /**
   * Removes the `<!-- notes ... -->` blocks from the slide content. Blocks in code blocks are
   * slide content.
   *
   * @param markdown The content of a slide
   * @returns The content without the notes blocks, and the notes when the slide has any
   */
  public static extractNotes(markdown: string): { content: string; notes?: string } {
    const lines = markdown.split(/\r?\n/);
    const contentLines: string[] = [];
    const notes: string[] = [];
    let hasNotesBlock = false;
    let codeFence: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (codeFence) {
        contentLines.push(line);
        if (isClosingFence(trimmed, codeFence)) {
          codeFence = undefined;
        }
        continue;
      }

      const openingFence = getOpeningFence(trimmed);
      if (openingFence) {
        codeFence = openingFence;
        contentLines.push(line);
        continue;
      }

      const notesEnd = SlideParser.findNotesEnd(lines, i);
      if (notesEnd !== undefined) {
        hasNotesBlock = true;
        const text = SlideParser.getNotesText(lines.slice(i, notesEnd + 1));
        if (text) {
          notes.push(text);
        }
        i = notesEnd;
        continue;
      }

      contentLines.push(line);
    }

    if (!hasNotesBlock) {
      return { content: markdown };
    }

    return {
      content: contentLines.join('\n'),
      notes: notes.length > 0 ? notes.join('\n\n') : undefined,
    };
  }

  /**
   * Checks if the given line opens a `<!-- notes` block that gets closed by a `-->`.
   *
   * @returns The index of the line with the closing `-->`, or undefined when it is no notes block
   */
  private static findNotesEnd(lines: string[], start: number): number | undefined {
    const trimmed = lines[start].trim();
    if (!NOTES_START.test(trimmed)) {
      return undefined;
    }

    if (trimmed.replace(NOTES_START, '').includes('-->')) {
      return start;
    }

    for (let end = start + 1; end < lines.length; end++) {
      if (lines[end].includes('-->')) {
        return end;
      }
    }

    return undefined;
  }

  /**
   * Returns the text of a notes block without the comment markers and the common indentation.
   */
  private static getNotesText(blockLines: string[]): string {
    const textLines = [...blockLines];
    textLines[0] = textLines[0].trim().replace(NOTES_START, '');
    const last = textLines.length - 1;
    textLines[last] = textLines[last].slice(0, textLines[last].indexOf('-->'));

    const indents = textLines
      .slice(1)
      .filter((line) => line.trim() !== '')
      .map((line) => /^\s*/.exec(line)![0].length);
    const indent = indents.length > 0 ? Math.min(...indents) : 0;

    return [textLines[0].trim(), ...textLines.slice(1).map((line) => line.slice(indent).trimEnd())]
      .join('\n')
      .trim();
  }

  /**
   * Checks if the `---` on the given line starts a frontmatter block for the next slide.
   * That is the case when the next line is a `key:` line, a closing `---` follows, and the
   * lines in between parse as a YAML mapping. A markdown heading after an empty line is slide
   * content, even though YAML would read it as a comment.
   *
   * @returns The index of the closing `---` line, or undefined when it is a plain slide separator
   */
  private static findFrontmatterEnd(lines: string[], start: number): number | undefined {
    if (start + 1 >= lines.length || !/^\w+\s*:/.test(lines[start + 1])) {
      return undefined;
    }

    for (let end = start + 2; end < lines.length; end++) {
      if (lines[end].trim() !== '---') {
        continue;
      }

      const blockLines = lines.slice(start + 1, end);
      const hasHeading = blockLines.some(
        (line, idx) => idx > 0 && blockLines[idx - 1].trim() === '' && /^#{1,6}\s/.test(line),
      );
      if (hasHeading || !FrontMatterParser.parseYamlMapping(blockLines.join('\n'))) {
        return undefined;
      }

      return end;
    }

    return undefined;
  }

  /**
   * Converts speaker notes to a `<!-- notes ... -->` block
   *
   * @param notes The speaker notes
   * @returns The notes block, or an empty string when there are no notes
   */
  public static notesToMarkdown(notes: string): string {
    const text = notes.trim();
    if (!text) {
      return '';
    }

    // A `-->` in the notes would close the comment
    return `<!-- notes\n${text.replace(/-->/g, '-- >')}\n-->`;
  }

  /**
   * Groups slides by a specified frontmatter property
   *
   * @param slides Array of slides to group
   * @param property Frontmatter property to group by
   * @returns Object with groups of slides
   */
  public groupSlidesByProperty(slides: Slide[], property: string): Record<string, Slide[]> {
    return slides.reduce(
      (groups, slide) => {
        const propertyValue = slide.frontmatter[property] ?? SlideLayout.Default;
        const key = String(propertyValue);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(slide);
        return groups;
      },
      {} as Record<string, Slide[]>,
    );
  }

  /**
   * Converts slides back to markdown format
   *
   * @param slides Array of slides to convert
   * @returns Markdown string
   */
  public slidesToMarkdown(slides: Slide[]): string {
    return slides
      .map((slide, index) => {
        // Convert frontmatter to YAML string
        let frontmatterStr = '';
        if (Object.keys(slide.frontmatter).length > 0) {
          const yamlContent = yaml.dump(slide.frontmatter, { lineWidth: -1, skipInvalid: true });
          frontmatterStr = `---\n${yamlContent.trimEnd()}\n---\n\n`;
        }

        // Add slide delimiter if not the first slide
        const delimiter = index > 0 ? '---\n\n' : '';

        const notes = slide.notes ? `\n\n${SlideParser.notesToMarkdown(slide.notes)}` : '';

        // Combine parts
        return `${delimiter}${frontmatterStr}${slide.content}${notes}`;
      })
      .join('\n\n');
  }
}
