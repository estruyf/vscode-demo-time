import * as React from 'react';
import {
  AUTO_FIT_MIN_ZOOM,
  getSlideOverflowSize,
  hasSlideOverflow,
  SlideOverflow,
} from '@demotime/common';
import { Icon } from 'vscrui';

export interface ISlideFitBadgeProps {
  overflow: SlideOverflow;
  /**
   * Whether the slide has `autoFit: true`
   */
  autoFit: boolean;
  /**
   * The zoom `autoFit` applied to the content
   */
  zoom: number;
  /**
   * Distance from the top of the preview
   */
  top: number;
}

/**
 * Tells the author that the content of the slide doesn't fit, or that `autoFit` scaled it down.
 * The badge sits inside the slide element, so it uses spans: the slide themes style elements like
 * `p` and `code`.
 */
export const SlideFitBadge: React.FunctionComponent<ISlideFitBadgeProps> = ({
  overflow,
  autoFit,
  zoom,
  top,
}: ISlideFitBadgeProps) => {
  const isScaled = autoFit && zoom < 1;
  if (!hasSlideOverflow(overflow) && !isScaled) {
    return null;
  }

  const baseStyle: React.CSSProperties = {
    top,
    backgroundColor: 'var(--vscode-editorWidget-background)',
    color: 'var(--vscode-editorWidget-foreground)',
    border: '1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border, transparent))',
    boxShadow: '0 2px 8px var(--vscode-widget-shadow)',
  };

  if (!hasSlideOverflow(overflow)) {
    return (
      <div
        // Clicking the badge doesn't count as a click step
        data-slide-controls
        className="slide__fit-badge absolute right-2 z-30 flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs pointer-events-auto"
        role="status"
        title="The content doesn't fit at its full size, so autoFit scaled it down."
        style={baseStyle}
      >
        <Icon
          name={'zoom-out' as never}
          className="inline-flex justify-center items-center"
          style={{ color: 'var(--vscode-textLink-foreground)', fontSize: '14px' }}
        />
        <span>Scaled to {Math.round(zoom * 100)}% by autoFit</span>
      </div>
    );
  }

  const size = getSlideOverflowSize(overflow);

  return (
    <div
      // Clicking the badge doesn't count as a click step
      data-slide-controls
      className="slide__overflow-badge absolute right-2 z-30 flex items-start gap-2 pl-2.5 pr-3 py-2 rounded-sm text-xs leading-snug pointer-events-auto max-w-[320px]"
      role="status"
      style={{
        ...baseStyle,
        borderLeft: '3px solid var(--vscode-editorWarning-foreground)',
      }}
    >
      <Icon
        name={'warning' as never}
        className="inline-flex shrink-0 justify-center items-center mt-px"
        style={{ color: 'var(--vscode-editorWarning-foreground)', fontSize: '14px' }}
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">
          {autoFit ? "Doesn't fit, even with autoFit" : "Content doesn't fit the slide"}
        </span>
        <span className="opacity-80">
          {autoFit
            ? `Still ${size} at ${AUTO_FIT_MIN_ZOOM * 100}%`
            : `${size.charAt(0).toUpperCase()}${size.slice(1)}`}
        </span>
        <span className="opacity-60">
          {autoFit
            ? 'Split the slide or remove content.'
            : 'Split the slide, or add autoFit: true to scale it down.'}
        </span>
      </span>
    </div>
  );
};
