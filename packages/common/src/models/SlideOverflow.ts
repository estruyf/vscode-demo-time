/**
 * How far the content of a slide reaches past the slide, in slide pixels (the slide is 960×540).
 */
export interface SlideOverflow {
  /**
   * Overflow at the left and right edges together
   */
  x: number;
  /**
   * Overflow at the top and bottom edges together
   */
  y: number;
  /**
   * The overflow at each edge, to mark where the content is cut off
   */
  edges?: SlideOverflowEdges;
}

/**
 * How far the content reaches past each edge of the slide, in slide pixels
 */
export interface SlideOverflowEdges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * The overflow of a slide in a slide file, reported by the slide preview.
 */
export interface SlideOverflowResult extends SlideOverflow {
  /**
   * The 0-based index of the slide in the file
   */
  slideIndex: number;
}
