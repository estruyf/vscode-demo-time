import {
  LAYOUT_KEYS,
  type LayoutKey,
  type LayoutSettings,
  type ThemeModel,
} from '../types/theme';

/** Sensible per-layout defaults that mirror the Demo Time `default` theme. */
export function defaultLayoutSettings(key: LayoutKey): LayoutSettings {
  const centered: Partial<LayoutSettings> = {
    justify: 'center',
    align: 'center',
    textAlign: 'center',
  };

  const base: LayoutSettings = {
    background: '',
    color: '',
    headingColor: '',
    headingBackground: '',
    justify: 'start',
    align: 'stretch',
    textAlign: 'left',
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
      return { ...base, justify: 'center', align: 'start', textAlign: 'center', headingSize: 3 };
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
    {} as Record<LayoutKey, LayoutSettings>
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
 * A clean, neutral dark starting point. Looks good on its own and is an easy
 * canvas to recolor.
 */
export function createDefaultTheme(name = 'my-theme'): ThemeModel {
  return {
    version: 1,
    name,
    displayName: 'My Theme',
    colors: {
      background: '#1e1e1e',
      text: '#e6e6e6',
      heading: '#ffffff',
      headingBackground: 'transparent',
      link: '#4daafc',
      linkHover: '#82c5ff',
      blockquoteBorder: '#4daafc',
      blockquoteBackground: 'rgba(77, 170, 252, 0.08)',
      codeColor: '#e6e6e6',
      codeBackground: 'rgba(255, 255, 255, 0.08)',
      accent: '#4daafc',
    },
    backgroundImage: null,
    typography: {
      fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      baseFontSize: 24,
      h1: { size: 2.25, weight: 700 },
      h2: { size: 1.875, weight: 700 },
      h3: { size: 1.5, weight: 600 },
      h4: { size: 1.25, weight: 600 },
      h5: { size: 1.125, weight: 600 },
      paragraph: { size: 1, lineHeight: 1.6, opacity: 0.9 },
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
  };
}
