import React from 'react';
import { Easing, interpolate } from 'remotion';
import { Caption } from './components/Caption';
import { between, Rect } from './components/Framed';
import { Clip, Shot, Still } from './components/Shot';
import { CODE_PUSH, DESK } from './crops';
import MANIFEST from '../public/clips.json';

// The pieces both cuts are made of. Each takes the length it is given and
// works out its own holds from the clip lengths in public/clips.json.

const clipFrames = (name: string) => (MANIFEST as Record<string, { frames: number }>)[name].frames;

/// How long a recorded beat has to run: the hold on its first frame, the clip
/// at `rate`, and a hold where it comes to rest.
export const beatLength = (name: string, holdIn: number, rate: number, tail: number) =>
  holdIn + Math.round(clipFrames(name) / rate) + tail;

type CaptionProps = React.ComponentProps<typeof Caption>;

export const StillShot: React.FC<{
  name: string;
  stage: 'wide' | 'side';
  rect: Rect;
  caption: CaptionProps;
  of?: string;
  duration: number;
}> = ({ name, stage, rect, caption, of, duration }) => (
  <Shot
    stage={stage}
    of={of}
    rectAt={() => rect}
    scaleAt={(f) => interpolate(f, [0, duration], [1, 1.02])}
    aside={<Caption where={stage} {...caption} />}
  >
    <Still name={name} />
  </Shot>
);

/// A recorded beat on the whole window.
export const DeskBeat: React.FC<{
  name: string;
  holdIn: number;
  rate: number;
  duration: number;
  caption: CaptionProps;
  /// Clip frame at which to start pushing in, if at all, and where to.
  pushAt?: number;
  pushTo?: Rect;
}> = ({ name, holdIn, rate, duration, caption, pushAt, pushTo = CODE_PUSH }) => {
  const at = pushAt === undefined ? null : holdIn + pushAt / rate;
  const rectAt = (f: number) =>
    at === null
      ? DESK
      : between(
          DESK,
          pushTo,
          interpolate(f, [at, at + 32], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.45, 0, 0.2, 1),
          }),
        );
  return (
    <Shot stage="wide" rectAt={rectAt} aside={<Caption {...caption} />}>
      <Clip name={name} beat={{ holdIn, rate, total: duration }} />
    </Shot>
  );
};
