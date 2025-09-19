import { SlideMetadata } from '.';

export interface Slide {
  content: string;
  rawContent: string;
  frontmatter: SlideMetadata;
  index: number;
}
