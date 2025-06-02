import { FrontMatterParser } from './FrontMatterParser';
import { ParserOptions, Slide, InternalSlide, SlideMetadata } from '../models';
import { SlideLayout } from '../constants';

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

    // Extract document-level frontmatter
    const { frontmatter: docFrontMatter, remainingContent } =
      FrontMatterParser.extractFrontmatter(markdown);
    let processedMarkdown = remainingContent || markdown;

    // Split the markdown content into lines
    const lines = processedMarkdown.split(/\r?\n/);
    const slides: InternalSlide[] = [];

    let currentSlide: {
      content: string[];
      docFrontMatter: SlideMetadata;
      frontmatter: SlideMetadata;
      inCodeBlock: boolean;
      codeBlockMarker: string;
    } = {
      content: [],
      docFrontMatter: { ...docFrontMatter },
      frontmatter: {},
      inCodeBlock: false,
      codeBlockMarker: '```',
    };

    let slideStarted = true; // Set to true to capture the first slide content
    let collectingFrontmatter = false;
    let currentFrontmatter: SlideMetadata = {};

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Handle code blocks (to avoid misinterpreting code block content as delimiters)
      if (!currentSlide.inCodeBlock && trimmedLine.startsWith('```')) {
        currentSlide.inCodeBlock = true;
        currentSlide.codeBlockMarker = trimmedLine.match(/^`+/)?.[0] || '```';
        currentSlide.content.push(line);
        continue;
      }

      if (currentSlide.inCodeBlock) {
        currentSlide.content.push(line);
        if (trimmedLine.startsWith(currentSlide.codeBlockMarker)) {
          currentSlide.inCodeBlock = false;
        }
        continue;
      }

      // Check for slide delimiter
      if (trimmedLine === '---') {
        if (collectingFrontmatter) {
          // End of frontmatter section
          collectingFrontmatter = false;
          currentSlide.frontmatter = {
            ...currentSlide.frontmatter,
            ...currentFrontmatter,
          };
          currentFrontmatter = {};
        } else {
          // End of current slide, if not the first delimiter after frontmatter parsing
          if (slideStarted && (currentSlide.content.length > 0 || mergedOptions.includeEmpty)) {
            const slideContent = currentSlide.content.join('\n');
            slides.push({
              content: mergedOptions.trimContent ? slideContent.trim() : slideContent,
              rawContent: slideContent,
              docFrontMatter: { ...currentSlide.docFrontMatter },
              frontmatter: { ...currentSlide.frontmatter },
              index: slides.length,
            });
          }

          // Start a new slide and begin collecting frontmatter
          currentSlide = {
            content: [],
            docFrontMatter: { ...docFrontMatter },
            frontmatter: {},
            inCodeBlock: false,
            codeBlockMarker: '```',
          };
          collectingFrontmatter = true;
        }
        continue;
      }

      // Check for frontmatter key-value pairs when we're collecting frontmatter
      if (collectingFrontmatter) {
        // Match key-value pairs, allowing quoted values with colons and hashes
        const keyValueMatch = trimmedLine.match(/^(\w+):\s*(?:(["'])([\s\S]*?)\2|([^\n]+))$/);
        if (keyValueMatch) {
          const key = keyValueMatch[1];
          let value: string;
          if (keyValueMatch[3] !== undefined) {
            // Quoted value (may contain colons, hashes, etc.)
            value = keyValueMatch[3];
          } else {
            // Unquoted value, strip inline comments (anything after #)
            value = keyValueMatch[4].replace(/\s+#.*$/, '');
          }
          currentFrontmatter[key] = value.trim();
          continue;
        } else if (trimmedLine === '') {
          // Empty line within frontmatter is allowed
          continue;
        } else {
          // No more frontmatter, add what we've collected to the slide
          collectingFrontmatter = false;
          currentSlide.frontmatter = {
            ...currentSlide.frontmatter,
            ...currentFrontmatter,
          };
          currentFrontmatter = {};
          currentSlide.content.push(line);
        }
      } else {
        // Regular content line
        currentSlide.content.push(line);
      }
    }

    // Add the last slide if there's content
    if (currentSlide.content.length > 0 || mergedOptions.includeEmpty) {
      const slideContent = currentSlide.content.join('\n');
      slides.push({
        content: mergedOptions.trimContent ? slideContent.trim() : slideContent,
        rawContent: slideContent,
        docFrontMatter: { ...currentSlide.docFrontMatter },
        frontmatter: { ...currentSlide.frontmatter },
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
          !['theme', 'customTheme', 'transition', 'header', 'footer', 'layout'].includes(key) &&
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
    return slides.reduce((groups, slide) => {
      const propertyValue = slide.frontmatter[property] || SlideLayout.Default;
      if (!groups[propertyValue]) {
        groups[propertyValue] = [];
      }
      groups[propertyValue].push(slide);
      return groups;
    }, {} as Record<string, Slide[]>);
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
