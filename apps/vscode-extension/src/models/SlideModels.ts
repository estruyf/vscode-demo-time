import { SlideMetadata } from "./SlideMetadata";

export interface ParserOptions {
  delimiterPattern?: RegExp;
  includeEmpty?: boolean;
  trimContent?: boolean;
}

export interface Slide {
  content: string;
  rawContent: string;
  frontmatter: SlideMetadata;
  index: number;
}

export interface InternalSlide {
  content: string;
  rawContent: string;
  docFrontMatter: SlideMetadata;
  frontmatter: SlideMetadata;
  index: number;
}
