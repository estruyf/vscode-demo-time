import { LAYOUT_KEYS, type LayoutKey, type LayoutSettings, type ThemeModel } from '../types/theme';
import { vscodeThemeColors } from './importVscodeTheme';

/** Sensible per-layout defaults that mirror the Demo Time `default` theme. */
export function defaultLayoutSettings(key: LayoutKey): LayoutSettings {
  const centered: Partial<LayoutSettings> = {
    justify: 'center',
    align: 'center',
  };

  const base: LayoutSettings = {
    background: '',
    color: '',
    headingColor: '',
    headingBackground: '',
    justify: 'start',
    align: 'stretch',
    padding: 2,
    headingSize: 0,
    backgroundImage: null,
  };

  switch (key) {
    case 'intro':
      return { ...base, ...centered, headingSize: 3.75 };
    case 'section':
      return { ...base, ...centered, headingSize: 3.75 };
    case 'quote':
      return { ...base, justify: 'center', align: 'start', headingSize: 3 };
    case 'image':
      return { ...base, ...centered };
    case 'video':
      return { ...base, ...centered };
    case 'image-left':
      return { ...base, padding: 2.5 };
    case 'image-right':
      return { ...base, padding: 2.5 };
    case 'two-columns':
      return { ...base, padding: 2.5 };
    default:
      return base;
  }
}

function buildLayouts(): Record<LayoutKey, LayoutSettings> {
  return LAYOUT_KEYS.reduce(
    (acc, key) => {
      acc[key] = defaultLayoutSettings(key);
      return acc;
    },
    {} as Record<LayoutKey, LayoutSettings>,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined) {
    return base;
  }
  if (isPlainObject(base) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const key of Object.keys(override)) {
      out[key] = deepMerge((base as Record<string, unknown>)[key], override[key]);
    }
    return out as T;
  }
  return override as T;
}

/**
 * Backfill a (possibly partial / older / corrupt) model over a complete default
 * so every required field exists. Returns null only for non-object input. This
 * keeps the editor and CSS generator from crashing on incomplete snapshots.
 */
export function normalizeModel(raw: unknown): ThemeModel | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  const name = typeof raw.name === 'string' && raw.name ? raw.name : undefined;
  const merged = deepMerge(createDefaultTheme(name), raw);
  merged.version = 1;
  return merged;
}

/**
 * A clean starting point that follows the active VS Code theme by default
 * (colors are `var(--vscode-…)` references with neutral-dark fallbacks). Picking
 * a concrete color in the editor overrides the reference for that color only.
 */
export function createDefaultTheme(name = 'my-theme'): ThemeModel {
  return {
    version: 1,
    name,
    displayName: 'My Theme',
    colors: vscodeThemeColors(),
    backgroundImage: null,
    typography: {
      fontFamily: '',
      googleFont: '',
      baseFontSize: 12,
      h1: { size: 2.25, weight: 700 },
      h2: { size: 1.875, weight: 700 },
      h3: { size: 1.5, weight: 600 },
      h4: { size: 1.25, weight: 600 },
      h5: { size: 1.125, weight: 600 },
      paragraph: { size: 1, lineHeight: 1.6 },
      list: { size: 1, markerColor: '' },
      link: { underline: true },
    },
    layouts: buildLayouts(),
    light: {
      enabled: false,
      background: '#ffffff',
      text: '#1a1a1a',
      heading: '#000000',
      link: '#0a66c2',
    },
    customCss: '',
  };
}
