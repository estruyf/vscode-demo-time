import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { SANS, T } from '../theme';

const ease = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.bezier(0.22, 1, 0.36, 1),
} as const;

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const line = (delay: number) => ({
    opacity: interpolate(frame, [delay, delay + 18], [0, 1], ease),
    transform: `translateY(${interpolate(frame, [delay, delay + 18], [16, 0], ease)}px)`,
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
      <div style={{ ...line(0), display: 'flex', alignItems: 'center', gap: 24 }}>
        <Img src={staticFile('icon.svg')} style={{ width: 96, height: 96 }} />
        <span style={{ fontSize: 66, fontWeight: 700, letterSpacing: -1.8, color: T.bright }}>
          Demo Time
        </span>
      </div>

      <div style={{ ...line(8), marginTop: 30, fontSize: 42, fontWeight: 600, color: T.bright }}>
        Script the demo once. Present it without typos.
      </div>

      {/* The URL is the one thing anyone needs to take away, so it gets the
          window's own dark and the yellow rather than another line of copy. */}
      <div
        style={{
          ...line(16),
          marginTop: 44,
          padding: '22px 44px',
          borderRadius: 14,
          backgroundColor: T.window,
          boxShadow: '0 24px 60px rgba(40,30,0,0.25)',
          fontSize: 34,
          fontWeight: 600,
          color: '#ffffff',
        }}
      >
        demotime<span style={{ color: T.accent }}>.show</span>
      </div>

      <div style={{ ...line(24), marginTop: 26, fontSize: 24, color: T.muted }}>
        Install Demo Time from the Visual Studio Code Marketplace.
      </div>

      <div style={{ ...line(32), marginTop: 40, fontSize: 21, color: T.faint }}>
        Open source &middot; Acts in JSON or YAML &middot; Slides in Markdown
      </div>
    </AbsoluteFill>
  );
};
