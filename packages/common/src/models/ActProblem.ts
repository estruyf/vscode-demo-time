/**
 * A problem the preflight check finds in a scene or move of an act
 */
export interface ActProblem {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  /**
   * Zero-based index of the scene in the act
   */
  sceneIndex?: number;
  /**
   * Zero-based index of the move in the scene
   */
  moveIndex?: number;
  /**
   * The property of the move (or scene) the problem is about, like `path` or `notes`
   */
  property?: string;
  /**
   * The path of the missing file, relative to the workspace folder, which can be created
   */
  missingFile?: string;
}
