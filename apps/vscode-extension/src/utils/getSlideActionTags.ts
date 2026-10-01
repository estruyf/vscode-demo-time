export interface SlideActionTag {
  /**
   * The value of the `id` attribute, or undefined when the tag has no (or an empty) `id`
   */
  id?: string;
  /**
   * The zero-based line of the tag
   */
  line: number;
  /**
   * The start character of the `id` value, or of the tag name when there is no `id`
   */
  start: number;
  /**
   * The end character of the `id` value, or of the tag name when there is no `id`
   */
  end: number;
}

const TAG_REGEX = /<dt-action\b([^>]*)>/gi;
const ID_ATTRIBUTE_REGEX = /(^|\s)id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

/**
 * Replaces inline code spans (`` `code` ``) with spaces, so tags in them are skipped while the
 * character positions stay the same.
 */
const maskInlineCode = (line: string) =>
  line.replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, (match) => ' '.repeat(match.length));

/**
 * Finds the `<dt-action>` tags in a slide file, outside of code blocks and inline code.
 *
 * @param content The contents of the slide file
 * @returns The tags with their `id` and the position to report diagnostics on
 */
export const getSlideActionTags = (content: string): SlideActionTag[] => {
  const tags: SlideActionTag[] = [];
  const lines = content.split(/\r?\n/);

  // The opening fence (``` or ~~~) of the code block we are in
  let codeFence: string | undefined;

  lines.forEach((text, line) => {
    const trimmed = text.trim();
    const fence = /^(`{3,}|~{3,})/.exec(trimmed);

    if (codeFence) {
      if (
        fence &&
        fence[1][0] === codeFence[0] &&
        fence[1].length >= codeFence.length &&
        trimmed === fence[1]
      ) {
        codeFence = undefined;
      }
      return;
    }

    if (fence) {
      codeFence = fence[1];
      return;
    }

    const masked = maskInlineCode(text);
    for (const match of masked.matchAll(TAG_REGEX)) {
      const tagStart = match.index ?? 0;
      const attributes = match[1] || '';
      const attributesStart = tagStart + '<dt-action'.length;
      const idMatch = ID_ATTRIBUTE_REGEX.exec(attributes);
      const id = idMatch ? (idMatch[2] ?? idMatch[3] ?? idMatch[4] ?? '').trim() : '';

      if (!idMatch || !id) {
        tags.push({ line, start: tagStart + 1, end: attributesStart });
        continue;
      }

      const rawValue = idMatch[2] ?? idMatch[3] ?? idMatch[4] ?? '';
      const quoted = idMatch[2] !== undefined || idMatch[3] !== undefined;
      const valueStart =
        attributesStart +
        (idMatch.index ?? 0) +
        idMatch[0].length -
        rawValue.length -
        (quoted ? 1 : 0);

      tags.push({ id, line, start: valueStart, end: valueStart + rawValue.length });
    }
  });

  return tags;
};
