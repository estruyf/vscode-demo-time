/**
 * Presentation Analytics Models
 *
 * These models define the data structures for tracking and analyzing
 * presentation sessions, including timing, navigation, and performance metrics.
 *
 * Terminology:
 * - Play: The entire presentation session (can span multiple act files)
 * - Act: An act file being presented
 * - Scene: A demo within an act file
 * - Move: A step within a demo
 */

/**
 * Timer status indicator for timing analysis.
 */
export enum TimerStatus {
  /** Presentation finished within allocated time */
  OnTime = 'on-time',
  /** Presentation slightly over time (< 10% over) */
  SlightlyOver = 'slightly-over',
  /** Presentation significantly over time (>= 10% over) */
  SignificantlyOver = 'significantly-over',
  /** No timer was set */
  NoTimer = 'no-timer',
}

/**
 * Timing information for an Act (act file).
 */
export interface ActTimingInfo {
  /** Path to the Act (act file) */
  actFilePath: string;
  /** Configured timer for this Act in minutes (if any) */
  configuredTimer?: number;
  /** Actual time spent on this Act in milliseconds */
  actualDuration: number;
  /** Timer status for this Act */
  timerStatus: TimerStatus;
}

/**
 * Represents a complete presentation session (Play) with all tracked data.
 * A Play can consist of multiple Acts (act files).
 */
export interface PresentationSession {
  /** Unique identifier for the session (Play) */
  id: string;
  /** When the session (Play) started */
  startTime: string;
  /** When the session (Play) ended */
  endTime?: string;
  /** Title of the presentation */
  presentationTitle?: string;
  /** Whether this is a practice run or live presentation */
  isDryRun: boolean;
  /** Total duration in milliseconds */
  totalDuration?: number;
  /** Global timer setting in minutes (from VS Code settings) */
  globalTimerMinutes?: number;
  /** Per-Act timing information */
  actTimings?: ActTimingInfo[];
  /** Individual demo/step segments */
  segments: SegmentAnalytics[];
  /** File activity records */
  fileActivity: FileActivityRecord[];
  /** Terminal commands executed */
  terminalCommands: TerminalCommandRecord[];
  /** Errors encountered during the session */
  errors: ErrorRecord[];
  /** Sequence of navigation events */
  navigationSequence: NavigationEvent[];
}

/**
 * Analytics for a single segment (scene/demo step).
 * A segment tracks the time spent on a particular scene in the presentation.
 */
export interface SegmentAnalytics {
  /** Unique identifier for this segment */
  segmentId: string;
  /** Path to the Act (act file) this segment belongs to */
  actFilePath: string;
  /** Title of the Act (act file) */
  actTitle?: string;
  /** Scene ID if available (scene ID) */
  sceneId?: string;
  /** Index of the Scene (demo) in the Act (file) */
  sceneIndex: number;
  /** Title of the Scene (demo) */
  sceneTitle: string;
  /** When this segment started */
  startTime: string;
  /** When this segment ended */
  endTime?: string;
  /** Duration in milliseconds */
  duration?: number;
  /** Narrative/speaking duration in milliseconds (time spent explaining without moving to next action) */
  narrativeDuration?: number;
  /** Detailed action times within this segment (e.g., individual slides) */
  actionTimes?: ActionTime[];
}

/**
 * Detailed action time within a segment.
 */
export interface ActionTime {
  /** Type of action */
  type: 'slide' | 'highlight' | 'insert' | 'other';
  /** Slide index if type is 'slide' */
  slideIdx?: number;
  /** Slide title if available */
  slideTitle?: string;
  /** Duration in milliseconds */
  duration: number;
  /** Timestamp when this action started */
  timestamp?: string;
}

/**
 * Line range specification.
 */
export interface LineRange {
  start: number;
  end: number;
}

/**
 * Tracks activity within a specific file.
 */
