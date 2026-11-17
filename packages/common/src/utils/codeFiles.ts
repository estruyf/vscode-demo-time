import { getOpeningFence, isClosingFence } from './codeFence';
import { htmlEncode } from './htmlEncode';

/**
 * Code blocks that show code from a workspace file, like:
 *
 * ```ts file="src/app.ts#L10-24"
 * ```
 */

const FILE_OPTION = /(^|\s)file=(?:"([^"]*)"|'([^']*)')(?=\s|$)/;

export interface CodeFileReference {
  /**
   * The path of the file, without the line range or region
   */
  path: string;
  /**
   * The line range, from `#L10-24`, `#L10-L24` or `#L10`
   */
  lines?: { start: number; end: number };
  /**
   * The region, from `#region=setup`
   */
  region?: string;
}

export interface CodeFileBlock {
  /**
   * The `file` value as written in the slide
   */
  value: string;
  reference: CodeFileReference;
  /**
   * The language of the code block, empty when the fence has none
   */
  lang: string;
  /**
   * The info string without the `file` option
   */
  info: string;
  /**
   * Zero-based line of the opening fence
   */
  line: number;
  /**
   * Character range of the `file="..."` option on the opening fence line
   */
  start: number;
  end: number;
  /**
   * Zero-based line of the closing fence, or the last line when the block isn't closed
   */
  endLine: number;
  fence: string;
  indent: string;
}

export interface CodeFileResult {
  code?: string;
  error?: string;
}

const LANGUAGES: Record<string, string> = {
  cjs: 'js',
  cts: 'ts',
  htm: 'html',
  mjs: 'js',
  mts: 'ts',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  sh: 'bash',
  yml: 'yaml',
  zsh: 'bash',
};

/**
 * Gets the code block language for a file, based on its extension.
 */
export const getCodeFileLanguage = (filePath: string) => {
  const name = filePath.split(/[\\/]/).pop() || '';
  if (name.toLowerCase() === 'dockerfile') {
    return 'docker';
  }

  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : '';
  return LANGUAGES[ext] || ext;
};

/**
 * Parses a `file` value like `src/app.ts#L10-24` or `src/app.ts#region=setup`.
 */
export const parseCodeFileReference = (value: string): CodeFileReference => {
  const hashIdx = value.lastIndexOf('#');
  if (hashIdx < 0) {
    return { path: value.trim() };
  }

  const path = value.slice(0, hashIdx).trim();
  const fragment = value.slice(hashIdx + 1).trim();

  const lineMatch = /^L(\d+)(?:-L?(\d+))?$/i.exec(fragment);
  if (lineMatch) {
    const start = parseInt(lineMatch[1], 10);
    const end = lineMatch[2] ? parseInt(lineMatch[2], 10) : start;
    return { path, lines: { start: Math.min(start, end), end: Math.max(start, end) } };
  }

  const regionMatch = /^region=(.+)$/i.exec(fragment);
  if (regionMatch) {
    return { path, region: regionMatch[1].trim() };
  }

  // Not a line range or region, so the `#` is part of the file name
  return { path: value.trim() };
};

const REGION_START = /#region\b\s*(.*?)\s*(?:\*\/|-->)?\s*$/;
const REGION_END = /#endregion\b/;

/**
 * Removes the indentation that all lines have in common.
 */
const dedent = (lines: string[]) => {
  const indents = lines
    .filter((line) => line.trim() !== '')
    .map((line) => /^[ \t]*/.exec(line)?.[0].length ?? 0);
  const min = indents.length > 0 ? Math.min(...indents) : 0;
  return min > 0 ? lines.map((line) => line.slice(min)) : lines;
};

/**
 * Gets the code for a reference from the content of its file.
 */
export const getCodeFromFile = (content: string, reference: CodeFileReference): CodeFileResult => {
  const lines = content.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');

  if (reference.lines) {
    const { start, end } = reference.lines;
    if (start < 1 || end > lines.length) {
      return {
        error: `Lines ${start}-${end} are outside of ${reference.path}, which has ${lines.length} line${lines.length === 1 ? '' : 's'}.`,
      };
    }
    return { code: dedent(lines.slice(start - 1, end)).join('\n') };
  }

  if (reference.region) {
    let startIdx = -1;
    let depth = 0;
    for (let i = 0; i < lines.length; i++) {
      const startMatch = REGION_START.exec(lines[i]);
      if (startIdx < 0) {
        if (startMatch && startMatch[1] === reference.region) {
          startIdx = i;
        }
        continue;
      }

      if (startMatch) {
        depth++;
      } else if (REGION_END.test(lines[i])) {
        if (depth === 0) {
          // Leave out the markers of nested regions, they are only there for the slides
          const regionLines = lines
            .slice(startIdx + 1, i)
            .filter((line) => !REGION_START.test(line) && !REGION_END.test(line));
          return { code: dedent(regionLines).join('\n') };
        }
        depth--;
      }
    }

    return {
      error:
        startIdx < 0
          ? `Region "${reference.region}" not found in ${reference.path}. Mark it with "#region ${reference.region}" and "#endregion" comments.`
          : `Region "${reference.region}" in ${reference.path} has no "#endregion" comment.`,
    };
  }

  return { code: lines.join('\n') };
};

