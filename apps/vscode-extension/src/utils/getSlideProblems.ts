import yaml from 'js-yaml';
import {
  getTemplateSyntaxError,
  SLIDE_PROPERTIES,
  SlideMetadata,
  SlideParser,
  toBoolean,
} from '@demotime/common';

export type SlideProblemCode =
  | 'slide-yaml-error'
  | 'slide-unknown-property'
  | 'slide-invalid-value'
  | 'slide-missing-file'
  | 'slide-template-error'
  | 'slide-ambiguous-separator';

export type SlideProblemSeverity = 'error' | 'warning' | 'information';

/**
 * A range on a single line, with zero-based line and character positions
 */
export interface SlideTextRange {
  line: number;
  start: number;
  end: number;
}

export interface SlideProblemFix {
  title: string;
  range: SlideTextRange;
  text: string;
}

export interface SlideProblem {
  code: SlideProblemCode;
  message: string;
  severity: SlideProblemSeverity;
  range: SlideTextRange;
  fix?: SlideProblemFix;
}

export interface SlideProblemsHost {
  /**
   * Checks if a file exists, with the path as written in the front matter (relative to the
   * workspace folder)
   */
  fileExists: (path: string) => Promise<boolean>;
  /**
   * Reads a file, with the path as written in the front matter (relative to the workspace folder)
   */
  readFile: (path: string) => Promise<string | undefined>;
  /**
   * The header and footer templates of the settings, which can read any front matter property
   */
  templates?: string[];
}

interface FrontmatterBlock {
  start: number;
  end: number;
  isDocument: boolean;
  slideIndexes: number[];
}

interface FrontmatterEntry {
  key: string;
  keyRange: SlideTextRange;
  valueRange?: SlideTextRange;
}

