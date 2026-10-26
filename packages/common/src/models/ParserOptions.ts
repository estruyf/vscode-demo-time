export interface ParserOptions {
  delimiterPattern?: RegExp;
  includeEmpty?: boolean;
  trimContent?: boolean;
  /**
   * The files that the slides include with `src`. Without it, a slide with `src` stays a slide.
   */
  includes?: SlideIncludes;
}

/**
 * A slide file and the files that its slides include with `src`
 */
export interface SlideIncludes {
  /**
   * The workspace-relative path of the parsed file, which `src` paths are relative to
   */
  filePath: string;
  /**
   * The content of the included files by their workspace-relative path, `undefined` when a file
   * can't be read
   */
  files: Record<string, string | undefined>;
}
