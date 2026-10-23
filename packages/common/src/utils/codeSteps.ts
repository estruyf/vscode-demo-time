/**
 * Step-through line highlighting for code blocks on slides, like ` ```ts {1-2|4-6|all} `.
 *
 * Each `|`-separated range is one click step. `all` (or `*`) shows the code without a focus.
 */

const STEPS_GROUP = /(^|\s)\{([^{}]*\|[^{}]*)\}(?=\s|$)/;
const CLICKS_OPTION = /(^|\s)clicks=["']?(\d+)["']?(?=\s|$)/;

export interface CodeStepsMeta {
  /**
   * The ranges of the steps, like `['1-2', '4-6', 'all']`
   */
  steps: string[];
  /**
   * The click on which the second range shows, like the `clicks` attribute of `dt-list`
   */
  clicks: number;
  /**
   * The meta string without the steps and the `clicks` option
   */
  meta: string;
}

const cleanMeta = (meta: string) => meta.replace(/\s{2,}/g, ' ').trim();

/**
 * Checks if a step range shows the whole code block without a focus.
 */
export const isAllLinesRange = (range: string) => {
  const value = range.trim().toLowerCase();
  return value === '' || value === 'all' || value === '*';
};

/**
 * Gets the steps from the meta string of a code block.
 *
 * @returns `undefined` when the code block has no steps
 */
export const parseCodeStepsMeta = (meta?: string | null): CodeStepsMeta | undefined => {
  if (!meta) {
    return undefined;
  }

  const match = STEPS_GROUP.exec(meta);
  if (!match) {
    return undefined;
  }

  const steps = match[2].split('|').map((step) => step.trim());
  let rest = meta.slice(0, match.index) + match[1] + meta.slice(match.index + match[0].length);

  let clicks = 1;
  const clicksMatch = CLICKS_OPTION.exec(rest);
  if (clicksMatch) {
    clicks = Math.max(1, parseInt(clicksMatch[2], 10) || 1);
    rest =
      rest.slice(0, clicksMatch.index) +
      clicksMatch[1] +
      rest.slice(clicksMatch.index + clicksMatch[0].length);
  }

  return { steps, clicks, meta: cleanMeta(rest) };
};

/**
 * Gets the line numbers (1-based) of a range like `1-3,5`.
 *
 * @returns `undefined` for `all`, which shows the code without a focus
 */
export const parseLineRange = (range: string): number[] | undefined => {
  if (isAllLinesRange(range)) {
    return undefined;
  }

  const lines = new Set<number>();
  for (const part of range.split(',')) {
    const value = part.trim();
    if (!value) {
      continue;
    }

    const [startValue, endValue] = value.split('-').map((nr) => parseInt(nr.trim(), 10));
    if (Number.isNaN(startValue)) {
      continue;
    }

    const end = endValue === undefined || Number.isNaN(endValue) ? startValue : endValue;
    for (let line = Math.min(startValue, end); line <= Math.max(startValue, end); line++) {
      if (line > 0) {
        lines.add(line);
      }
    }
  }

  return Array.from(lines).sort((a, b) => a - b);
};

/**
 * The index of the range to show for a click step.
 */
export const getCodeStepIndex = (clickStep: number, totalSteps: number, clicks = 1) =>
  Math.min(Math.max(clickStep - clicks + 1, 0), Math.max(totalSteps - 1, 0));

/**
 * The last click step of a code block with steps, for the shared click step counter.
 */
export const getCodeStepsLastClick = (totalSteps: number, clicks = 1) =>
  Math.max(clicks + totalSteps - 2, 0);