// A top-level `key:` line in a YAML mapping
const KEY_LINE = /^(["']?)([A-Za-z_$][\w$.-]*)\1\s*:(?=\s|$)/;
// The line after a `---` that makes the parser look for front matter
const FRONTMATTER_START = /^\w+\s*:/;
const NOTES_START = /^<!--\s*notes(?=\s|-->|$)/i;
const CODE_FENCE = /^(`{3,}|~{3,})/;
// A scheme like `https:` or `data:`, but not a Windows drive letter
const URL_SCHEME = /^[a-z][a-z\d+.-]+:/i;

/**
 * Finds the problems in the front matter of a slide file: YAML errors, unknown properties,
 * invalid values, missing files, invalid Handlebars templates, and `---` separators that start a
 * front matter block instead of new slide content.
 *
 * @param markdown The content of the slide file
 * @param host Reads the files that the front matter refers to
 */
export const getSlideProblems = async (
  markdown: string,
  host: SlideProblemsHost,
): Promise<SlideProblem[]> => {
  if (!markdown.trim()) {
    return [];
  }

  const lines = markdown.split(/\r?\n/);
  const parser = new SlideParser();
  const slides = parser.parseSlides(markdown);
  const locations = parser.getSlideLocations(markdown);

  const fileCache = new Map<string, Promise<string | undefined>>();
  const readFile = (path: string) => {
    if (!fileCache.has(path)) {
      fileCache.set(
        path,
        host.readFile(path).catch(() => undefined),
      );
    }
    return fileCache.get(path)!;
  };

  const blocks = new Map<number, FrontmatterBlock>();
  locations.forEach((location, idx) => {
    if (!location.frontmatter) {
      return;
    }

    const { start, end } = location.frontmatter;
    const block = blocks.get(start);
    if (block) {
      block.slideIndexes.push(idx);
    } else {
      blocks.set(start, { start, end, isDocument: !!location.isDocument, slideIndexes: [idx] });
    }
  });

  const problems: SlideProblem[] = [];
  const acceptedLines = new Set<number>();

  for (const block of blocks.values()) {
    acceptedLines.add(block.start);
    acceptedLines.add(block.end);

    // The properties of the document front matter are passed to every slide
    const slideIndexes = block.isDocument ? slides.map((_, idx) => idx) : block.slideIndexes;
    const templates = await getTemplates(
      slideIndexes.map((idx) => slides[idx]?.frontmatter),
      host.templates || [],
      readFile,
    );

    problems.push(...(await getBlockProblems(lines, block, templates, host, readFile)));
  }

  problems.push(...getYamlProblems(lines, acceptedLines));

  return problems.sort((a, b) => a.range.line - b.range.line || a.range.start - b.range.start);
};

/**
 * Gets the closest value of a list, for a "did you mean" suggestion. A value that only differs
 * in case always matches.
 *
 * @returns The closest candidate, or `undefined` when none of them is close enough
 */
export const getClosestMatch = (
  value: string,
  candidates: readonly string[],
): string | undefined => {
  const lower = value.toLowerCase();
  const sameCase = candidates.find((candidate) => candidate.toLowerCase() === lower);
  if (sameCase) {
    return sameCase;
  }

  const maxDistance = lower.length <= 3 ? 0 : lower.length <= 7 ? 1 : 2;
  let closest: string | undefined;
  let closestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = getEditDistance(lower, candidate.toLowerCase());
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }

  return closestDistance <= maxDistance ? closest : undefined;
};

const getEditDistance = (a: string, b: string): number => {
  let previous = Array.from({ length: b.length + 1 }, (_, idx) => idx);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
};

/**
 * Gets the templates that can read the front matter properties of the slides: their header,
 * footer and custom layout, and the header and footer templates of the settings.
 */
const getTemplates = async (
  frontmatters: (SlideMetadata | undefined)[],
  settingTemplates: string[],
  readFile: (path: string) => Promise<string | undefined>,
): Promise<string[]> => {
  const templates = [...settingTemplates];
  for (const frontmatter of frontmatters) {
    for (const key of ['header', 'footer']) {
      if (typeof frontmatter?.[key] === 'string') {
        templates.push(frontmatter[key]);
      }
    }

    if (typeof frontmatter?.customLayout === 'string') {
      const layout = await readFile(frontmatter.customLayout);
      if (layout) {
        templates.push(layout);
      }
    }
  }
  return templates;
};

const isReferenced = (key: string, templates: string[]): boolean => {
  const pattern = new RegExp(`(^|[^\\w$])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w$]|$)`);
  return templates.some((template) => pattern.test(template));
};

const getEntries = (lines: string[], block: FrontmatterBlock): FrontmatterEntry[] => {
  const entries: FrontmatterEntry[] = [];
  for (let line = block.start + 1; line < block.end; line++) {
    const text = lines[line];
    const match = KEY_LINE.exec(text);
    if (!match) {
      continue;
    }

    const [full, quote, key] = match;
    const keyStart = quote.length;
    entries.push({
      key,
      keyRange: { line, start: keyStart, end: keyStart + key.length },
      valueRange: getValueRange(text, line, full.length),
    });
  }
  return entries;
};

/**
 * The value after the colon of a `key: value` line, without a trailing comment
 */
const getValueRange = (text: string, line: number, from: number): SlideTextRange | undefined => {
  let start = from;
  while (start < text.length && /\s/.test(text[start])) {
    start++;
  }

  let end = text.length;
  if (!/^["']/.test(text.slice(start))) {
    const comment = text.slice(start).search(/\s#/);
    if (comment >= 0) {
      end = start + comment;
    }
  }
  while (end > start && /\s/.test(text[end - 1])) {
    end--;
  }

  return end > start ? { line, start, end } : undefined;
};

const getBlockProblems = async (
  lines: string[],
  block: FrontmatterBlock,
  templates: string[],
  host: SlideProblemsHost,
  readFile: (path: string) => Promise<string | undefined>,
): Promise<SlideProblem[]> => {
  let data: SlideMetadata = {};
  try {
    const parsed = yaml.load(lines.slice(block.start + 1, block.end).join('\n'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      data = parsed as SlideMetadata;
    }
  } catch {
    // The parser only accepts valid YAML as front matter
  }

  const entries = getEntries(lines, block);
  const knownKeys = Object.keys(SLIDE_PROPERTIES);
  const unknown = entries
    .filter(({ key }) => !SLIDE_PROPERTIES[key] && !isReferenced(key, templates))
    .map((entry) => ({ ...entry, suggestion: getClosestMatch(entry.key, knownKeys) }));

  // A `---` followed by a `Word: text` line reads the lines up to the next `---` as front matter.
  // Text starts with a capital (`Note:`), while front matter properties are camelCase.
  const isSeparator =
    !block.isDocument &&
    entries.length > 0 &&
    /^[A-Z]/.test(entries[0].key) &&
    unknown.length === entries.length &&
    unknown.every(({ suggestion }) => !suggestion);
  if (isSeparator) {
    const separatorEnd = lines[block.start].length;
    // One-based numbers of the lines between the `---` lines
    const first = block.start + 2;
    const last = block.end;
    const hiddenLines =
      first === last
        ? `line ${first} into front matter, so it isn't`
        : `lines ${first}-${last} into front matter, so they aren't`;
    return [
      {
        code: 'slide-ambiguous-separator',
        severity: 'warning',
        message: `The "${lines[block.start + 1].trim()}" line after this "---" turns ${hiddenLines} shown on the slide. Add an empty line after "---" if this is slide content.`,
        range: { line: block.start, start: 0, end: separatorEnd },
        fix: {
          title: 'Add an empty line after "---" to show the lines on the slide',
          range: { line: block.start, start: separatorEnd, end: separatorEnd },
          text: '\n',
        },
      },
    ];
  }

  const problems: SlideProblem[] = [];
  for (const { key, keyRange, suggestion } of unknown) {
    problems.push(
      suggestion
        ? {
            code: 'slide-unknown-property',
            severity: 'warning',
            message: `Unknown slide property "${key}". Did you mean "${suggestion}"?`,
            range: keyRange,
            fix: { title: `Change to "${suggestion}"`, range: keyRange, text: suggestion },
          }
        : {
            code: 'slide-unknown-property',
            severity: 'information',
            message: `Demo Time doesn't use the "${key}" property, and no custom layout, header or footer template reads it.`,
            range: keyRange,
          },
    );
  }

  for (const { key, keyRange, valueRange } of entries) {
    const property = SLIDE_PROPERTIES[key];
    const value = data[key];
    if (!property || value === undefined || value === null) {
      continue;
    }

    const range = valueRange || keyRange;
    const problem = await getValueProblem(key, value, range, host, readFile);
    if (problem) {
      problems.push(problem);
    }
  }

  return problems;
};

