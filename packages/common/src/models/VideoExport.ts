/**
 * Options for running a play unattended so it can be recorded as a video.
 * Shared by the extension (which runs the play) and the video CLI (which records it).
 */
export interface VideoExportRunOptions {
  /**
   * Which part of the play to run:
   * - `all` (default): every act
   * - `act:2`: the second act (1-based, in the order of the Acts & Scenes view)
   * - `act:2/scenes:3-5`: scenes 3 to 5 of the second act (1-based, inclusive)
   * - `act:2/scenes:3-`: scene 3 of the second act to the end of that act
   */
  range?: string;
  /** Absolute path of the JSONL event log. */
  eventLogPath?: string;
  /** Seconds to hold a scene without slides after its moves finished. Default: 2. */
  sceneHoldSeconds?: number;
  /** Minimum seconds a slide stays on screen. Default: 3. */
  minSlideSeconds?: number;
  /** Maximum seconds a slide stays on screen, when its time is based on its text. Default: 12. */
  maxSlideSeconds?: number;
  /** Seconds to wait in place of a `pause` or `waitForInput` move. Default: 1. */
  pauseSeconds?: number;
  /**
   * Seconds to wait for a terminal command to finish before the next move. A command that keeps
   * running, such as a dev server, holds the scene this long. Default: 30.
   */
  terminalTimeoutSeconds?: number;
  /** Seconds to wait before the first scene and after the last one. Default: 1. */
  leadSeconds?: number;
  /** Hide the UI areas of `demoTime.presentationViewToggles` while running. Default: true. */
  hideUI?: boolean;
  /** Open the scene notes marked with `showOnTrigger`. Default: false. */
  showNotes?: boolean;
  /**
   * Keep each scene on screen at least as long as its notes take to read, for captions made
   * from the notes. Default: false.
   */
  holdForNotes?: boolean;
  /** Fail before running when a move cannot be recorded, instead of skipping it. Default: false. */
  strict?: boolean;
}

export type VideoExportRange =
  | { type: 'all' }
  | { type: 'act'; act: number; fromScene?: number; toScene?: number };

export type VideoExportIssueHandling = 'skip' | 'auto-continue' | 'adjust' | 'warn';

export interface VideoExportIssue {
  actTitle?: string;
  sceneTitle?: string;
  action: string;
  handling: VideoExportIssueHandling;
  reason: string;
}

export interface VideoExportSceneRef {
  actIndex: number;
  actTitle: string;
  actFile: string;
  sceneIndex: number;
  sceneTitle: string;
  sceneId?: string;
  notesPath?: string;
}

/**
 * One line of the event log. `t` is the wall-clock time in milliseconds since the epoch,
 * so the recorder can line the events up with its own frame timestamps.
 */
export type VideoExportEvent =
  | { type: 'start'; t: number; version: 1; range: string; sceneCount: number }
  | { type: 'issue'; t: number; issue: VideoExportIssue }
  | ({ type: 'sceneStart'; t: number } & VideoExportSceneRef)
  | ({ type: 'slide'; t: number; slideIndex: number; slideTitle?: string } & VideoExportSceneRef)
  | ({ type: 'sceneEnd'; t: number } & VideoExportSceneRef)
  | { type: 'end'; t: number; status: 'completed' | 'cancelled' | 'failed'; error?: string };
