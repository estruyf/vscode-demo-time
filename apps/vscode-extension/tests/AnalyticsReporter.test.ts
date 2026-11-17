import { describe, it, expect } from '@jest/globals';
import { PresentationSession } from '@demotime/common';
import { AnalyticsReporter } from '../src/services/analytics/AnalyticsReporter';

const slide = (slideIdx: number, slideTitle: string, duration: number) => ({
  type: 'slide' as const,
  slideIdx,
  slideTitle,
  duration,
  timestamp: '2026-10-24T13:00:00.000Z',
});

const createSession = (actionTimes: ReturnType<typeof slide>[]): PresentationSession => ({
  id: 'session',
  startTime: '2026-10-24T13:00:00.000Z',
  presentationTitle: 'Play',
  isDryRun: false,
  segments: [
    {
      segmentId: 'segment',
      actFilePath: '/act.yml',
      actTitle: 'Act',
      sceneIndex: 1,
      sceneTitle: 'Scene',
      startTime: '2026-10-24T13:00:00.000Z',
      actionTimes,
    },
  ],
  fileActivity: [],
  terminalCommands: [],
  errors: [],
  navigationSequence: [],
  totalDuration: 60000,
});

const timeline = (session: PresentationSession) =>
  AnalyticsReporter.generateSummary(session).demoBreakdown[0].actionDetails?.map(
    (action) => `${action.slideIdx}: ${action.slideTitle}`,
  );

describe('AnalyticsReporter scene timeline', () => {
  it('leaves out slides that were replaced right away', () => {
    const session = createSession([
      slide(2, 'Last slide of the previous scene', 1),
      slide(0, 'First slide of the previous scene', 3),
      slide(0, 'First slide', 3444),
      slide(1, 'Second slide', 52700),
    ]);

    expect(timeline(session)).toEqual(['0: First slide', '1: Second slide']);
  });

  it('keeps the last slide of a scene that is still being presented', () => {
    const session = createSession([slide(0, 'First slide', 3444), slide(1, 'Second slide', 0)]);

    expect(timeline(session)).toEqual(['0: First slide', '1: Second slide']);
  });
});
