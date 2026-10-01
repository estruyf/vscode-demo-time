import yaml from 'js-yaml';
import { ParserOptions, Slide, InternalSlide, SlideLocation } from '../models';
import { SlideLayout } from '../constants';
import { FrontMatterParser } from '.';

export class SlideParser {
  private defaultOptions: Required<ParserOptions> = {
    delimiterPattern: /^---(?:\s*|\s+(.+?)\s*)---$/gm,
    includeEmpty: false,
    trimContent: true,
  };

  constructor(private options: ParserOptions = {}) {}

  /**
   * Parses markdown content into an array of slides
   *
   * @param markdown The markdown content to parse
   * @returns Array of parsed slides
   */
  public parseSlides(markdown: string): Slide[] {
    return this.parse(markdown).slides;
  }

  /**
   * Returns where each slide starts in the markdown, in the same order as `parseSlides`
   *
   * @param markdown The markdown content to parse
   * @returns The location of each slide
   */
  public getSlideLocations(markdown: string): SlideLocation[] {
    return this.parse(markdown).locations;
  }

  private parse(markdown: string): { slides: Slide[]; locations: SlideLocation[] } {
    const mergedOptions: Required<ParserOptions> = {
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
      locations.push(docLocation);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (codeFence) {
        buffer.push(line);
        if (SlideParser.isClosingFence(trimmed, codeFence)) {
          codeFence = undefined;
        }
        continue;
      }

      const openingFence = /^(`{3,}|~{3,})/.exec(trimmed);
      if (openingFence) {
        codeFence = openingFence[1];
        buffer.push(line);
        continue;
      }

      if (trimmed === '---') {
        // Possible start of frontmatter for the next slide
        const frontmatterEnd = SlideParser.findFrontmatterEnd(lines, i);
        if (frontmatterEnd !== undefined) {
          if (buffer.length > 0 || mergedOptions.includeEmpty) {
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

        slideBlocks.push({ text: buffer.join('\n'), location: blockLocation });
        buffer = [];
        blockLocation = { separatorLine: i + lineOffset };
        continue;
      }

      buffer.push(line);
    }

    if (buffer.length > 0 || mergedOptions.includeEmpty) {
      slideBlocks.push({ text: buffer.join('\n'), location: blockLocation });
    }

    for (const { text: block, location } of slideBlocks) {
      const trimmedBlock = mergedOptions.trimContent ? block.trimStart() : block;
      const { frontmatter, remainingContent: content } =
        FrontMatterParser.extractFrontmatter(trimmedBlock);
      const slideContent = content ?? trimmedBlock;

      // Skip empty slides unless:
      // - includeEmpty option is true
      // - the block has its own frontmatter
      // - this is the first slide and we have document-level frontmatter
      const isFirstSlide = slides.length === 0;
      const hasBlockFrontmatter = frontmatter && Object.keys(frontmatter).length > 0;
      const shouldIncludeEmptySlide =
        mergedOptions.includeEmpty || hasBlockFrontmatter || (isFirstSlide && hasDocFrontmatter);

      if (slideContent.trim() === '' && !shouldIncludeEmptySlide) {
        continue;
      }

      // The first slide also gets the document frontmatter
      locations.push(isFirstSlide && hasDocFrontmatter ? docLocation : location);
      slides.push({
        content: mergedOptions.trimContent ? slideContent.trim() : slideContent,
        rawContent: slideContent,
        docFrontMatter: { ...docFrontMatter },
        frontmatter: frontmatter || {},
        index: slides.length,
      });
    }

    // Apply default layout where not specified
    const parsedSlides = slides.map((slide, idx) => {
      if (idx === 0) {
        slide.frontmatter = {
          ...slide.frontmatter,
          ...slide.docFrontMatter,
        };
      }

      if (!slide.frontmatter.layout) {
        slide.frontmatter.layout = SlideLayout.Default;
      }
      if (slide.docFrontMatter.theme) {
        slide.frontmatter.theme = slide.docFrontMatter.theme;
      }
      if (slide.docFrontMatter.customTheme) {
        slide.frontmatter.customTheme = slide.docFrontMatter.customTheme;
      }
      if (slide.docFrontMatter.transition && !slide.frontmatter.transition) {
        slide.frontmatter.transition = slide.docFrontMatter.transition;
      }

      if (slide.docFrontMatter.header && !slide.frontmatter.header) {
        slide.frontmatter.header = slide.docFrontMatter.header;
      }
      if (slide.docFrontMatter.footer && !slide.frontmatter.footer) {
        slide.frontmatter.footer = slide.docFrontMatter.footer;
      }

      for (const [key, value] of Object.entries(slide.docFrontMatter)) {
        if (
          ![
            'theme',
            'customTheme',
            'customLayout',
            'transition',
            'header',
            'footer',
            'layout',
            'image',
            'autoAdvanceAfter',
            'slide',
            'hide',
          ].includes(key) &&
          slide.frontmatter[key] === undefined
        ) {
          slide.frontmatter[key] = value;
        }
      }

      return slide;
    });

    return { slides: parsedSlides, locations };
  }

  /**
   * Checks if a line closes a code block: the same fence character, at least as long as the
   * opening fence, and nothing after it.
   */
  private static isClosingFence(trimmed: string, openingFence: string): boolean {
    const match = /^(`{3,}|~{3,})$/.exec(trimmed);
    return !!match && match[1][0] === openingFence[0] && match[1].length >= openingFence.length;
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

        // Combine parts
        return `${delimiter}${frontmatterStr}${slide.content}`;
      })
      .join('\n\n');
  }
}
