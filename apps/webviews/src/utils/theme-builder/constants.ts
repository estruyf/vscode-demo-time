import type { LayoutKey } from '../../types/theme';

/** Platform-appropriate font family mirroring VS Code's DEFAULT_FONT_FAMILY. */
const _ua = navigator.userAgent;
const _isWindows = _ua.includes('Windows');
const _isMacintosh = _ua.includes('Macintosh');
export const DEFAULT_FONT_FAMILY = _isWindows
  ? '"Segoe WPC", "Segoe UI", sans-serif'
  : _isMacintosh
    ? '-apple-system, BlinkMacSystemFont, sans-serif'
    : 'system-ui, "Ubuntu", "Droid Sans", sans-serif';

/** Demo Time slide canvas size (16:9). Matches MarkdownPreview's slide__container. */
export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 540;

export interface LayoutMeta {
  key: LayoutKey;
  label: string;
  description: string;
}

/**
 * Layout metadata, ordered the way they appear in the Demo Time docs.
 * Keys/values match the `SlideLayout` enum in @demotime/common.
 */
export const LAYOUTS: LayoutMeta[] = [
  { key: 'default', label: 'Default', description: 'Title and content, top-left aligned.' },
  { key: 'intro', label: 'Intro', description: 'Big centered title for the opening slide.' },
  { key: 'section', label: 'Section', description: 'Centered section divider with subtitle.' },
  { key: 'quote', label: 'Quote', description: 'Centered quotation styling.' },
  { key: 'image', label: 'Image', description: 'Centered content over a full background image.' },
  { key: 'video', label: 'Video', description: 'Centered content over a full background video.' },
  { key: 'image-left', label: 'Image left', description: 'Image on the left, content on the right.' },
  { key: 'image-right', label: 'Image right', description: 'Content on the left, image on the right.' },
  { key: 'two-columns', label: 'Two columns', description: 'Side-by-side content columns.' },
];

/** A curated list of web-safe / common presentation font stacks. */
export const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'VS Code default', value: '' },
  { label: 'System sans-serif', value: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
  { label: 'Arial', value: "'Arial', sans-serif" },
  { label: 'Helvetica', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: 'Georgia (serif)', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Times (serif)', value: "'Times New Roman', Times, serif" },
  { label: 'Courier (mono)', value: "'Courier New', Courier, monospace" },
  { label: 'Monospace', value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
  { label: 'Trebuchet', value: "'Trebuchet MS', 'Segoe UI', sans-serif" },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];

/** Popular Google Fonts offered as suggestions (the user can type any family). */
export const POPULAR_GOOGLE_FONTS: string[] = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Nunito',
  'Work Sans',
  'Source Sans 3',
  'Oswald',
  'Bebas Neue',
  'Space Grotesk',
  'Figtree',
  'Outfit',
  'Merriweather',
  'Playfair Display',
  'Lora',
  'PT Serif',
  'Roboto Slab',
  'Roboto Mono',
  'JetBrains Mono',
  'Fira Code',
  'IBM Plex Mono',
  'Caveat',
];

export const STORAGE_KEY = 'demotime.theme-builder.v1';
