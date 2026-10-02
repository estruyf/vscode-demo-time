/**
 * Where a slide starts in its markdown file. Lines are 0-based.
 */
export interface SlideLocation {
  /**
   * The opening and closing `---` lines of the slide's frontmatter. For the first slide, this can
   * be the document frontmatter.
   */
  frontmatter?: { start: number; end: number };
  /**
   * Whether `frontmatter` is the document frontmatter, which also applies to the other slides
   */
  isDocument?: boolean;
  /**
   * The `---` line that separates the slide from the previous one, when it has no frontmatter
   */
  separatorLine?: number;
  /**
   * The last line of the slide
   */
  end?: number;
  /**
   * The opening and closing lines of the `<!-- notes ... -->` blocks of the slide
   */
  notes?: { start: number; end: number }[];
}
