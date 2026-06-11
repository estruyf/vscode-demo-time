/**
 * The theme model is the single source of truth for the editor.
 *
 * It is intentionally a plain, serializable object so it can be:
 *  - persisted to localStorage,
 *  - embedded (as JSON) inside the exported CSS for lossless re-import,
 *  - turned into a self-contained Demo Time theme stylesheet by `generateCss`.
 *
 * The shape mirrors the Demo Time slide DOM and the `--demotime-*` CSS variable
 * conventions used by the built-in themes (see apps/webviews/src/themes/*.css).
 */

/** Layout keys map 1:1 to the Demo Time `SlideLayout` values that have visual styling. */
export const LAYOUT_KEYS = [
  'default',
  'intro',
  'section',
  'quote',
  'image',
  'video',
  'image-left',
  'image-right',
  'two-columns',
] as const;

export type LayoutKey = (typeof LAYOUT_KEYS)[number];

export type AlignItems = 'start' | 'center' | 'end' | 'stretch';
export type JustifyContent = 'start' | 'center' | 'end';
export type BackgroundSize = 'cover' | 'contain' | 'auto';
export type BackgroundRepeat = 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';

export interface BackgroundImage {
  /** A data: URL (uploaded) or an absolute/relative URL the user typed. */
  url: string;
  size: BackgroundSize;
  /** Any valid `background-position` value, e.g. "center center". */
  position: string;
  repeat: BackgroundRepeat;
  /** 0-100, applied as a dark overlay to keep text legible. 0 = no overlay. */
  overlay: number;
}

export interface HeadingStyle {
  /** Font size in rem. */
  size: number;
  weight: number;
}

export interface Typography {
  fontFamily: string;
  /**
   * Optional Google Font family name (e.g. "Inter"). When set, an @import for
   * the font is emitted and it is woven into `fontFamily`.
   */
  googleFont: string;
  /** Base font size in px. All element sizes are em-relative to this. */
  baseFontSize: number;
  h1: HeadingStyle;
  h2: HeadingStyle;
  h3: HeadingStyle;
  h4: HeadingStyle;
  h5: HeadingStyle;
  paragraph: {
    /** rem */
    size: number;
    lineHeight: number;
  };
  list: {
    /** rem */
    size: number;
    /** Bullet/marker accent color, empty = inherit. */
    markerColor: string;
  };
  link: {
    underline: boolean;
  };
}

export interface ThemeColors {
  background: string;
  text: string;
  heading: string;
  headingBackground: string;
  link: string;
  linkHover: string;
  blockquoteBorder: string;
  blockquoteBackground: string;
  /** Quote (blockquote) text colour. */
  blockquoteText: string;
  codeColor: string;
  codeBackground: string;
  /** Accent color used for small flourishes (underlines, markers). */
  accent: string;
}

/**
 * Per-layout overrides. Empty strings mean "inherit the global value", which
 * keeps the generated CSS small and predictable.
 */
export interface LayoutSettings {
  background: string;
  color: string;
  headingColor: string;
  headingBackground: string;
  /** Vertical placement of the content block. */
  justify: JustifyContent;
  /** Horizontal placement of the content block. */
  align: AlignItems;
  /** Content padding in rem. */
  padding: number;
  /** Optional heading size override (rem). 0 / undefined = use typography.h1. */
  headingSize: number;
  /** Optional background image for this specific layout. */
  backgroundImage: BackgroundImage | null;
}

export interface LightVariant {
  enabled: boolean;
  background: string;
  text: string;
  heading: string;
  link: string;
}

export interface ThemeModel {
  /** Model schema version, for forward-compatible imports. */
  version: 1;
  /**
   * When set, this theme is built on one of the real built-in theme designs
   * (the key into PRESET_CSS, e.g. "frost"). The full design is emitted and the
   * editor's colours/fonts/background layer on top via CSS variables. Unset =
   * a fully structured, from-scratch theme.
   */
  basedOn?: string;
  /** CSS-safe theme class name, e.g. "espc25". Used as `.slide.<name>`. */
  name: string;
  /** Human friendly label shown in the UI and CSS banner. */
  displayName: string;
  colors: ThemeColors;
  /** Slide-wide background image (rendered on `.slide__layout`). */
  backgroundImage: BackgroundImage | null;
  typography: Typography;
  layouts: Record<LayoutKey, LayoutSettings>;
  light: LightVariant;
  /**
   * Optional hand-written CSS appended verbatim after the generated rules.
   * Allows fine-grained overrides that the visual editor cannot express.
   */
  customCss?: string;
}
