import type { VideoExportEvent, VideoExportIssue, VideoExportSceneRef } from '@demotime/common';

export interface TimelineScene extends VideoExportSceneRef {
  /** Milliseconds since the start of the run. */
  start: number;
  end: number;
}

export interface TimelineSlide {
  sceneIndex: number;
  actIndex: number;
  slideIndex: number;
  slideTitle?: string;
  start: number;
  end: number;
}

export interface Timeline {
  /** Wall-clock time of the start event, in milliseconds since the epoch. */
  startedAt: number;
  /** Length of the run in milliseconds. */
  duration: number;
  status: 'completed' | 'cancelled' | 'failed';
  error?: string;
  scenes: TimelineScene[];
  slides: TimelineSlide[];
  issues: VideoExportIssue[];
}

export const parseEventLog = (content: string): VideoExportEvent[] =>
  content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as VideoExportEvent);

type SceneKey = Pick<VideoExportSceneRef, 'actIndex' | 'sceneIndex'>;

const sameScene = (a: SceneKey, b: SceneKey) =>
  a.actIndex === b.actIndex && a.sceneIndex === b.sceneIndex;

/**
 * Turns the event log into scenes and slides with start and end times relative to the start
 * of the run. Returns `undefined` until the run has ended.
 */
export const buildTimeline = (events: VideoExportEvent[]): Timeline | undefined => {
  const end = events.find((event) => event.type === 'end');
  if (!end || end.type !== 'end') {
    return undefined;
  }

  const start = events.find((event) => event.type === 'start');
  const startedAt = start?.t ?? end.t;
  const duration = Math.max(0, end.t - startedAt);
  const rel = (t: number) => Math.min(duration, Math.max(0, t - startedAt));

  const scenes: TimelineScene[] = [];
  const slides: TimelineSlide[] = [];
  const issues: VideoExportIssue[] = [];

  for (const event of events) {
    if (event.type === 'sceneStart') {
      const { type: _type, t, ...ref } = event;
      scenes.push({ ...ref, start: rel(t), end: duration });
    } else if (event.type === 'sceneEnd') {
      const scene = [...scenes].reverse().find((s) => sameScene(s, event));
      if (scene) {
        scene.end = rel(event.t);
      }
    } else if (event.type === 'slide') {
      const previous = slides[slides.length - 1];
      if (previous && previous.end === duration) {
        previous.end = rel(event.t);
      }
      slides.push({
        actIndex: event.actIndex,
        sceneIndex: event.sceneIndex,
        slideIndex: event.slideIndex,
        slideTitle: event.slideTitle,
        start: rel(event.t),
        end: duration,
      });
    } else if (event.type === 'issue') {
      issues.push(event.issue);
    }
  }

  // A slide lasts until the next slide or the end of its scene, whichever comes first.
  for (const slide of slides) {
    const scene = scenes.find((s) => sameScene(s, slide));
    if (scene) {
      slide.end = Math.min(slide.end, scene.end);
    }
  }

  return { startedAt, duration, status: end.status, error: end.error, scenes, slides, issues };
};