export interface FileActivityRecord {
  /** Path to the file */
  filePath: string;
  /** Total time spent in this file in milliseconds */
  totalTimeSpent: number;
  /** Heatmap of time spent per line (line number -> milliseconds) */
  lineHeatmap: Record<number, number>;
  /** Number of times this file was opened */
  openCount: number;
  /** Scroll events in this file */
  scrollEvents: ScrollEvent[];
  /** Highlight events in this file */
  highlights: HighlightEvent[];
  /** First time this file was opened */
  firstOpenTime?: string;
  /** Last time this file was active */
  lastActiveTime?: string;
}

/**
 * Tracks a scroll event within a file.
 */
export interface ScrollEvent {
  /** When the scroll occurred */
  timestamp: string;
  /** Direction of scroll */
  direction: 'up' | 'down';
  /** Number of lines scrolled */
  linesScrolled: number;
  /** Time before next interaction in milliseconds */
  dwellTime?: number;
  /** Visible line range after scroll */
  visibleRange?: LineRange;
}

/**
 * Tracks a highlight event.
 */
export interface HighlightEvent {
  /** When the highlight started */
  timestamp: string;
  /** Lines that were highlighted */
  lineRange: LineRange;
  /** How long the highlight was displayed in milliseconds */
  duration: number;
  /** Zoom level applied */
  zoomLevel?: number;
}

/**
 * Records a terminal command execution.
 */
export interface TerminalCommandRecord {
  /** When the command was executed */
  timestamp: string;
  /** The command that was run */
  command: string;
  /** Terminal identifier if multiple terminals */
  terminalId?: string;
  /** How long the command took to complete in milliseconds */
  duration?: number;
  /** Exit code if available */
  exitCode?: number;
  /** Whether the command resulted in an error */
  wasError: boolean;
}

/**
 * Records an error that occurred during the session.
 */
export interface ErrorRecord {
  /** When the error occurred */
  timestamp: string;
  /** Type of error */
  type: 'terminal' | 'action' | 'file' | 'navigation' | 'unknown';
  /** Error message */
  message: string;
  /** Whether the presenter recovered from the error */
  recovered: boolean;
  /** Time to recover in milliseconds */
  recoveryTime?: number;
  /** Related action or context */
  context?: string;
}

/**
 * Records a navigation event in the editor.
 */
export interface NavigationEvent {
  /** When the navigation occurred */
  timestamp: string;
  /** Type of navigation */
  type:
    | 'fileOpen'
    | 'fileClose'
    | 'scroll'
    | 'cursorMove'
    | 'highlight'
    | 'zoom'
    | 'terminalFocus'
    | 'demoStart'
    | 'demoEnd'
    | 'slideOpen';
  /** Source file (for transitions) */
  fromFile?: string;
  /** Target file (for transitions) */
  toFile?: string;
  /** Additional event-specific details */
  details?: NavigationEventDetails;
}

/**
 * Additional details for navigation events.
 */
export interface NavigationEventDetails {
  /** Line number or range */
  line?: number;
  lineRange?: LineRange;
  /** Zoom level */
  zoomLevel?: number;
  /** Scene (demo) information */
  sceneId?: string;
  sceneTitle?: string;
  /** Act (act file) information */
  actFilePath?: string;
  /** Slide information */
  slideIndex?: number;
  slidePath?: string;
}

/**
 * Summary analytics generated from a session.
 */
export interface AnalyticsSummary {
  /** Session ID this summary is for */
  sessionId: string;
  /** Session date */
  sessionDate: string;
  /** Whether it was a dry run */
  isDryRun: boolean;
  /** Total duration in milliseconds */
  totalDuration: number;
  /** Overall timer status */
  timerStatus: TimerStatus;
  /** Global timer setting in minutes */
  globalTimerMinutes?: number;
  /** Per-Act timing information */
  actTimings?: ActTimingInfo[];
  /** Expected total duration based on timer settings (in milliseconds) */
  expectedDuration?: number;
  /** Breakdown by file */
  fileBreakdown: FileBreakdownItem[];
  /** Longest narrative/speaking segments detected */
  longestNarratives: NarrativeRecord[];
  /** Demo segment breakdown */
  demoBreakdown: DemoBreakdownItem[];
  /** Error summary */
  errorSummary: ErrorSummary;
  /** Generated recommendations */
  recommendations: Recommendation[];
}