const splitInfo = (info: string) => {
  const trimmed = info.trim();
  const firstToken = trimmed.split(/\s+/)[0] || '';
  // The language is the first word, unless the info starts with an option like `{1-3}`
  const hasLang = !!firstToken && !/^[{"'/]/.test(firstToken) && !firstToken.includes('=');
  return {
    lang: hasLang ? firstToken : '',
    rest: hasLang ? trimmed.slice(firstToken.length).trim() : trimmed,
  };
};

/**
 * Finds the code blocks with a `file` option in a markdown document.
 */
export const getCodeFileBlocks = (markdown: string): CodeFileBlock[] => {
  const lines = markdown.split(/\r?\n/);
  const blocks: CodeFileBlock[] = [];
  let open: { fence: string; block?: CodeFileBlock } | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (open) {
      if (isClosingFence(trimmed, open.fence)) {
        if (open.block) {
          open.block.endLine = i;
          blocks.push(open.block);
        }
        open = undefined;
      }
      continue;
    }

    const indent = /^ {0,3}/.exec(line)?.[0] ?? '';
    const fence = line.startsWith(indent) ? getOpeningFence(line.slice(indent.length)) : undefined;
    if (!fence || /^\s/.test(line.slice(indent.length))) {
      continue;
    }

    const infoStart = indent.length + fence.length;
    const info = line.slice(infoStart);
    open = { fence };

    // A backtick fence can't have backticks in its info string
    if (fence[0] === '`' && info.includes('`')) {
      continue;
    }

    const fileMatch = FILE_OPTION.exec(info);
    if (!fileMatch) {
      continue;
    }

    const value = fileMatch[2] ?? fileMatch[3] ?? '';
    const optionStart = infoStart + fileMatch.index + fileMatch[1].length;
    const withoutFile = (
      info.slice(0, fileMatch.index) +
      fileMatch[1] +
      info.slice(fileMatch.index + fileMatch[0].length)
    )
      .replace(/\s{2,}/g, ' ')
      .trim();
    const { lang } = splitInfo(withoutFile);

    open.block = {
      value,
      reference: parseCodeFileReference(value),
      lang,
      info: withoutFile,
      line: i,
      start: optionStart,
      end: infoStart + fileMatch.index + fileMatch[0].length,
      endLine: lines.length - 1,
      fence,
      indent,
    };
  }

  // A code block without a closing fence runs to the end of the document
  if (open?.block) {
    blocks.push(open.block);
  }

  return blocks;
};

/**
 * Renders the error for a code block of which the file or lines can't be loaded. It uses inline
 * styles so it also renders in the PDF export and slide screenshots.
 */
export const renderCodeFileError = (value: string, message: string) =>
  `<div class="demotime__code-file-error" role="alert" style="margin:0.5em 0;padding:0.75em 1em;color:#7f1d1d;background:#fef2f2;border:2px solid #f87171;font-family:sans-serif;font-size:0.8em;text-align:left;"><strong>Code file error</strong> <code style="color:inherit;background:transparent;">${htmlEncode(value)}</code><br />${htmlEncode(message)}</div>`;

export interface ResolveCodeFilesResult {
  markdown: string;
  /**
   * The paths of the files that the code blocks show, as written in the slide
   */
  files: string[];
  errors: { block: CodeFileBlock; message: string }[];
}

/**
 * Replaces the content of the code blocks with a `file` option by the code of that file.
 *
 * @param readFile Reads a file with the path as written in the slide, `undefined` when it doesn't
 * exist
 */
export const resolveCodeFiles = async (
  markdown: string,
  readFile: (path: string) => Promise<string | undefined>,
): Promise<ResolveCodeFilesResult> => {
  if (!markdown || !markdown.includes('file=')) {
    return { markdown, files: [], errors: [] };
  }

  const blocks = getCodeFileBlocks(markdown);
  if (blocks.length === 0) {
    return { markdown, files: [], errors: [] };
  }

  const lines = markdown.split(/\r?\n/);
  const files = new Set<string>();
  const errors: ResolveCodeFilesResult['errors'] = [];
  const cache = new Map<string, Promise<string | undefined>>();

  // Replace from the end, so the line numbers of the earlier blocks stay the same
  for (const block of [...blocks].reverse()) {
    const { reference, indent } = block;
    let result: CodeFileResult;
    if (!reference.path) {
      result = { error: 'The file option needs a path, like file="src/app.ts".' };
    } else {
      files.add(reference.path);
      if (!cache.has(reference.path)) {
        cache.set(
          reference.path,
          readFile(reference.path).catch(() => undefined),
        );
      }
      const content = await cache.get(reference.path);
      result =
        content === undefined
          ? { error: `File not found: ${reference.path}` }
          : getCodeFromFile(content, reference);
    }

    let replacement: string[];
    if (result.error !== undefined || result.code === undefined) {
      const message = result.error || `File not found: ${reference.path}`;
      errors.unshift({ block, message });
      replacement = ['', renderCodeFileError(block.value, message), ''];
    } else {
      const codeLines = result.code.split('\n');
      // Use a longer fence when the code itself has a fence
      const longestFence = codeLines.reduce((max, line) => {
        const lineFence = getOpeningFence(line.trim());
        return lineFence && lineFence[0] === block.fence[0] ? Math.max(max, lineFence.length) : max;
      }, 0);
      const fence = block.fence[0].repeat(Math.max(block.fence.length, longestFence + 1));
      const info = block.lang
        ? block.info
        : [getCodeFileLanguage(reference.path), block.info].filter(Boolean).join(' ');

      replacement = [
        `${indent}${fence}${info}`,
        ...codeLines.map((line) => (line ? `${indent}${line}` : line)),
        `${indent}${fence}`,
      ];
    }

    lines.splice(block.line, block.endLine - block.line + 1, ...replacement);
  }

  return { markdown: lines.join('\n'), files: Array.from(files), errors };
};
