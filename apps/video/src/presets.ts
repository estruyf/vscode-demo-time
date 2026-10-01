export interface Preset {
  name: string;
  /** The video's size in pixels. */
  width: number;
  height: number;
  /** The VS Code window's content size in CSS pixels. */
  viewport: { width: number; height: number };
  /** Device scale factor: viewport × scale = video size. */
  scale: number;
  /** VS Code settings the window size needs. */
  settings?: Record<string, unknown>;
}

// A narrow window cuts long lines off at the edge
const NARROW = { 'editor.wordWrap': 'on' };

/**
 * The window is sized so VS Code lays out like a laptop screen for 16:9, and stays usable for the
 * square and vertical formats. The scale factor brings it up to the video's resolution.
 */
export const PRESETS: { [name: string]: Preset } = {
  '16:9': {
    name: '16:9',
    width: 1920,
    height: 1080,
    viewport: { width: 1280, height: 720 },
    scale: 1.5,
  },
  '1:1': {
    name: '1:1',
    width: 1080,
    height: 1080,
    viewport: { width: 720, height: 720 },
    scale: 1.5,
    settings: NARROW,
  },
  '9:16': {
    name: '9:16',
    width: 1080,
    height: 1920,
    viewport: { width: 540, height: 960 },
    scale: 2,
    settings: NARROW,
  },
};

export const getPreset = (name: string): Preset => {
  const preset = PRESETS[name];
  if (!preset) {
    throw new Error(`Unknown preset "${name}". Use one of: ${Object.keys(PRESETS).join(', ')}.`);
  }
  return preset;
};
