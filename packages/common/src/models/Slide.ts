import { SlideMetadata } from '.';

export interface Slide {
  content: string;
  rawContent: string;
  frontmatter: SlideMetadata;
  index: number;
  /**
   * The speaker notes from the `<!-- notes ... -->` blocks of the slide
   */
  notes?: string;
}
