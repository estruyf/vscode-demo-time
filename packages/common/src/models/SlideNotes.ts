/**
 * The speaker notes of the slide in the slide preview
 */
export interface SlideNotes {
  /**
   * The notes from the `<!-- notes ... -->` blocks of the slide
   */
  notes?: string;
  /**
   * The workspace relative path of the slide file
   */
  path?: string;
  /**
   * The 0-based index of the slide in its file
   */
  slideIndex?: number;
}
