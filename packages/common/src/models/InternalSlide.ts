import { SlideMetadata, SlideSource } from '.';

export interface InternalSlide {
  content: string;
  rawContent: string;
  docFrontMatter: SlideMetadata;
  frontmatter: SlideMetadata;
  index: number;
  notes?: string;
  source?: SlideSource;
}
