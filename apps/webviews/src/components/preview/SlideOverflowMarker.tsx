import * as React from 'react';
import { SlideOverflowEdges } from '@demotime/common';

export interface ISlideOverflowMarkerProps {
  edges: SlideOverflowEdges;
  /**
   * Where the content area is on the slide, in slide pixels
   */
  area?: { top: number; left: number; width: number; height: number };
}

const COLOR = 'var(--vscode-editorWarning-foreground)';
// Hatched band along an edge where content is cut off
const BAND_SIZE = 16;
const STRIPES = `repeating-linear-gradient(-45deg, color-mix(in srgb, ${COLOR} 45%, transparent) 0 4px, transparent 4px 10px)`;
const FULL_SLIDE = { top: 0, left: 0, width: 960, height: 540 };

const ARROWS: Record<keyof SlideOverflowEdges, string> = {
  top: '↑',
  right: '→',
  bottom: '↓',
  left: '←',
};

/**
 * Marks the edges of a slide whose content doesn't fit: a frame around the slide, so it stands
 * out from the preview background, and a hatched band with the cut-off size on every edge where
 * content is cut off. It is drawn in slide pixels, inside the scaled slide container.
 */
export const SlideOverflowMarker: React.FunctionComponent<ISlideOverflowMarkerProps> = ({
  edges,
  area = FULL_SLIDE,
}: ISlideOverflowMarkerProps) => {
  const sides = (Object.keys(ARROWS) as (keyof SlideOverflowEdges)[]).filter(
    (side) => edges[side] > 0,
  );

  return (
    <div
      className="slide__overflow-marker pointer-events-none absolute inset-0 z-40"
      aria-hidden="true"
    >
      <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 0 2px ${COLOR}` }}></div>

      {sides.map((side) => {
        const isHorizontal = side === 'top' || side === 'bottom';
        const band: React.CSSProperties = isHorizontal
          ? {
              left: area.left,
              width: area.width,
              height: BAND_SIZE,
              top: side === 'top' ? area.top : area.top + area.height - BAND_SIZE,
            }
          : {
              top: area.top,
              height: area.height,
              width: BAND_SIZE,
              left: side === 'left' ? area.left : area.left + area.width - BAND_SIZE,
            };
        // The label sits inside the content area, next to the band
        const distance =
          {
            top: area.top,
            right: FULL_SLIDE.width - area.left - area.width,
            bottom: FULL_SLIDE.height - area.top - area.height,
            left: area.left,
          }[side] +
          BAND_SIZE +
          4;
        const label: React.CSSProperties = isHorizontal
          ? { left: area.left + area.width / 2, transform: 'translateX(-50%)', [side]: distance }
          : { top: area.top + area.height / 2, transform: 'translateY(-50%)', [side]: distance };

        return (
          <React.Fragment key={side}>
            <div
              className="absolute"
              style={{
                ...band,
                background: STRIPES,
                [`border${side.charAt(0).toUpperCase()}${side.slice(1)}`]: `2px dashed ${COLOR}`,
              }}
            ></div>
            <span
              className="absolute whitespace-nowrap rounded-sm px-1.5 py-0.5 font-semibold"
              style={{
                ...label,
                fontSize: 11,
                lineHeight: 1.4,
                backgroundColor: COLOR,
                color: 'var(--vscode-editor-background)',
              }}
            >
              {ARROWS[side]} {edges[side]}px cut off
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
