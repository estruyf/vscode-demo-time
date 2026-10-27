/**
 * The tools to draw on a slide in the slide preview.
 */
export type SlideDrawingTool = 'pen' | 'highlighter' | 'eraser';

/**
 * A line drawn on a slide, in slide pixels (the slide is 960×540).
 */
export interface SlideDrawingStroke {
  tool: Exclude<SlideDrawingTool, 'eraser'>;
  color: string;
  /**
   * The x and y of each point after each other: `[x1, y1, x2, y2, ...]`
   */
  points: number[];
}

/**
 * The drawings of a slide, which the extension keeps until the presentation ends.
 */
export interface SlideDrawing {
  /**
   * The slide, from `getSlideDrawingKey`
   */
  key: string;
  strokes: SlideDrawingStroke[];
}
