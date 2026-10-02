import { getSlidePropertyValues, SLIDE_PROPERTIES, SlideProperty } from '@demotime/common';
import { getFrontmatterRange } from './getFrontmatterRange';

// A top-level `key:` line in a YAML mapping
const KEY_LINE = /^(["']?)([A-Za-z_$][\w$.-]*)\1\s*:/;

export interface SlidePropertySuggestion {
  key: string;
  property: SlideProperty;
  /**
   * Sorts the suggestions: the properties of the layout of the slide first, then the properties
   * of every layout, then the properties of other layouts
   */
  sortGroup: number;
}

export type SlidePropertyCompletions =
  | { type: 'key'; suggestions: SlidePropertySuggestion[] }
  | { type: 'value'; key: string; property: SlideProperty; values: readonly string[] };

/**
 * Gets the front matter properties to suggest at a position of a slide file. On a line without a
 * `:`, these are the properties that the front matter block of the slide doesn't set yet. After
 * `key:`, these are the values of the property.
 *
 * @param lines The lines of the slide file
 * @param line The zero-based line of the cursor
 * @param character The zero-based character of the cursor
 * @returns The suggestions, or `undefined` when the position isn't in a front matter block
 */
export const getSlidePropertyCompletions = (
  lines: string[],
  line: number,
  character: number,
): SlidePropertyCompletions | undefined => {
  const block = getFrontmatterRange(lines, line);
  if (!block) {
    return undefined;
  }

  const linePrefix = (lines[line] || '').substring(0, character);
  // Lines in a nested mapping or list belong to another property
  if (/^\s/.test(linePrefix)) {
    return undefined;
  }

  if (linePrefix.includes(':')) {
    const key = KEY_LINE.exec(linePrefix)?.[2];
    const property = key ? getSlideProperty(key) : undefined;
    if (!key || !property) {
      return undefined;
    }
    return { type: 'value', key, property, values: getSlidePropertyValues(property) };
  }

  const blockKeys = new Map<string, string>();
  for (let idx = block.start + 1; idx < block.end; idx++) {
    const match = idx === line ? undefined : KEY_LINE.exec(lines[idx]);
    if (match) {
      blockKeys.set(match[2], lines[idx].slice(match[0].length).trim());
    }
  }
  const layout = blockKeys.get('layout')?.replace(/^(["'])(.*)\1$/, '$2');

  const suggestions = Object.entries(SLIDE_PROPERTIES)
    .filter(([key, property]) => !property.aliasOf && !blockKeys.has(key))
    .map(([key, property]) => ({
      key,
      property,
      sortGroup: !property.layouts
        ? 1
        : property.layouts.some((propertyLayout) => propertyLayout === layout)
          ? 0
          : 2,
    }));

  return { type: 'key', suggestions };
};

/**
 * Gets the front matter property of a line of a slide file, for the hover.
 *
 * @param lines The lines of the slide file
 * @param line The zero-based line
 * @returns The property and the position of its key on the line, or `undefined` when the line
 * isn't a known property in a front matter block
 */
export const getSlidePropertyAtLine = (
  lines: string[],
  line: number,
): { key: string; property: SlideProperty; start: number; end: number } | undefined => {
  if (!getFrontmatterRange(lines, line)) {
    return undefined;
  }

  const match = KEY_LINE.exec(lines[line] || '');
  const property = match ? getSlideProperty(match[2]) : undefined;
  if (!match || !property) {
    return undefined;
  }

  const start = match[1].length;
  return { key: match[2], property, start, end: start + match[2].length };
};

const getSlideProperty = (key: string): SlideProperty | undefined =>
  Object.prototype.hasOwnProperty.call(SLIDE_PROPERTIES, key) ? SLIDE_PROPERTIES[key] : undefined;
