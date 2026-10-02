import { Rect, WINDOW } from './components/Framed';

// Crops, in the capture's own 2560x1640, read off the files in public/shots.
// Every edge either falls inside the app — which reads as a zoom — or is the
// window's own edge.

/// The whole window. Every recorded beat is driven from the status bar at the
/// bottom-left, so the beats start here.
export const DESK: Rect = WINDOW;

/// The editor area, from just inside its left border (706 — the side bar's
/// resize handle is drawn at ~699) to the window's right edge, floor to
/// ceiling. The act editor and the overview are
/// taller than a clean horizontal gap allows, so the window's own top and
/// bottom are the edges.
export const EDITOR: Rect = { x: 706, y: 0, w: 1854, h: 1640 };

/// The code in server.ts, from under the breadcrumbs to the empty space below
/// the last line. For reading the highlight.
export const CODE: Rect = { x: 706, y: 172, w: 1854, h: 880 };

/// The same aspect as the window, pushed in on the editor: where the typing
/// beat ends up once the status bar click is done.
export const CODE_PUSH: Rect = { x: 706, y: 172, w: 1854, h: 1854 / (2560 / 1640) };

/// The presenter window's scene list, notes and next button. Its bottom edge
/// is in the empty lower half of that window.
export const PRESENTER: Rect = { x: 0, y: 0, w: 2048, h: 1000 };

/// The window's aspect again, pushed in on the editor and the terminal panel
/// under it: where the run beat ends up. Its edges were found in the clip's
/// last frame: the top in the gap between two code lines (293–309), the bottom
/// in the empty terminal below the prompt (1430–1592).
export const TERMINAL_PUSH: Rect = { x: 706, y: 300, w: 1854, h: 1854 / (2560 / 1640) };
