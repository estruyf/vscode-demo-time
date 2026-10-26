import { SlideIncludes } from '../models';
import {
  getSlideIncludeSrc,
  normalizeSlidePath,
  resolveSlideIncludePath,
} from '../utils/slideIncludes';
import { SlideParser } from './SlideParser';

// Stops reading files when the includes keep going, like with generated files
const MAX_INCLUDED_FILES = 200;

/**
 * Gets the workspace-relative paths of the files that the slides of a file include with `src`.
 *
 * @param markdown The content of the slide file
 * @param filePath The workspace-relative path of the slide file
 */
export const getSlideIncludePaths = (markdown: string, filePath: string): string[] => {
  if (!markdown || !markdown.includes('src')) {
    return [];
  }

  const paths = new Set<string>();
  for (const slide of new SlideParser().parseSlides(markdown)) {
    const src = getSlideIncludeSrc(slide.frontmatter);
    const path = src ? resolveSlideIncludePath(filePath, src) : undefined;
    if (path) {
      paths.add(path);
    }
  }
  return Array.from(paths);
};

/**
 * Reads the files that the slides of a file include with `src`, and the files that those files
 * include, for the `includes` option of the `SlideParser`.
 *
 * @param markdown The content of the slide file
 * @param filePath The workspace-relative path of the slide file
 * @param readFile Reads a file by its workspace-relative path, `undefined` when it can't be read
 */
export const collectSlideIncludes = async (
  markdown: string,
  filePath: string,
  readFile: (path: string) => Promise<string | undefined>,
): Promise<SlideIncludes> => {
  const rootPath = normalizeSlidePath(filePath) ?? filePath;
  const files: Record<string, string | undefined> = {};
  const queue = getSlideIncludePaths(markdown, rootPath);

  while (queue.length > 0 && Object.keys(files).length < MAX_INCLUDED_FILES) {
    const path = queue.shift()!;
    if (path === rootPath || Object.prototype.hasOwnProperty.call(files, path)) {
      continue;
    }

    let content: string | undefined;
    try {
      content = await readFile(path);
    } catch {
      content = undefined;
    }
    files[path] = content;

    if (content !== undefined) {
      queue.push(...getSlideIncludePaths(content, path));
    }
  }

  return { filePath: rootPath, files };
};

/**
 * Finds the include cycle that including a file creates: the files that include each other,
 * from the slide file back to itself.
 *
 * @param includes The files of `collectSlideIncludes`
 * @param includePath The workspace-relative path of the file that the slide file includes
 * @returns The files of the cycle, like `['a.md', 'b.md', 'a.md']`, or `undefined` without one
 */
export const getSlideIncludeCycle = (
  includes: SlideIncludes,
  includePath: string,
): string[] | undefined => {
  const rootPath = normalizeSlidePath(includes.filePath) ?? includes.filePath;
  const visited = new Set<string>();

  const find = (path: string, chain: string[]): string[] | undefined => {
    if (path === rootPath) {
      return [...chain, path];
    }

    const content = includes.files[path];
    if (visited.has(path) || content === undefined) {
      return undefined;
    }
    visited.add(path);

    for (const next of getSlideIncludePaths(content, path)) {
      const cycle = find(next, [...chain, path]);
      if (cycle) {
        return cycle;
      }
    }
    return undefined;
  };

  return find(includePath, [rootPath]);
};
