export interface ParserOptions {
  delimiterPattern?: RegExp;
  includeEmpty?: boolean;
  trimContent?: boolean;
}

export interface Slide {
  content: string;
  rawContent: string;
  frontmatter: SlideFrontmatter;
  index: number;
}

export interface InternalSlide {
  content: string;
  rawContent: string;
  docFrontMatter: SlideFrontmatter;
  frontmatter: SlideFrontmatter;
  index: number;
}

export interface SlideFrontmatter {
  [key: string]: any;
}
