// Borrow the product's palette rather than inventing one. The accent is the
// brand colour off its own landing page; the client/entity colours, if the app
// has any, come out of the fixture in ../demo.
//
// The ground is the one thing that is *not* the app's, and the choice is worth
// making deliberately: a light app on a near-white backdrop has nothing to sit
// on, and a dark app on ink disappears into it. Put the app on the opposite end
// of the range from itself, so the window is the brightest — or the only bright —
// thing in the frame. Demo Time Dark is a dark window, so the ground here is a
// warm paper white.
export const T = {
  ground: '#f5f1e6',
  panel: '#ffffff',
  line: '#e2dac5',
  /// Headlines. Named for the template's dark ground, where they were white.
  bright: '#15171d',
  text: '#2b2f38',
  muted: '#5c6270',
  faint: '#8b909a',
  /// Demo Time's yellow, off demotime.show: the progress hairline, the rule
  /// under the title, the pointer ring.
  accent: '#ffd43b',
  /// The same yellow is unreadable as text on this ground; kickers take the
  /// site's own dark gold instead.
  accentDeep: '#7a5f00',
  /// The accent as an `r,g,b` triple, for the backdrop's glows.
  glow: '255,212,59',
  /// What sits under a picture while it loads: the Demo Time Dark editor.
  window: '#1b2130',
} as const;

export const SANS =
  'Inter, -apple-system, "SF Pro Display", "SF Pro Text", system-ui, "Segoe UI", sans-serif';
export const MONO = '"SF Mono", ui-monospace, Menlo, "JetBrains Mono", "Roboto Mono", monospace';

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;
export const DURATION = 1200; // the short promo, 40 seconds
export const TOUR_DURATION = 2700; // the tour, 90 seconds

/// Scenes overlap by this much and cross-dissolve through it.
export const XFADE = 12;

/// What the capture is, in its own pixels: the viewport in harness.mjs at 2x.
/// Every crop in the compositions is written in these numbers — the ones you
/// would read off a file in public/shots in Preview — and `Framed` works out the
/// scale.
export const SOURCE = { width: 2560, height: 1640 } as const;

/// The two stages a shot can be mounted on. Both cuts use the same two, so a cut
/// between a screenshot and a recording does not shift the picture sideways.
///
/// `wide` is for the whole window and for crops wider than about 2:1 — the
/// caption goes above and the picture gets the width of the frame.
///
/// `side` puts the caption in a column on the left and gives the picture nearly
/// the height of the frame. It is for anything taller than it is wide, which
/// includes every full-height crop — and full-height crops are common, because a
/// list that runs to the bottom of the window has no gap left to end a crop in
/// and the window's own edge is the only clean one.
///
/// Work out the scale before choosing: `cardWidth / (cropWidth / 2)`. Below
/// about 1.0x the app's own body text stops being comfortable at 1080p.
export const STAGE = {
  wide: { top: 258, maxW: 1560, maxH: 772, left: null },
  side: { top: 45, maxW: 1220, maxH: 990, left: 686 },
} as const;

/// The caption block is bottom-aligned to this line on the `wide` stage, so a
/// headline that wraps to two lines grows upwards and the gap above the card
/// never changes.
export const CAPTION_BASELINE = 222;

/// The left-hand caption column of the `side` stage.
export const COLUMN = { left: 92, width: 540 };

/// A file in `public/` to play under the whole thing, or `null` for silence.
/// Both cuts are made to read without sound — every claim either makes is on
/// screen — so a track is a choice rather than something the piece leans on. It
/// fades out over the last second either way.
export const MUSIC: string | null = null;
