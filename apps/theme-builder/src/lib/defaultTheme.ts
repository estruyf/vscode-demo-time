import {
  LAYOUT_KEYS,
  type LayoutColors,
  type LayoutKey,
  type LayoutSettings,
  type LayoutTypography,
  type ThemeModel,
} from '../types/theme';
import { vscodeThemeColors } from './importVscodeTheme';

/** All per-layout colours empty = inherit the global colour. */
export function emptyLayoutColors(): LayoutColors {
  return {
    background: '',
    text: '',
    paragraph: '',
    heading: '',
    headingBackground: '',
    accent: '',
    link: '',
    linkHover: '',
    blockquoteText: '',
    blockquoteBorder: '',
    blockquoteBackground: '',
    codeColor: '',
    codeBackground: '',
  };
}

/** All per-layout typography 0 = inherit the global value. */
export function emptyLayoutTypography(): LayoutTypography {
  return {
    h1: { size: 0, weight: 0 },
    h2: { size: 0, weight: 0 },
    h3: { size: 0, weight: 0 },
    h4: { size: 0, weight: 0 },
    h5: { size: 0, weight: 0 },
    paragraph: { size: 0, lineHeight: 0 },
    list: { size: 0 },
  };
}

/** A per-layout typography override that only sets the H1 size. */
function h1SizeOnly(size: number): LayoutTypography {
  return { ...emptyLayoutTypography(), h1: { size, weight: 0 } };
}

/** Sensible per-layout defaults that mirror the Demo Time `default` theme. */
export function defaultLayoutSettings(key: LayoutKey): LayoutSettings {
  const centered: Partial<LayoutSettings> = {
    justify: 'center',
    align: 'center',
  };

  const base: LayoutSettings = {
    justify: 'start',
    align: 'stretch',
    padding: 2,
    backgroundImage: null,
    colors: emptyLayoutColors(),
    typography: emptyLayoutTypography(),
  };

  switch (key) {
    case 'intro':
      return { ...base, ...centered, typography: h1SizeOnly(3.75) };
    case 'section':
      return { ...base, ...centered, typography: h1SizeOnly(3.75) };
    case 'quote':
      return { ...base, justify: 'center', align: 'start', typography: h1SizeOnly(3) };
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
  migrateLayouts(merged, raw);
  return merged;
}

/**
 * Migrate the older flat per-layout shape (`background`, `color`,
 * `paragraphColor`, `headingColor`, `headingBackground`, `headingSize`) into the
 * nested `colors` / `typography` overrides, and strip the stale flat props that
 * deepMerge copied over. Keeps previously-saved themes intact.
 */
function migrateLayouts(model: ThemeModel, raw: Record<string, unknown>): void {
  if (!isPlainObject(raw.layouts)) {
    return;
  }
  for (const key of LAYOUT_KEYS) {
    const old = (raw.layouts as Record<string, unknown>)[key];
    if (!isPlainObject(old)) {
      continue;
    }
    const layout = model.layouts[key];
    const c = layout.colors;
    const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
    if (str(old.background) && !c.background) c.background = old.background as string;
    if (str(old.color) && !c.text) c.text = old.color as string;
    if (str(old.paragraphColor) && !c.paragraph) c.paragraph = old.paragraphColor as string;
    if (str(old.headingColor) && !c.heading) c.heading = old.headingColor as string;
    if (str(old.headingBackground) && !c.headingBackground)
      c.headingBackground = old.headingBackground as string;
    if (typeof old.headingSize === 'number' && old.headingSize > 0 && !layout.typography.h1.size) {
      layout.typography.h1.size = old.headingSize;
    }
    const stale = layout as unknown as Record<string, unknown>;
    delete stale.background;
    delete stale.color;
    delete stale.paragraphColor;
    delete stale.headingColor;
    delete stale.headingBackground;
    delete stale.headingSize;
  }
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
      headingFontFamily: '',
      headingGoogleFont: '',
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
