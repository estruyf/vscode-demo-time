import { ParserOptions, Slide, InternalSlide } from '../models';
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
    const mergedOptions: Required<ParserOptions> = {
      ...this.defaultOptions,
      ...this.options,
    };

    if (!markdown || markdown.trim() === '') {
      return [];
    }

    const { frontmatter: docFrontMatter, remainingContent } =
      FrontMatterParser.extractFrontmatter(markdown);
    const processedMarkdown = remainingContent || markdown;

    const lines = processedMarkdown.split(/\r?\n/);

    const slideBlocks: string[] = [];
    let buffer: string[] = [];
    let inCodeBlock = false;
    let codeBlockMarker = '```';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!inCodeBlock && /^`{3,}/.test(trimmed)) {
        inCodeBlock = true;
        const match = /^`+/.exec(trimmed);
        codeBlockMarker = match ? match[0] : '```';
        buffer.push(line);
        continue;
      }

      if (inCodeBlock) {
        buffer.push(line);
        if (trimmed.startsWith(codeBlockMarker)) {
          inCodeBlock = false;
        }
        continue;
      }

      if (trimmed === '---') {
        // Possible start of frontmatter for the next slide
        if (i + 1 < lines.length && /^\w+\s*:/m.test(lines[i + 1])) {
          if (buffer.length > 0 || mergedOptions.includeEmpty) {
            slideBlocks.push(buffer.join('\n'));
            buffer = [];
          }

          buffer.push(line);
          i++;
          while (i < lines.length) {
            buffer.push(lines[i]);
            if (lines[i].trim() === '---') {
              break;
            }
            i++;
          }
          continue;
        }

        slideBlocks.push(buffer.join('\n'));
        buffer = [];
        continue;
      }

      buffer.push(line);
    }

    if (buffer.length > 0 || mergedOptions.includeEmpty) {
      slideBlocks.push(buffer.join('\n'));
    }

    const slides: InternalSlide[] = [];

    for (const block of slideBlocks) {
      const trimmedBlock = mergedOptions.trimContent ? block.trimStart() : block;
      const { frontmatter, remainingContent: content } =
        FrontMatterParser.extractFrontmatter(trimmedBlock);
      const slideContent = content ?? trimmedBlock;

      if (
        slideContent.trim() === '' &&
        !mergedOptions.includeEmpty &&
        (!frontmatter || Object.keys(frontmatter).length === 0)
      ) {
        continue;
      }

      slides.push({
        content: mergedOptions.trimContent ? slideContent.trim() : slideContent,
        rawContent: slideContent,
        docFrontMatter: { ...docFrontMatter },
        frontmatter: frontmatter || {},
        index: slides.length,
      });
    }

    // Apply default layout where not specified
    return slides.map((slide, idx) => {
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
      if (slide.docFrontMatter.customLayout) {
        slide.frontmatter.customLayout = slide.docFrontMatter.customLayout;
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
          ].includes(key) &&
          slide.frontmatter[key] === undefined
        ) {
          slide.frontmatter[key] = value;
        }
      }

      return slide;
    });
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
          frontmatterStr = `---\n${Object.entries(slide.frontmatter)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')}\n---\n\n`;
        }

        // Add slide delimiter if not the first slide
        const delimiter = index > 0 ? '---\n\n' : '';

        // Combine parts
        return `${delimiter}${frontmatterStr}${slide.content}`;
      })
      .join('\n\n');
  }
}
