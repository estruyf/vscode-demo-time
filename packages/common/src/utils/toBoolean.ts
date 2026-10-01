/**
 * Converts a frontmatter value to a boolean. YAML parses `true`/`false` as booleans, but quoted
 * values (`"true"`) stay strings.
 *
 * @returns The boolean, or `undefined` when the value isn't a boolean.
 */
export const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return undefined;
};
