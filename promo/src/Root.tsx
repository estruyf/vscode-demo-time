import React from 'react';
import { Composition } from 'remotion';
import { Promo } from './Promo';
import { Tour } from './Tour';
import { DURATION, FPS, HEIGHT, TOUR_DURATION, WIDTH } from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    {/* About thirty seconds: the pitch. */}
    <Composition
      id="Promo"
      component={Promo}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    {/* About ninety seconds: every screen. */}
    <Composition
      id="Tour"
      component={Tour}
      durationInFrames={TOUR_DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  </>
);
