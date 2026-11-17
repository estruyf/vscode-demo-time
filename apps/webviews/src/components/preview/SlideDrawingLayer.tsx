import * as React from 'react';
import {
  addSlideDrawingPoint,
  getSlideDrawingPath,
  isSlideDrawingStrokeHit,
  SLIDE_DRAWING_HIGHLIGHTER_OPACITY,
  SLIDE_DRAWING_WIDTHS,
  SlideDrawingStroke,
  SlideDrawingTool,
} from '@demotime/common';

// The slide is 960×540, the drawings use the same coordinates
const SLIDE_WIDTH = 960;
const SLIDE_HEIGHT = 540;
// The size of the eraser, in slide pixels
const ERASER_RADIUS = 12;

export interface ISlideDrawingLayerProps {
  strokes: SlideDrawingStroke[];
  /**
   * Whether you can draw. Without it, the layer only shows the drawings.
   */
  enabled: boolean;
  tool: SlideDrawingTool;
  color: string;
  onStrokesChange: (strokes: SlideDrawingStroke[]) => void;
}

const DrawingStroke: React.FunctionComponent<{ stroke: SlideDrawingStroke }> = ({ stroke }) => (
  <path
    d={getSlideDrawingPath(stroke.points)}
    fill="none"
    stroke={stroke.color}
    strokeWidth={SLIDE_DRAWING_WIDTHS[stroke.tool]}
    strokeOpacity={stroke.tool === 'highlighter' ? SLIDE_DRAWING_HIGHLIGHTER_OPACITY : 1}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

/**
 * Draws with a mouse, pen or touch on top of the slide. It sits inside the scaled slide container,
 * so the drawings scale and zoom with the slide.
 */
export const SlideDrawingLayer: React.FunctionComponent<ISlideDrawingLayerProps> = ({
  strokes,
  enabled,
  tool,
  color,
  onStrokesChange,
}: ISlideDrawingLayerProps) => {
  const svgRef = React.useRef<SVGSVGElement>(null);
  // The pointer that draws or erases. Other pointers, like a second finger, are ignored.
  const pointerIdRef = React.useRef<number | null>(null);
  const [crntStroke, setCrntStroke] = React.useState<SlideDrawingStroke | null>(null);
  const [eraserPosition, setEraserPosition] = React.useState<{ x: number; y: number } | null>(null);
  const strokesRef = React.useRef(strokes);
  strokesRef.current = strokes;

  const getPoint = React.useCallback((event: { clientX: number; clientY: number }) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: ((event.clientX - rect.left) / rect.width) * SLIDE_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * SLIDE_HEIGHT,
    };
  }, []);

  const erase = React.useCallback(
    (x: number, y: number) => {
      const remaining = strokesRef.current.filter(
        (stroke) => !isSlideDrawingStrokeHit(stroke, x, y, ERASER_RADIUS),
      );
      if (remaining.length !== strokesRef.current.length) {
        strokesRef.current = remaining;
        onStrokesChange(remaining);
      }
    },
    [onStrokesChange],
  );

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled || pointerIdRef.current !== null || event.button !== 0) {
        return;
      }

      const point = getPoint(event);
      if (!point) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      pointerIdRef.current = event.pointerId;

      if (tool === 'eraser') {
        erase(point.x, point.y);
        return;
      }

      const points: number[] = [];
      addSlideDrawingPoint(points, point.x, point.y);
      setCrntStroke({ tool, color, points });
    },
    [enabled, tool, color, getPoint, erase],
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled) {
        return;
      }

      if (tool === 'eraser') {
        const point = getPoint(event);
        setEraserPosition(point);
        if (point && pointerIdRef.current === event.pointerId) {
          erase(point.x, point.y);
        }
        return;
      }

      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      // The coalesced events have the points between two pointer moves, for a smoother line
      const events = event.nativeEvent.getCoalescedEvents?.() ?? [];
      const moves = events.length > 0 ? events : [event.nativeEvent];
      setCrntStroke((prev) => {
        if (!prev) {
          return prev;
        }

        const points = [...prev.points];
        let changed = false;
        for (const move of moves) {
          const point = getPoint(move);
          if (point && addSlideDrawingPoint(points, point.x, point.y)) {
            changed = true;
          }
        }
        return changed ? { ...prev, points } : prev;
      });
    },
    [enabled, tool, getPoint, erase],
  );

  const onPointerEnd = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      pointerIdRef.current = null;
      if (crntStroke) {
        onStrokesChange([...strokesRef.current, crntStroke]);
        setCrntStroke(null);
      }
    },
    [crntStroke, onStrokesChange],
  );

  // Turning off drawing or switching the tool stops the line you are drawing
  React.useEffect(() => {
    pointerIdRef.current = null;
    setCrntStroke(null);
    setEraserPosition(null);
  }, [enabled, tool]);

  if (!enabled && strokes.length === 0) {
    return null;
  }

  return (
    <svg
      ref={svgRef}
      data-slide-drawing
      className="slide__drawing absolute inset-0 z-30"
      width={SLIDE_WIDTH}
      height={SLIDE_HEIGHT}
      viewBox={`0 0 ${SLIDE_WIDTH} ${SLIDE_HEIGHT}`}
      aria-hidden="true"
      style={{
        pointerEvents: enabled ? 'auto' : 'none',
        // Touch and pen draw instead of scrolling or zooming the page
        touchAction: 'none',
        cursor: enabled ? (tool === 'eraser' ? 'none' : 'crosshair') : undefined,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={() => setEraserPosition(null)}
    >
      {strokes.map((stroke, idx) => (
        <DrawingStroke key={idx} stroke={stroke} />
      ))}
      {crntStroke && <DrawingStroke stroke={crntStroke} />}
      {enabled && tool === 'eraser' && eraserPosition && (
        <circle
          cx={eraserPosition.x}
          cy={eraserPosition.y}
          r={ERASER_RADIUS}
          fill="rgba(255, 255, 255, 0.25)"
          stroke="rgba(0, 0, 0, 0.6)"
          strokeWidth={1}
        />
      )}
    </svg>
  );
};
