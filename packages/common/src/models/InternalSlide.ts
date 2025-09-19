import { SlideMetadata } from '.';

export interface InternalSlide {
  content: string;
  rawContent: string;
  docFrontMatter: SlideMetadata;
  frontmatter: SlideMetadata;
  index: number;
}
