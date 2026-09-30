import React from 'react';
import { AbsoluteFill } from 'remotion';
import { beatLength, DeskBeat, StillShot } from './beats';
import { Backdrop, Progress } from './components/Backdrop';
import { Cut, Part } from './cut';
import { EDITOR, PRESENTER } from './crops';
import { Outro } from './scenes/Outro';
import { Title } from './scenes/Title';
import { DURATION, XFADE } from './theme';

// Under forty seconds, one argument: you write the demo down once, and on
// stage each click runs the next piece of it — a slide, code, typing.
//
// The slide beats are captured with the Primary Side Bar closed, so the slide
// fills the window and needs no push-in.
//
// Beat lengths come from public/clips.json. Clicks, measured off the clips:
// slides ~56 (title slide → agenda), toCode ~56 (slide → server.ts), typing ~54 (routes.ts opens; the route is
// in and highlighted by ~165).

const SLIDES = { holdIn: 30, rate: 0.9 };
const TO_CODE = { holdIn: 30, rate: 0.85 };
const TYPING = { holdIn: 24, rate: 1 };

const parts: Part[] = [
  { name: 'title', duration: 84 + XFADE, render: () => <Title /> },
  {
    name: 'script',
    duration: 120 + XFADE,
    render: (d) => (
      <StillShot
        name="moves"
        stage="side"
        rect={EDITOR}
        duration={d}
        caption={{
          kicker: 'Script',
          headline: 'Write the demo down once.',
          note: 'A scene is a list of moves: open a file, insert code, save, highlight.',
        }}
      />
    ),
  },
  {
    name: 'slides',
    duration: beatLength('slides', SLIDES.holdIn, SLIDES.rate, 45) + XFADE,
    render: (d) => (
      <DeskBeat
        name="slides"
        {...SLIDES}
        duration={d}
        caption={{ kicker: 'Slides', headline: 'Your slides run right inside VS Code.' }}
      />
    ),
  },
  {
    name: 'toCode',
    duration: beatLength('toCode', TO_CODE.holdIn, TO_CODE.rate, 40) + XFADE,
    render: (d) => (
      <DeskBeat
        name="toCode"
        {...TO_CODE}
        duration={d}
        caption={{
          kicker: 'Present',
          headline: 'One click on the next scene, and the slide makes way for the code.',
        }}
      />
    ),
  },
  {
    name: 'typing',
    duration: beatLength('typing', TYPING.holdIn, TYPING.rate, 40) + XFADE,
    render: (d) => (
      <DeskBeat
        name="typing"
        {...TYPING}
        pushAt={62}
        duration={d}
        caption={{ kicker: 'No typos', headline: 'The code types itself in, then lights up.' }}
      />
    ),
  },
  {
    name: 'presenter',
    duration: 120 + XFADE,
    render: (d) => (
      <StillShot
        name="presenter"
        of="presenter"
        stage="wide"
        rect={PRESENTER}
        duration={d}
        caption={{
          kicker: 'Presenter view',
          headline: 'Your notes and the next scene, on your own screen.',
        }}
      />
    ),
  },
  { name: 'outro', render: () => <Outro /> },
];

export const Promo: React.FC = () => (
  <AbsoluteFill>
    <Backdrop total={DURATION} />
    <Cut parts={parts} total={DURATION} />
    <Progress total={DURATION} />
  </AbsoluteFill>
);
