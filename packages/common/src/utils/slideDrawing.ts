import { SlideDrawingStroke } from '../models/SlideDrawing';

/**
 * The colors of the pen and highlighter
 */
export const SLIDE_DRAWING_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#facc15' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
];

/**
 * The width of the lines of each tool, in slide pixels
 */
export const SLIDE_DRAWING_WIDTHS: Record<SlideDrawingStroke['tool'], number> = {
  pen: 4,
  highlighter: 24,
};

/**
 * The opacity of the highlighter, so the slide stays readable below it
 */
export const SLIDE_DRAWING_HIGHLIGHTER_OPACITY = 0.4;

/**
 * The key of the drawings of a slide: the slide file and the index of the slide in it.
 */
export const getSlideDrawingKey = (filePath: string, slideIndex: number): string =>
  `${filePath}#${slideIndex}`;

/**
 * Adds a point to the points of a stroke, unless it is too close to the last point.
 *
 * @returns Whether the point was added.
 */
export const addSlideDrawingPoint = (
  points: number[],
  x: number,
  y: number,
  minDistance = 1.5,
): boolean => {
  const length = points.length;
  if (length >= 2 && Math.hypot(x - points[length - 2], y - points[length - 1]) < minDistance) {
    return false;
  }

  points.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  return true;
};

/**
 * The SVG path of a stroke. It curves through the middle of each segment, so the line is smooth.
 */
export const getSlideDrawingPath = (points: number[]): string => {
  if (points.length < 2) {
    return '';
  }

  const [x, y] = points;
  // A single point is drawn as a dot by the round line cap
  if (points.length < 4) {
    return `M${x} ${y}L${x + 0.1} ${y}`;
  }

  let path = `M${x} ${y}`;
  for (let i = 2; i < points.length - 2; i += 2) {
    const midX = (points[i] + points[i + 2]) / 2;
    const midY = (points[i + 1] + points[i + 3]) / 2;
    path += `Q${points[i]} ${points[i + 1]} ${midX} ${midY}`;
  }
  path += `L${points[points.length - 2]} ${points[points.length - 1]}`;
  return path;
};

const getDistanceToSegment = (
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
};

/**
 * Whether the eraser at `x`, `y` touches the stroke.
 *
 * @param radius - The size of the eraser, in slide pixels
 */
export const isSlideDrawingStrokeHit = (
  stroke: SlideDrawingStroke,
  x: number,
  y: number,
  radius: number,
): boolean => {
  const { points } = stroke;
  const reach = radius + (SLIDE_DRAWING_WIDTHS[stroke.tool] ?? 0) / 2;
  if (points.length === 2) {
    return Math.hypot(x - points[0], y - points[1]) <= reach;
  }

  for (let i = 0; i < points.length - 2; i += 2) {
    if (
      getDistanceToSegment(x, y, points[i], points[i + 1], points[i + 2], points[i + 3]) <= reach
    ) {
      return true;
    }
  }
  return false;
};
