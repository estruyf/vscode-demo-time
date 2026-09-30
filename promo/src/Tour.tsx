import React from 'react';
import { AbsoluteFill } from 'remotion';
import { beatLength, DeskBeat, StillShot } from './beats';
import { Backdrop, Progress } from './components/Backdrop';
import { WINDOW } from './components/Framed';
import { Cut, Part } from './cut';
import { CODE, EDITOR, PRESENTER, TERMINAL_PUSH } from './crops';
import { Outro } from './scenes/Outro';
import { Title } from './scenes/Title';
import { TOUR_DURATION, XFADE } from './theme';

// Every screen, in the order a talk meets them: the play in the side bar, the
// act editor, the overview, then presenting — slides, code, typing, terminal,
// back to slides — and the presenter view.
//
// Clicks, measured off the clips: slides ~56, toCode ~56, typing ~54 (highlighted ~165),
// run ~50 (the command is typed and its output printed by ~95).

const STILL = 200;
const SLIDES = { holdIn: 60, rate: 0.85 };
const TO_CODE = { holdIn: 54, rate: 0.8 };
const TYPING = { holdIn: 48, rate: 0.9 };
const RUN = { holdIn: 54, rate: 0.8 };

const still = (
  name: string,
  stage: 'wide' | 'side',
  rect: typeof WINDOW,
  caption: { kicker: string; headline: string; note?: string },
  of?: string,
): Part => ({
  name,
  duration: STILL + XFADE,
  render: (d) => (
    <StillShot name={name} of={of} stage={stage} rect={rect} duration={d} caption={caption} />
  ),
});

const parts: Part[] = [
  { name: 'title', duration: 96 + XFADE, render: () => <Title /> },
  still('acts', 'wide', WINDOW, {
    kicker: 'The play',
    headline: 'Your talk is a list of acts and scenes, in the side bar.',
    note: 'Click one to run it. Here, the first scene opened the title slide.',
  }),
  {
    name: 'slides',
    duration: beatLength('slides', SLIDES.holdIn, SLIDES.rate, 70) + XFADE,
    render: (d) => (
      <DeskBeat
        name="slides"
        {...SLIDES}
        duration={d}
        caption={{
          kicker: 'Slides',
          headline: 'Close the side bar and the slides get the whole window.',
          note: 'The next scene is one click in the status bar.',
        }}
      />
    ),
  },
  still('moves', 'side', EDITOR, {
    kicker: 'Act editor',
    headline: 'A scene is a list of moves.',
    note: 'Open a file, insert code, save, highlight. Stored as JSON or YAML.',
  }),
  still('overview', 'side', EDITOR, {
    kicker: 'Overview',
    headline: 'Every act, scene and slide on one page.',
  }),
  {
    name: 'toCode',
    duration: beatLength('toCode', TO_CODE.holdIn, TO_CODE.rate, 60) + XFADE,
    render: (d) => (
      <DeskBeat
        name="toCode"
        {...TO_CODE}
        duration={d}
        caption={{
          kicker: 'Present',
          headline: 'One click runs the next scene.',
          note: 'The button in the status bar names it. Here: from the agenda slide to the server code.',
        }}
      />
    ),
  },
  still('highlight', 'wide', CODE, {
    kicker: 'Highlight',
    headline: 'The lines you talk about stay sharp. The rest blurs.',
  }),
  {
    name: 'typing',
    duration: beatLength('typing', TYPING.holdIn, TYPING.rate, 80) + XFADE,
    render: (d) => (
      <DeskBeat
        name="typing"
        {...TYPING}
        pushAt={62}
        duration={d}
        caption={{
          kicker: 'No typos',
          headline: 'New code types itself in, line by line.',
          note: 'Then the next move highlights it.',
        }}
      />
    ),
  },
  {
    name: 'run',
    duration: beatLength('run', RUN.holdIn, RUN.rate, 90) + XFADE,
    render: (d) => (
      <DeskBeat
        name="run"
        {...RUN}
        pushAt={58}
        pushTo={TERMINAL_PUSH}
        duration={d}
        caption={{ kicker: 'Terminal', headline: 'Commands run as part of the scene, too.' }}
      />
    ),
  },
  still('recap', 'wide', WINDOW, {
    kicker: 'Slides',
    headline: 'And back to the slides.',
    note: 'The recap scene closes the editors and opens its slide.',
  }),
  still(
    'presenter',
    'wide',
    PRESENTER,
    {
      kicker: 'Presenter view',
      headline: 'Your notes and the next scene, on your own screen.',
    },
    'presenter',
  ),
  { name: 'outro', render: () => <Outro /> },
];

export const Tour: React.FC = () => (
  <AbsoluteFill>
    <Backdrop total={TOUR_DURATION} />
    <Cut parts={parts} total={TOUR_DURATION} />
    <Progress total={TOUR_DURATION} />
  </AbsoluteFill>
);
