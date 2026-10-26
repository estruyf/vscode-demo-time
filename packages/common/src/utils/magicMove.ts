import { getOpeningFence, isClosingFence } from './codeFence';

/**
 * Animated code changes on slides (magic move), like:
 *
 * ````md magic-move
 * ```ts
 * const add = (a, b) => a + b;
 * ```
 * ```ts
 * const add = (a: number, b: number): number => a + b;
 * ```
 * ````
 *
 * Each code block inside the `magic-move` block is one step.
 */

const MAGIC_MOVE_OPTION = /(^|\s)magic-move(?=\s|$)/;
const CLICKS_OPTION = /(^|\s)clicks=["']?(\d+)["']?(?=\s|$)/;
const DURATION_OPTION = /(^|\s)duration=["']?(\d+)["']?(?=\s|$)/;
const LINE_NUMBERS_OPTION = /(^|\s)showLineNumbers(?=[\s{]|$)/;

/**
 * The default duration of the animation between two steps, in milliseconds
 */
export const MAGIC_MOVE_DURATION = 800;

export interface MagicMoveMeta {
  /**
   * The click on which the second step shows, like the `clicks` attribute of `dt-list`
   */
  clicks: number;
  /**
   * The duration of the animation in milliseconds
   */
  duration: number;
  /**
   * Shows the line numbers (`showLineNumbers`)
   */
  lineNumbers: boolean;
  /**
   * The meta string without the `magic-move`, `clicks` and `duration` options
   */
  meta: string;
}

export interface MagicMoveStep {
  lang: string;
  code: string;
}

const removeMatch = (value: string, match: RegExpExecArray) =>
  value.slice(0, match.index) + match[1] + value.slice(match.index + match[0].length);

/**
 * Gets the options of a `magic-move` code block.
 *
 * @param lang The language of the code block, ` ````magic-move ` works without `md` too
 * @returns `undefined` when the code block isn't a `magic-move` block
 */
export const parseMagicMoveMeta = (
  lang?: string | null,
  meta?: string | null,
): MagicMoveMeta | undefined => {
  let rest = meta || '';
  const magicMoveMatch = MAGIC_MOVE_OPTION.exec(rest);
  if (!magicMoveMatch && lang !== 'magic-move') {
    return undefined;
  }

  if (magicMoveMatch) {
    rest = removeMatch(rest, magicMoveMatch);
  }

  let clicks = 1;
  const clicksMatch = CLICKS_OPTION.exec(rest);
  if (clicksMatch) {
    clicks = Math.max(1, parseInt(clicksMatch[2], 10) || 1);
    rest = removeMatch(rest, clicksMatch);
  }

  let duration = MAGIC_MOVE_DURATION;
  const durationMatch = DURATION_OPTION.exec(rest);
  if (durationMatch) {
    duration = Math.max(0, parseInt(durationMatch[2], 10));
    rest = removeMatch(rest, durationMatch);
  }

  return {
    clicks,
    duration,
    lineNumbers: LINE_NUMBERS_OPTION.test(rest),
    meta: rest.replace(/\s{2,}/g, ' ').trim(),
  };
};

/**
 * Gets the code blocks inside a `magic-move` block. Text outside the code blocks is ignored.
 */
export const parseMagicMoveSteps = (content: string): MagicMoveStep[] => {
  const steps: MagicMoveStep[] = [];
  let open: { fence: string; lang: string; lines: string[] } | undefined;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (open) {
      if (isClosingFence(trimmed, open.fence)) {
        steps.push({ lang: open.lang, code: open.lines.join('\n') });
        open = undefined;
      } else {
        open.lines.push(line);
      }
      continue;
    }

    const fence = getOpeningFence(trimmed);
    if (!fence) {
      continue;
    }

    const lang = trimmed.slice(fence.length).trim().split(/[\s{]/)[0] || 'plaintext';
    open = { fence, lang, lines: [] };
  }

  // A code block without a closing fence runs to the end of the block
  if (open) {
    steps.push({ lang: open.lang, code: open.lines.join('\n') });
  }

  return steps;
};
