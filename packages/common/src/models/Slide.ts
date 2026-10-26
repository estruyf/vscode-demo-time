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
  /**
   * Where the slide comes from, when the file was parsed with its includes (`src`)
   */
  source?: SlideSource;
}

export interface SlideSource {
  /**
   * The workspace-relative path of the file with the slide
   */
  path: string;
  /**
   * The 0-based index of the slide in that file
   */
  index: number;
  /**
   * For a slide of an included file: the index of the slide with the `src` in the parsed file
   */
  srcIndex?: number;
}