/**
 * File breakdown item for summary.
 */
export interface FileBreakdownItem {
  /** File path */
  filePath: string;
  /** File name for display */
  fileName: string;
  /** Time spent in milliseconds */
  timeSpent: number;
  /** Percentage of total session time */
  percentage: number;
  /** Number of times opened */
  openCount: number;
  /** Most viewed lines */
  hotspotLines?: number[];
}

/**
 * Narrative/speaking time record for summary.
 */
export interface NarrativeRecord {
  /** Location where narrative occurred */
  location: string;
  /** File path */
  filePath?: string;
  /** Duration in milliseconds */
  duration: number;
  /** When the pause occurred */
  timestamp: string;
  /** Context (what action was happening) */
  context?: string;
}

/**
 * Type alias for PauseRecord - used in UI components to represent narrative pauses.
 * This is the same as NarrativeRecord, just with a more intuitive name for UI contexts.
 */
export type PauseRecord = NarrativeRecord;

/**
 * Demo breakdown item for summary (Scene breakdown).
 */
export interface DemoBreakdownItem {
  /** Act (act file) path */
  actFilePath?: string;
  /** Scene ID if available (scene ID) */
  sceneId?: string;
  /** Scene title (scene title) */
  sceneTitle: string;
  /** Scene index (demo index) */
  sceneIndex: number;
  /** Duration in milliseconds */
  duration: number;
  /** Percentage of total session time */
  percentage: number;
  /** Number of Moves (steps) */
  moveCount: number;
  /** Average time per Move (step) in milliseconds */
  avgMoveDuration: number;
  /** Whether any errors occurred in this Scene (demo) */
  hadErrors: boolean;
  /** Errors that occurred in this Scene (demo) */
  errors?: ErrorRecord[];
  /** Timer status for the Act this scene belongs to */
  actTimerStatus?: TimerStatus;
  /** Configured timer for the Act in minutes */
  actConfiguredTimer?: number;
  /** Details of actions/slides within this scene */
  actionDetails?: {
    /** Type of action */
    type: string;
    /** Slide index if applicable */
    slideIdx?: number;
    /** Slide title if applicable */
    slideTitle?: string;
    /** Duration in milliseconds */
    duration: number;
  }[];
}

/**
 * Error summary for the session.
 */
export interface ErrorSummary {
  /** Total error count */
  totalErrors: number;
  /** Errors that were recovered from */
  recoveredErrors: number;
  /** Breakdown by error type */
  byType: Record<string, number>;
  /** Total time lost to errors in milliseconds */
  totalRecoveryTime: number;
}

/**
 * A recommendation for improvement.
 */
export interface Recommendation {
  /** Recommendation type */
  type: 'timing' | 'navigation' | 'content' | 'flow' | 'error';
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Short title */
  title: string;
  /** Detailed description */
  description: string;
  /** Related file or demo */
  relatedTo?: string;
  /** Actionable suggestion */
  suggestion?: string;
}

/**
 * Configuration for analytics tracking.
 */
export interface AnalyticsConfig {
  /** Whether analytics is enabled */
  enabled: boolean;
  /** Minimum narrative duration to detect (milliseconds) */
  narrativeThreshold: number;
  /** Whether to track cursor movements */
  trackCursorMovements: boolean;
  /** Whether to track scroll events */
  trackScrollEvents: boolean;
  /** Whether to track terminal commands */
  trackTerminalCommands: boolean;
  /** Auto-save interval in milliseconds (0 = only save at end) */
  autoSaveInterval: number;
}

/**
 * Default analytics configuration.
 */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  enabled: true,
  narrativeThreshold: 30000, // 3 seconds
  trackCursorMovements: false, // Can be verbose
  trackScrollEvents: true,
  trackTerminalCommands: true,
  autoSaveInterval: 30000, // 30 seconds
};
