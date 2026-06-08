import type { ThemeModel } from '../types/theme';
import { createDefaultTheme } from './defaultTheme';

/**
 * Concrete-colour approximations of the seven built-in Demo Time themes.
 *
 * The shipped themes lean on VS Code editor variables (e.g.
 * `var(--vscode-editor-foreground)`) which only resolve inside VS Code, so the
 * builder uses fixed colours that match each theme's typical dark/light look.
 */

export interface Preset {
  id: string;
  label: string;
  description: string;
  create: () => ThemeModel;
}

function base(name: string, displayName: string): ThemeModel {
  const model = createDefaultTheme(name);
  model.displayName = displayName;
  return model;
}

const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

export const PRESETS: Preset[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'A clean neutral dark theme to start from scratch.',
    create: () => base('my-theme', 'My Theme'),
  },
  {
    id: 'default',
    label: 'Default',
    description: 'Clean and simple — the Demo Time default.',
    create: () => {
      const m = base('default-custom', 'Default');
      m.colors = {
        ...m.colors,
        background: '#1e1e1e',
        text: '#d4d4d4',
        heading: '#ffffff',
        headingBackground: 'transparent',
        link: '#4daafc',
        linkHover: '#9cdcfe',
        blockquoteBorder: '#4daafc',
        blockquoteBackground: 'rgba(77,170,252,0.08)',
        accent: '#4daafc',
      };
      return m;
    },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Simple theme with a highlighted title block.',
    create: () => {
      const m = base('minimal-custom', 'Minimal');
      m.colors = {
        ...m.colors,
        background: '#1e1e1e',
        text: '#d4d4d4',
        heading: '#1e1e1e',
        headingBackground: '#d4d4d4',
        link: '#4daafc',
        linkHover: '#9cdcfe',
        blockquoteBorder: '#8a8a8a',
        blockquoteBackground: 'rgba(255,255,255,0.05)',
        accent: '#d4d4d4',
      };
      return m;
    },
  },
  {
    id: 'monomi',
    label: 'Monomi',
    description: 'Monochrome-minimalist with heavy, inverted titles.',
    create: () => {
      const m = base('monomi-custom', 'Monomi');
      m.colors = {
        ...m.colors,
        background: '#101010',
        text: '#ededed',
        heading: '#101010',
        headingBackground: '#ededed',
        link: '#ededed',
        linkHover: '#bdbdbd',
        blockquoteBorder: '#ededed',
        blockquoteBackground: 'rgba(255,255,255,0.06)',
        accent: '#ededed',
      };
      m.typography.h1.weight = 900;
      m.typography.h2.weight = 900;
      m.typography.h3.weight = 800;
      return m;
    },
  },
  {
    id: 'unnamed',
    label: 'Unnamed',
    description: 'Dark theme with a purple badge title, after "The Unnamed".',
    create: () => {
      const m = base('unnamed-custom', 'Unnamed');
      m.colors = {
        ...m.colors,
        background: '#1b1b2b',
        text: '#dcd7e3',
        heading: '#ffffff',
        headingBackground: '#7c5cff',
        link: '#9d7bff',
        linkHover: '#c4b1ff',
        blockquoteBorder: '#7c5cff',
        blockquoteBackground: 'rgba(124,92,255,0.12)',
        codeBackground: 'rgba(124,92,255,0.14)',
        accent: '#27c2a0',
      };
      return m;
    },
  },
  {
    id: 'quantum',
    label: 'Quantum',
    description: 'Dark mode with vibrant gradient accents.',
    create: () => {
      const m = base('quantum-custom', 'Quantum');
      m.colors = {
        ...m.colors,
        background: 'linear-gradient(135deg, #1a1b26 0%, #24283b 100%)',
        text: '#f8f9fa',
        heading: '#f8f9fa',
        headingBackground: 'transparent',
        link: '#3a86ff',
        linkHover: '#ff006e',
        blockquoteBorder: '#ff006e',
        blockquoteBackground: 'rgba(255,0,110,0.1)',
        codeBackground: 'rgba(255,255,255,0.06)',
        accent: '#ff006e',
      };
      m.layouts.intro.background = 'linear-gradient(135deg, #1a1b26 0%, #24283b 100%)';
      m.layouts.quote.background = 'linear-gradient(135deg, #2b2d3e 0%, #1a1b26 100%)';
      m.layouts.section.background = 'linear-gradient(135deg, #24283b 0%, #1a1b26 100%)';
      return m;
    },
  },
  {
    id: 'frost',
    label: 'Frost',
    description: 'Light design with a clean, airy feel.',
    create: () => {
      const m = base('frost-custom', 'Frost');
      m.colors = {
        ...m.colors,
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        text: '#343a40',
        heading: '#4c6ef5',
        headingBackground: 'transparent',
        link: '#4c6ef5',
        linkHover: '#da77f2',
        blockquoteBorder: '#4c6ef5',
        blockquoteBackground: 'rgba(76,110,245,0.05)',
        codeColor: '#4c6ef5',
        codeBackground: 'rgba(222,226,230,0.6)',
        accent: '#15aabf',
      };
      m.typography.list.markerColor = '#15aabf';
      m.layouts.section.background = 'linear-gradient(135deg, #e7f5ff 0%, #d0ebff 100%)';
      m.layouts.quote.background = 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)';
      m.light = { enabled: false, background: '#ffffff', text: '#343a40', heading: '#4c6ef5', link: '#4c6ef5' };
      return m;
    },
  },
  {
    id: 'pixels',
    label: 'Pixels',
    description: 'Retro, pixel-art inspired with vibrant cyan and gold.',
    create: () => {
      const m = base('pixels-custom', 'Pixels');
      m.colors = {
        ...m.colors,
        background: '#1a1d2e',
        text: '#e0e0e0',
        heading: '#ffcc00',
        headingBackground: 'transparent',
        link: '#00d9ff',
        linkHover: '#ff6b00',
        blockquoteBorder: '#00d9ff',
        blockquoteBackground: 'rgba(0,217,255,0.1)',
        codeColor: '#00d9ff',
        codeBackground: '#0f1119',
        accent: '#00d9ff',
      };
      m.typography.fontFamily = MONO_FONT;
      m.typography.list.markerColor = '#00d9ff';
      m.layouts.intro.background = '#0f1119';
      m.layouts.section.background = '#0f1119';
      return m;
    },
  },
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