const getValueProblem = async (
  key: string,
  value: unknown,
  range: SlideTextRange,
  host: SlideProblemsHost,
  readFile: (path: string) => Promise<string | undefined>,
): Promise<SlideProblem | undefined> => {
  const property = SLIDE_PROPERTIES[key];
  const invalid = (message: string, fix?: SlideProblemFix): SlideProblem => ({
    code: 'slide-invalid-value',
    severity: 'warning',
    message,
    range,
    fix,
  });

  switch (property.type) {
    case 'boolean':
      return toBoolean(value) === undefined
        ? invalid(`"${key}" expects true or false, but got "${String(value)}".`)
        : undefined;

    case 'number': {
      const isNumber =
        typeof value === 'number' ||
        (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)));
      return isNumber
        ? undefined
        : invalid(`"${key}" expects a number, but got "${String(value)}".`);
    }

    case 'enum': {
      const values = property.values || [];
      const text = String(value).trim();
      const isValid = property.ignoreCase
        ? values.some((allowed) => allowed.toLowerCase() === text.toLowerCase())
        : values.includes(text);
      if (isValid) {
        return undefined;
      }

      const suggestion = getClosestMatch(text, values);
      const options = values.map((allowed) => `"${allowed}"`).join(', ');
      return invalid(
        suggestion
          ? `Invalid ${key} value "${text}". Did you mean "${suggestion}"?`
          : `Invalid ${key} value "${text}". Use one of ${options}.`,
        suggestion ? { title: `Change to "${suggestion}"`, range, text: suggestion } : undefined,
      );
    }

    case 'template': {
      if (typeof value !== 'string') {
        return undefined;
      }
      const error = getTemplateSyntaxError(value);
      return error
        ? {
            code: 'slide-template-error',
            severity: 'error',
            message: `The ${key} template has a Handlebars error: ${error}`,
            range,
          }
        : undefined;
    }

    case 'file': {
      if (typeof value !== 'string') {
        return invalid(`"${key}" expects a file path, but got "${String(value)}".`);
      }

      const path = value.trim();
      if (!path || URL_SCHEME.test(path)) {
        return undefined;
      }

      if (!(await fileExists(path, host))) {
        return {
          code: 'slide-missing-file',
          severity: key === 'customLayout' ? 'error' : 'warning',
          message: `The ${key} file "${path}" doesn't exist. Paths are relative to the workspace folder.`,
          range,
        };
      }

      if (key !== 'customLayout') {
        return undefined;
      }

      const layout = await readFile(path);
      if (!layout?.trim()) {
        return {
          code: 'slide-template-error',
          severity: 'error',
          message: `The custom layout "${path}" is empty.`,
          range,
        };
      }

      const error = getTemplateSyntaxError(layout);
      return error
        ? {
            code: 'slide-template-error',
            severity: 'error',
            message: `The custom layout "${path}" has a Handlebars error: ${error}`,
            range,
          }
        : undefined;
    }

    default:
      return undefined;
  }
};

