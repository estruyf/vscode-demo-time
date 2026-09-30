import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { SANS, T } from '../theme';

const ease = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.bezier(0.22, 1, 0.36, 1),
} as const;

export const Title: React.FC<{ tagline?: string; note?: string }> = ({
  tagline = 'Script your live coding demos. Present them in VS Code.',
  note = 'Slides, code and terminal \u00b7 one scene at a time',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({ frame, fps, config: { damping: 200, mass: 0.7 } });
  const rule = interpolate(frame, [16, 40], [0, 176], ease);
  const line = (delay: number) => ({
    opacity: interpolate(frame, [delay, delay + 18], [0, 1], ease),
    transform: `translateY(${interpolate(frame, [delay, delay + 18], [18, 0], ease)}px)`,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: SANS,
        textAlign: 'center',
      }}
    >
      <div
        style={{ position: 'relative', transform: `scale(${interpolate(pop, [0, 1], [0.86, 1])})` }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -64,
            borderRadius: '50%',
            background: `radial-gradient(closest-side, rgba(${T.glow},0.42), transparent 70%)`,
            filter: 'blur(10px)',
          }}
        />
        <Img
          src={staticFile('icon.svg')}
          style={{
            position: 'relative',
            width: 152,
            height: 152,
            opacity: pop,
            filter: 'drop-shadow(0 14px 30px rgba(60,45,0,0.22))',
          }}
        />
      </div>

      <div
        style={{
          ...line(10),
          marginTop: 34,
          fontSize: 104,
          fontWeight: 700,
          letterSpacing: -2.6,
          color: T.bright,
        }}
      >
        Demo Time
      </div>

      <div
        style={{
          marginTop: 26,
          width: rule,
          height: 4,
          borderRadius: 2,
          backgroundColor: T.accent,
        }}
      />

      <div style={{ ...line(26), marginTop: 30, fontSize: 34, color: T.text }}>{tagline}</div>
      <div style={{ ...line(34), marginTop: 14, fontSize: 24, color: T.faint }}>{note}</div>
    </AbsoluteFill>
  );
};
