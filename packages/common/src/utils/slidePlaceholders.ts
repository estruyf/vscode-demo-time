import { SlideMetadata } from '../models';
import { toBoolean } from './toBoolean';

/**
 * Values for the header and footer templates that don't come from the front matter of the slide
 */
export interface SlidePlaceholders {
  /**
   * The slide number (1-based) over all acts. Hidden slides have no number.
   */
  crntSlideIdx?: number | null;
  /**
   * The number of slides over all acts, without hidden slides
   */
  totalSlides?: number;
  /**
   * The first heading of the slide
   */
  slideTitle?: string;
  /**
   * The title of the scene that opens the slide
   */
  sceneTitle?: string;
  /**
   * The title of the act that opens the slide
   */
  actTitle?: string;
  /**
   * The `demoTime.presentationTitle` setting, or the name of the workspace folder
   */
  presentationTitle?: string;
}

export type ProgressBarPosition = 'top' | 'bottom';
export type ProgressBarSetting = ProgressBarPosition | 'none';

// Text placeholders that a front matter property with the same name overrides
const OVERRIDABLE_PLACEHOLDERS: (keyof SlidePlaceholders)[] = [
  'slideTitle',
  'sceneTitle',
  'actTitle',
  'presentationTitle',
];

/**
 * Removes inline markdown and HTML from a heading, e.g. `**Demo** \`time\`` becomes `Demo time`
 */
const toPlainText = (heading: string) =>
  heading
    .replace(/<[^>]+>/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_|~~|`)(.+?)\1/g, '$2')
    .trim();

/**
 * Gets the first H1 of the slide, or else the first heading of any level. Headings in fenced code
 * blocks are skipped.
 *
 * @param markdown The content of the slide
 * @returns The heading without its inline markdown, or `undefined` when the slide has no heading
 */
export const getSlideHeading = (markdown?: string): string | undefined => {
  if (!markdown) {
    return undefined;
  }

  let firstHeading: string | undefined;
  let codeFence: string | undefined;
  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    const fence = trimmed.match(/^(`{3,}|~{3,})/)?.[1];
    if (fence) {
      if (!codeFence) {
        codeFence = fence;
      } else if (fence[0] === codeFence[0] && fence.length >= codeFence.length) {
        codeFence = undefined;
      }
      continue;
    }

    if (codeFence) {
      continue;
    }

    const match = trimmed.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/);
    if (match) {
      if (match[1].length === 1) {
        return toPlainText(match[2]);
      }
      firstHeading ??= toPlainText(match[2]);
    }
  }

  return firstHeading;
};

/**
 * Combines the front matter of a slide with the placeholders for its header and footer templates.
 * `crntSlideIdx` and `totalSlides` are always calculated. For the text placeholders, a front
 * matter property with the same name wins, so a slide can set its own `slideTitle`.
 */
export const getTemplateData = (
  frontmatter: SlideMetadata | undefined,
  placeholders: SlidePlaceholders,
): SlideMetadata => {
  const data: SlideMetadata = { ...(frontmatter || {}) };

  for (const [key, value] of Object.entries(placeholders)) {
    const isOverridable = OVERRIDABLE_PLACEHOLDERS.includes(key as keyof SlidePlaceholders);
    if (isOverridable && data[key] !== undefined && data[key] !== null && data[key] !== '') {
      continue;
    }
    data[key] = value ?? undefined;
  }

  return data;
};

/**
 * Gets where the progress bar goes on a slide.
 *
 * @param setting The `demoTime.slideProgressBar` setting
 * @param value The `progress` front matter property: `true`, `false`, `top` or `bottom`
 * @returns The position, or `undefined` when the slide has no progress bar
 */
export const getProgressBarPosition = (
  setting: ProgressBarSetting | string | undefined,
  value: unknown,
): ProgressBarPosition | undefined => {
  const settingPosition = setting === 'top' || setting === 'bottom' ? setting : undefined;

  if (typeof value === 'string') {
    const position = value.trim().toLowerCase();
    if (position === 'top' || position === 'bottom') {
      return position;
    }
  }

  const enabled = toBoolean(value);
  if (enabled === false) {
    return undefined;
  }
  if (enabled === true) {
    return settingPosition ?? 'bottom';
  }

  return settingPosition;
};

/**
 * Gets how much of the play is done at the current slide, from 0 to 100
 *
 * @returns The percentage, or `undefined` when the slide has no number (hidden or not in an act)
 */
export const getProgressPercentage = (
  crntSlideIdx: number | null | undefined,
  totalSlides: number | undefined,
): number | undefined => {
  if (!crntSlideIdx || !totalSlides || totalSlides < 1) {
    return undefined;
  }

  return Math.min(100, Math.max(0, (crntSlideIdx / totalSlides) * 100));
};

/**
 * Renders the progress bar for the PDF export and slide screenshots. The slide preview renders
 * the same markup with React.
 */
export const renderProgressBar = (
  position: ProgressBarPosition | undefined,
  crntSlideIdx: number | null | undefined,
  totalSlides: number | undefined,
): string => {
  const percentage = getProgressPercentage(crntSlideIdx, totalSlides);
  if (!position || percentage === undefined) {
    return '';
  }

  return `<div class="slide__progress slide__progress--${position}" role="progressbar" aria-valuemin="0" aria-valuemax="${totalSlides}" aria-valuenow="${crntSlideIdx}"><div class="slide__progress__bar" style="width: ${percentage}%;"></div></div>`;
};