const fileExists = async (path: string, host: SlideProblemsHost): Promise<boolean> => {
  // The preview loads the path as a URL, so a query or hash is not part of the file name
  const filePath = path.replace(/[?#].*$/, '');
  try {
    if (await host.fileExists(filePath)) {
      return true;
    }

    const decoded = decodeURIComponent(filePath);
    return decoded !== filePath && (await host.fileExists(decoded));
  } catch {
    return false;
  }
};

/**
 * Finds the `---` blocks that look like front matter, but that the parser shows as slide content
 * because their YAML is invalid.
 */
const getYamlProblems = (lines: string[], acceptedLines: Set<number>): SlideProblem[] => {
  const problems: SlideProblem[] = [];
  let codeFence: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (codeFence) {
      const closing = /^(`{3,}|~{3,})$/.exec(trimmed);
      if (closing && closing[1][0] === codeFence[0] && closing[1].length >= codeFence.length) {
        codeFence = undefined;
      }
      continue;
    }

    const openingFence = CODE_FENCE.exec(trimmed);
    if (openingFence) {
      codeFence = openingFence[1];
      continue;
    }

    // A `---` in the speaker notes is part of the notes, unless the notes block is never closed
    if (NOTES_START.test(trimmed)) {
      let notesEnd = i;
      if (!trimmed.replace(NOTES_START, '').includes('-->')) {
        notesEnd = lines.findIndex((line, idx) => idx > i && line.includes('-->'));
      }
      if (notesEnd >= 0) {
        i = notesEnd;
        continue;
      }
    }

    if (trimmed !== '---' || acceptedLines.has(i)) {
      continue;
    }

    if (i > 0 && !FRONTMATTER_START.test(lines[i + 1] || '')) {
      continue;
    }

    let end = i + 1;
    while (end < lines.length && lines[end].trim() !== '---') {
      end++;
    }
    if (end >= lines.length) {
      continue;
    }

    const blockLines = lines.slice(i + 1, end);
    const problem = getYamlProblem(blockLines, i);
    if (problem) {
      problems.push(problem);
    }
    // The closing `---` can start the next block
    i = end - 1;
  }

  return problems;
};

const getYamlProblem = (blockLines: string[], start: number): SlideProblem | undefined => {
  // The parser keeps a heading after an empty line as slide content on purpose
  const hasHeading = blockLines.some(
    (line, idx) => idx > 0 && blockLines[idx - 1].trim() === '' && /^#{1,6}\s/.test(line),
  );
  const looksLikeYaml = blockLines.every(
    (line) => line.trim() === '' || /^(\s+\S|#|-(\s|$)|["']?[\w$.-]+["']?\s*:(\s|$))/.test(line),
  );
  if (blockLines.length === 0 || hasHeading || !looksLikeYaml) {
    return undefined;
  }

  try {
    yaml.load(blockLines.join('\n'));
    return undefined;
  } catch (e) {
    const error = e as {
      reason?: string;
      message?: string;
      mark?: { line: number; column: number };
    };
    const reason = error.reason || error.message || 'invalid YAML';
    let lineIdx = Math.min(Math.max(error.mark?.line ?? 0, 0), blockLines.length - 1);
    // Point at the last line with text when the error is at the end of the block
    while (lineIdx > 0 && blockLines[lineIdx].trim() === '') {
      lineIdx--;
    }

    const text = blockLines[lineIdx];
    const indent = text.length - text.trimStart().length;
    return {
      code: 'slide-yaml-error',
      severity: 'error',
      message: `Invalid front matter: ${reason}. The slide shows these lines as content.`,
      range: { line: start + 1 + lineIdx, start: indent, end: Math.max(text.length, indent + 1) },
    };
  }
};
