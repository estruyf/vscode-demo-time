import { Slide, SlideSource } from '../models/Slide';
import { SlideMetadata } from '../models/SlideMetadata';
import { getCodeFileBlocks } from './codeFiles';
import { htmlEncode } from './htmlEncode';

/**
 * Slides that include the slides of another markdown file, like:
 *
 * ---
 * src: ../shared/about-me.md
 * ---
 */

// A scheme like `https:`, but not a Windows drive letter
const URL_SCHEME = /^[a-z][a-z\d+.-]+:/i;

/**
 * Normalizes a workspace-relative path: forward slashes, without `.` and `..` segments, and
 * without a leading `/`.
 *
 * @returns `undefined` when the path goes above the workspace folder
 */
export const normalizeSlidePath = (path: string): string | undefined => {
  const segments: string[] = [];
  for (const segment of path.replace(/\\/g, '/').split('/')) {
    if (segment === '' || segment === '.') {
      continue;
    }

    if (segment === '..') {
      if (segments.length === 0) {
        return undefined;
      }
      segments.pop();
      continue;
    }

    segments.push(segment);
  }

  return segments.join('/');
};

/**
 * Gets the `src` of a slide that includes the slides of another file.
 *
 * @returns The path as written in the front matter, or `undefined` when the slide has no `src`
 */
export const getSlideIncludeSrc = (frontmatter?: SlideMetadata): string | undefined => {
  const src = frontmatter?.src;
  return typeof src === 'string' && src.trim() ? src.trim() : undefined;
};

/**
 * Resolves the `src` of a slide to a workspace-relative path. Paths are relative to the file of
 * the slide, or to the workspace folder when they start with `/`.
 *
 * @param filePath The workspace-relative path of the file with the slide
 * @param src The `src` as written in the front matter
 * @returns `undefined` for a URL, or a path outside the workspace folder
 */
export const resolveSlideIncludePath = (filePath: string, src: string): string | undefined => {
  const path = src.trim().replace(/\\/g, '/');
  if (!path || URL_SCHEME.test(path)) {
    return undefined;
  }

  const folder = path.startsWith('/')
    ? ''
    : filePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
  return normalizeSlidePath(`${folder}/${path}`) || undefined;
};

/**
 * Makes the `file` option of the code blocks of an included slide relative to the workspace
 * folder, as `./` and `../` paths are relative to the file the slide comes from.
 *
 * @param content The content of the included slide
 * @param filePath The workspace-relative path of the included file
 */
export const resolveIncludedCodeFilePaths = (content: string, filePath: string): string => {
  if (!content.includes('file=')) {
    return content;
  }

  const blocks = getCodeFileBlocks(content).filter(({ reference }) =>
    /^\.\.?\//.test(reference.path.replace(/\\/g, '/')),
  );
  if (blocks.length === 0) {
    return content;
  }

  const lines = content.split('\n');
  for (const block of blocks) {
    const path = resolveSlideIncludePath(filePath, block.reference.path);
    if (!path) {
      continue;
    }

    const line = lines[block.line];
    const quote = line[block.start + 'file='.length];
    // Keep the line range or region
    const { lines: range, region } = block.reference;
    const fragment = range || region ? block.value.slice(block.value.lastIndexOf('#')) : '';
    const value = `/${path}${fragment}`;
    lines[block.line] =
      `${line.slice(0, block.start)}file=${quote}${value}${quote}${line.slice(block.end)}`;
  }

  return lines.join('\n');
};

/**
 * Renders the content of a slide of which the `src` file can't be included. It uses inline
 * styles so it also renders in the PDF export and slide screenshots.
 */
export const renderSlideIncludeError = (src: string, message: string) =>
  `<div class="demotime__slide-include-error" role="alert" style="margin:0.5em 0;padding:0.75em 1em;color:#7f1d1d;background:#fef2f2;border:2px solid #f87171;font-family:sans-serif;font-size:0.8em;text-align:left;"><strong>Slide include error</strong> <code style="color:inherit;background:transparent;">${htmlEncode(src)}</code><br />${htmlEncode(message)}</div>`;

/**
 * Whether the slide comes from a file that the parsed file includes with `src`
 */
export const isIncludedSlide = (slide?: Pick<Slide, 'source'>): boolean =>
  slide?.source?.srcIndex !== undefined;

/**
 * Gets the index of a slide in its own file: for a slide of an included file, the index of the
 * slide with the `src` in the parsed file.
 */
export const getSlideFileIndex = (slide: Pick<Slide, 'index' | 'source'>): number =>
  slide.source ? (slide.source.srcIndex ?? slide.source.index) : slide.index;

/**
 * Finds the slide of a file in the slides of a file that includes other files.
 *
 * @param slides The parsed slides
 * @param rootPath The workspace-relative path of the parsed file
 * @param source The workspace-relative path of the file with the slide, and its index in that file
 * @param last For a slide with a `src`, gets its last included slide instead of the first one
 * @returns The index in `slides`, or `undefined` when the slide isn't part of them
 */
export const getSlideIndexForSource = (
  slides: Pick<Slide, 'source'>[],
  rootPath: string,
  source: Pick<SlideSource, 'path' | 'index'>,
  last = false,
): number | undefined => {
  const root = normalizeSlidePath(rootPath);
  const path = normalizeSlidePath(source.path);
  const isRoot = path === root;
  if (slides.every((slide) => !slide.source)) {
    return isRoot ? source.index : undefined;
  }

  const matches = ({ source: slideSource }: Pick<Slide, 'source'>) => {
    if (!slideSource) {
      return false;
    }
    if (!isRoot) {
      return slideSource.path === path && slideSource.index === source.index;
    }
    return slideSource.srcIndex === undefined
      ? slideSource.path === root && slideSource.index === source.index
      : slideSource.srcIndex === source.index;
  };

  let index = -1;
  slides.forEach((slide, idx) => {
    if (matches(slide) && (index < 0 || last)) {
      index = idx;
    }
  });
  if (index >= 0 || !isRoot) {
    return index >= 0 ? index : undefined;
  }

  // A slide after the parsed slides, like a slide that was just added to the file
  const lastFileIndex = Math.max(
    -1,
    ...slides.map((slide) => getSlideFileIndex({ index: -1, ...slide })),
  );
  return source.index > lastFileIndex
    ? slides.length + source.index - lastFileIndex - 1
    : undefined;
};
