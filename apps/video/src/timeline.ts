import type { VideoExportEvent, VideoExportIssue, VideoExportSceneRef } from '@demotime/common';

export interface TimelineScene extends VideoExportSceneRef {
  /** Milliseconds since the start of the video. */
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

/**
 * A frame the video shows longer than the run did: a static slide the run moved past once it had
 * rendered.
 */
export interface TimelineHold {
  /** When the run logged the hold, in milliseconds since the start of the run. */
  at: number;
  /** When the hold starts in the video, in milliseconds since the start of the video. */
  start: number;
  ms: number;
}

/**
 * Scene and slide times are video times: the run time plus the holds before it. They are the same
 * when there are no holds, as in a real-time run.
 */
export interface Timeline {
  /** Wall-clock time of the start event, in milliseconds since the epoch. */
  startedAt: number;
  /** Length of the video in milliseconds, holds included. */
  duration: number;
  status: 'completed' | 'cancelled' | 'failed';
  error?: string;
  scenes: TimelineScene[];
  slides: TimelineSlide[];
  issues: VideoExportIssue[];
  holds: TimelineHold[];
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
 * The run time, in milliseconds since the start of the run, that the video shows at `videoTime`.
 * During a hold, that is the moment the hold was logged.
 */
export const toRunTime = (holds: TimelineHold[], videoTime: number): number => {
  let held = 0;
  for (const hold of holds) {
    if (videoTime < hold.start) {
      break;
    }
    if (videoTime < hold.start + hold.ms) {
      return hold.at;
    }
    held += hold.ms;
  }
  return videoTime - held;
};

/**
 * Turns the event log into scenes and slides with start and end times relative to the start
 * of the video. Returns `undefined` until the run has ended.
 */
export const buildTimeline = (events: VideoExportEvent[]): Timeline | undefined => {
  const end = events.find((event) => event.type === 'end');
  if (!end || end.type !== 'end') {
    return undefined;
  }

  const start = events.find((event) => event.type === 'start');
  const startedAt = start?.t ?? end.t;
  const runDuration = Math.max(0, end.t - startedAt);
  const held = events.reduce(
    (total, event) => (event.type === 'hold' && event.ms > 0 ? total + event.ms : total),
    0,
  );
  const duration = runDuration + held;

  const scenes: TimelineScene[] = [];
  const slides: TimelineSlide[] = [];
  const issues: VideoExportIssue[] = [];
  const holds: TimelineHold[] = [];

  // The log is written in order, so every event comes after the holds before it
  let heldSoFar = 0;
  const runTime = (t: number) => Math.min(runDuration, Math.max(0, t - startedAt));
  const rel = (t: number) => runTime(t) + heldSoFar;

  for (const event of events) {
    if (event.type === 'hold') {
      if (event.ms > 0) {
        holds.push({ at: runTime(event.t), start: rel(event.t), ms: event.ms });
        heldSoFar += event.ms;
      }
      continue;
    }

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

  return {
    startedAt,
    duration,
    status: end.status,
    error: end.error,
    scenes,
    slides,
    issues,
    holds,
  };
};
