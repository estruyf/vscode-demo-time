import { LAYOUT_KEYS, type ThemeModel } from '../../types/theme';
import { createDefaultTheme, emptyLayoutTypography } from './defaultTheme';
import { parseCss } from './parseCss';
import { PRESET_CSS } from './presetCss.generated';

/**
 * Presets.
 *
 * "Blank" is a fully structured, from-scratch theme. The other seven reproduce
 * the *real* built-in Demo Time themes: each loads the actual compiled theme CSS
 * as its design (so the preview/export match the built-ins exactly) and seeds
 * the editor's colours from that design's CSS variables, which the editor can
 * then recolour.
 */

export interface Preset {
  id: string;
  label: string;
  description: string;
  create: () => ThemeModel;
}

/** Build a preset model from a real built-in design. */
function fromDesign(id: string, label: string, description: string): Preset {
  return {
    id,
    label,
    description,
    create: () => {
      // parseCss reads the design's --demotime-* variables / root colours so the
      // editor shows real values; we then mark it as based on that design.
      const model = parseCss(PRESET_CSS[id]).model;
      model.basedOn = id;
      model.name = `custom-${id}`;
      model.displayName = `Custom ${label}`;
      // The design owns each layout's type scale — start with no per-layout
      // typography overrides so the built-in sizes show through until edited.
      for (const key of LAYOUT_KEYS) {
        model.layouts[key].typography = emptyLayoutTypography();
      }
      return model;
    },
  };
}

export const PRESETS: Preset[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'A clean neutral dark theme to build from scratch (fully editable).',
    create: () => createDefaultTheme('my-theme'),
  },
  fromDesign('default', 'Default', 'Clean and simple — the Demo Time default.'),
  fromDesign('minimal', 'Minimal', 'Simple theme with a highlighted title block.'),
  fromDesign('monomi', 'Monomi', 'A monochrome-minimalist theme.'),
  fromDesign('unnamed', 'Unnamed', 'Based on the "The Unnamed" VS Code theme.'),
  fromDesign('quantum', 'Quantum', 'Dark mode with vibrant gradient accents.'),
  fromDesign('frost', 'Frost', 'Light design with a clean, airy feel.'),
  fromDesign('pixels', 'Pixels', 'Retro, pixel-art inspired with vibrant colours.'),
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
