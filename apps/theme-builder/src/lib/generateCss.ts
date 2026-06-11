import type {
  AlignItems,
  BackgroundImage,
  JustifyContent,
  LayoutKey,
  LayoutSettings,
  ThemeColors,
  ThemeModel,
} from '../types/theme';
import { LAYOUT_KEYS } from '../types/theme';
import { encodeModel, MODEL_MARKER } from './serialize';
import { PRESET_CSS } from './presetCss.generated';

/* ------------------------------------------------------------------ helpers */

const JUSTIFY: Record<JustifyContent, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
};

const ALIGN: Record<AlignItems, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

/** A simple ordered selector -> declarations accumulator that merges blocks. */
class RuleSet {
  private rules = new Map<string, Map<string, string>>();

  set(selector: string, prop: string, value: string | number | undefined | null) {
    if (value === undefined || value === null || value === '') {
      return;
    }
    let block = this.rules.get(selector);
    if (!block) {
      block = new Map();
      this.rules.set(selector, block);
    }
    block.set(prop, String(value));
  }

  /** Apply several declarations at once, skipping empty values. */
  many(selector: string, decls: Record<string, string | number | undefined | null>) {
    for (const [prop, value] of Object.entries(decls)) {
      this.set(selector, prop, value);
    }
  }

  toString(): string {
    const out: string[] = [];
    for (const [selector, block] of this.rules) {
      if (block.size === 0) {
        continue;
      }
      const body = [...block].map(([prop, value]) => `  ${prop}: ${value};`).join('\n');
      out.push(`${selector} {\n${body}\n}`);
    }
    return out.join('\n\n');
  }
}

/** Build a `background-image` value, optionally with a dark legibility overlay. */
function backgroundImageValue(img: BackgroundImage): string {
  if (!img.url) {
    return '';
  }
  const safeUrl = img.url.replace(/["\\]/g, '\\$&');
  const layer = `url("${safeUrl}")`;
  if (img.overlay > 0) {
    const a = (img.overlay / 100).toFixed(2);
    return `linear-gradient(rgba(0,0,0,${a}), rgba(0,0,0,${a})), ${layer}`;
  }
  return layer;
}

function applyBackgroundImage(rs: RuleSet, selector: string, img: BackgroundImage | null) {
  if (!img || !img.url) {
    return;
  }
  rs.many(selector, {
    'background-image': backgroundImageValue(img),
    'background-size': img.size,
    'background-position': img.position,
    'background-repeat': img.repeat,
  });
}

/** Inline `code` + `pre` code-block colours. Emitted by both code paths so the
 * editor's "Code color" / "Code bg" controls take effect, even on a design that
 * otherwise leaves code styling to the shared preview.css. */
function applyCodeStyles(rs: RuleSet, root: string, colors: ThemeColors) {
  rs.many(`${root} code`, {
    color: colors.codeColor,
    'background-color': colors.codeBackground,
    padding: '1px 5px',
    'border-radius': '4px',
  });
  rs.many(`${root} pre`, {
    padding: '1rem',
    'border-radius': '6px',
    'background-color': colors.codeBackground,
    overflow: 'auto',
  });
  rs.many(`${root} pre code`, { 'background-color': 'transparent', padding: '0' });
}

const CENTERED_LAYOUTS: LayoutKey[] = ['intro', 'section', 'quote', 'image', 'video'];

/**
 * Emit just a per-layout background image (no structural CSS), placed exactly
 * where `generateLayout` puts it. Used by the design-overlay path, which must
 * leave the built-in design's layout/spacing untouched.
 */
function applyLayoutBackgroundImage(
  rs: RuleSet,
  root: string,
  key: LayoutKey,
  layout: LayoutSettings,
) {
  const img = layout.backgroundImage;
  if (!img || !img.url) {
    return;
  }
  if (key === 'image-left' || key === 'image-right') {
    const imageSel =
      key === 'image-left'
        ? `${root} .${key} .slide__image_left`
        : `${root} .${key} .slide__image_right`;
    rs.set(imageSel, 'background-image', backgroundImageValue(img));
    rs.set(imageSel, 'background-size', `${img.size} !important`);
    rs.set(imageSel, 'background-position', `${img.position} !important`);
    rs.set(imageSel, 'background-repeat', `${img.repeat} !important`);
    return;
  }
  applyBackgroundImage(rs, `${root} .${key}`, img);
}

const BADGE_PADDING = '0.1em 0.35em';

/** A non-transparent heading background reads as a "badge", so give it padding. */
function isBadge(value: string): boolean {
  return !!value && value !== 'transparent';
}

/* ------------------------------------------------------------------- output */

export interface GenerateOptions {
  /** Include the embedded JSON snapshot for lossless re-import. Default: true. */
  embedModel?: boolean;
}

export function generateCss(model: ThemeModel, options: GenerateOptions = {}): string {
  const { embedModel = true } = options;
  const name = sanitizeName(model.name);
  const root = `.slide.${name}`;

  // Themes based on a real built-in design emit that full design, with the
  // editor's colours/fonts/background layered on top via CSS variables.
  if (model.basedOn && PRESET_CSS[model.basedOn]) {
    return generateOverlay(model, name, root, embedModel);
  }

  const rs = new RuleSet();
  const { colors, typography: t } = model;

  /* ---- CSS custom properties (Demo Time conventions + documentation) ---- */
  rs.many(root, {
    '--demotime-color': colors.text,
    '--demotime-background': colors.background,
    '--demotime-heading-color': colors.heading,
    '--demotime-heading-background': colors.headingBackground,
    '--demotime-link-color': colors.link,
    '--demotime-link-active-color': colors.linkHover,
    '--demotime-blockquote-border': colors.blockquoteBorder,
    '--demotime-blockquote-background': colors.blockquoteBackground,
    '--demotime-blockquote-color': colors.blockquoteText,
    '--demotime-accent': colors.accent,
    /* root appearance */
    background: colors.background,
    color: colors.text,
    'font-family': t.fontFamily || 'var(--vscode-font-family)',
    'font-size': `${t.baseFontSize}px`,
  });

  // The shared preview.css resets `.slide__content` to 1rem, which would stop
  // the base font size from reaching the text. Re-assert it here so every
  // em-based element size below scales with the base font size.
  rs.set(`${root} .slide__content`, 'font-size', `${t.baseFontSize}px`);

  /* ---- slide-wide background image (on the layout box) ---- */
  applyBackgroundImage(rs, `${root} .slide__layout`, model.backgroundImage);

  /* ---- typography / base elements ---- */
  const headings: [string, number, { size: number; weight: number }][] = [
    ['h1', 1, t.h1],
    ['h2', 2, t.h2],
    ['h3', 3, t.h3],
    ['h4', 4, t.h4],
    ['h5', 5, t.h5],
  ];
  const globalBadge = isBadge(colors.headingBackground);
  for (const [tag, n, h] of headings) {
    rs.set(root, `--demotime-heading-${n}`, `${h.size}em`);
    rs.many(`${root} ${tag}`, {
      'font-size': `var(--demotime-heading-${n})`,
      'font-weight': h.weight,
      color: 'var(--demotime-heading-color)',
      background: 'var(--demotime-heading-background)',
      display: globalBadge ? 'inline-block' : undefined,
      padding: globalBadge ? BADGE_PADDING : undefined,
    });
  }

  rs.many(`${root} p`, {
    'font-size': `${t.paragraph.size}em`,
    'line-height': t.paragraph.lineHeight,
    opacity: 1,
  });

  rs.many(`${root} a`, {
    color: 'var(--demotime-link-color)',
    'text-decoration': t.link.underline ? 'underline' : 'none',
  });
  rs.set(`${root} a:hover`, 'color', 'var(--demotime-link-active-color)');

  rs.many(`${root} ul, ${root} ol`, {
    'font-size': `${t.list.size}em`,
    'margin-left': '1.5em',
  });
  rs.set(`${root} ul`, 'list-style-type', 'disc');
  rs.set(`${root} ol`, 'list-style-type', 'decimal');
  rs.set(`${root} li`, 'margin-bottom', '0.5rem');
  if (t.list.markerColor) {
    rs.set(`${root} li::marker`, 'color', t.list.markerColor);
  }
  rs.many(`${root} ul ul, ${root} ul ol, ${root} ol ul, ${root} ol ol`, {
    'margin-top': '0.5rem',
  });

  rs.many(`${root} blockquote`, {
    'border-left': '4px solid var(--demotime-blockquote-border)',
    background: 'var(--demotime-blockquote-background)',
    color: 'var(--demotime-blockquote-color)',
    padding: '0.5rem 1rem',
  });

  applyCodeStyles(rs, root, colors);

  rs.many(`${root} img`, { 'max-width': '100%', height: 'auto' });

  /* ---- per layout ---- */
  for (const key of LAYOUT_KEYS) {
    generateLayout(rs, root, key, model.layouts[key], globalBadge);
  }

  /* ---- optional light variant ----
   * Intentionally minimal: only background, text, heading colour and link
   * colour flip. Blockquote/code/per-layout heading backgrounds keep their base
   * values, matching how the built-in themes (e.g. espc25) define `.light`. The
   * heading rule is emitted after the per-layout rules so its (tied-specificity)
   * colour wins by source order. */
  if (model.light.enabled) {
    const lightRoot = `.slide.${name}.light`;
    rs.many(lightRoot, {
      background: model.light.background,
      color: model.light.text,
    });
    rs.set(
      `${lightRoot} h1, ${lightRoot} h2, ${lightRoot} h3, ${lightRoot} h4, ${lightRoot} h5`,
      'color',
      model.light.heading,
    );
    rs.set(`${lightRoot} a`, 'color', model.light.link);
  }

  return banner(model, embedModel) + googleFontImport(t.googleFont) + rs.toString() + customCssBlock(model) + '\n';
}

/**
 * An @import for a Google Font. Must appear before any style rules (only the
 * banner comment precedes it), so it is emitted right after the banner.
 */
function googleFontImport(name: string): string {
  const family = (name || '').trim();
  if (!family) {
    return '';
  }
  const encoded = family.replace(/\s+/g, '+').replace(/'/g, '%27');
  return `@import url('https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;500;600;700;800;900&display=swap');\n\n`;
}

/**
 * Emit a real built-in design verbatim (renamed to the user's class) followed by
 * a small override block. Because the built-in themes are CSS-variable driven,
 * re-declaring `--demotime-*` is enough for the editor's colour/per-layout-colour
 * controls to recolour the whole design; fonts and a background image layer on
 * top too.
 */
function generateOverlay(
  model: ThemeModel,
  name: string,
  root: string,
  embedModel: boolean,
): string {
  const base = PRESET_CSS[model.basedOn!];
  // Rename `.slide.<basedOn>` (and `.slide.<basedOn>.light` etc) to the user's class,
  // and patch --demotime-font-size in-place so the value is authoritative in the first block.
  const token = model.basedOn!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const { typography: t } = model;
  const design = base
    .replace(new RegExp(`\\.slide\\.${token}(?![\\w-])`, 'g'), `.slide.${name}`)
    .replace(/--demotime-font-size:\s*[^;]+;/, `--demotime-font-size: ${t.baseFontSize}px;`);

  const { colors } = model;
  const rs = new RuleSet();

  rs.many(root, {
    '--demotime-color': colors.text,
    '--demotime-background': colors.background,
    '--demotime-heading-color': colors.heading,
    '--demotime-heading-background': colors.headingBackground,
    '--demotime-link-color': colors.link,
    '--demotime-link-active-color': colors.linkHover,
    '--demotime-blockquote-border': colors.blockquoteBorder,
    '--demotime-blockquote-background': colors.blockquoteBackground,
    '--demotime-blockquote-color': colors.blockquoteText,
    '--demotime-accent': colors.accent,
    '--demotime-heading-1': `${t.h1.size}em`,
    '--demotime-heading-2': `${t.h2.size}em`,
    '--demotime-heading-3': `${t.h3.size}em`,
    '--demotime-heading-4': `${t.h4.size}em`,
    '--demotime-heading-5': `${t.h5.size}em`,
  });

  // Per-layout colour overrides map to the design's `--demotime-<layout>-*` vars
  // (only emitted when the user actually set one).
  for (const key of LAYOUT_KEYS) {
    const layout = model.layouts[key];
    rs.set(root, `--demotime-${key}-background`, layout.background);
    rs.set(root, `--demotime-${key}-color`, layout.color);
    rs.set(root, `--demotime-${key}-heading-color`, layout.headingColor);
    rs.set(root, `--demotime-${key}-heading-background`, layout.headingBackground);
  }

  // Re-assert font-size on .slide__content to beat preview.css's reset to 1rem.
  rs.set(`${root} .slide__content`, 'font-size', `${t.baseFontSize}px`);

  // Override h1–h5 font sizes using the heading variables so the typography
  // sliders work and sizes scale with the base font size.
  for (let n = 1; n <= 5; n++) {
    rs.set(`${root} h${n}`, 'font-size', `var(--demotime-heading-${n})`);
  }

  // Prevent the right column in two-columns layouts from being pushed down.
  const twoColCell = `${root} .two-columns .slide__left, ${root} .two-columns .slide__right`;
  rs.set(twoColCell, 'margin-top', '0 !important');

  // Paragraph typography.
  rs.many(`${root} p`, {
    'font-size': `${t.paragraph.size}em`,
    'line-height': t.paragraph.lineHeight,
    opacity: 1,
  });

  // Link appearance.
  rs.set(`${root} a`, 'text-decoration', t.link.underline ? 'underline' : 'none');

  // List typography.
  rs.set(`${root} ul, ${root} ol`, 'font-size', `${t.list.size}em`);
  if (t.list.markerColor) {
    rs.set(`${root} li::marker`, 'color', t.list.markerColor);
  }

  // A chosen Google Font overrides the design's font family.
  if (t.googleFont && t.googleFont.trim()) {
    rs.set(root, 'font-family', t.fontFamily);
  }

  // An added background image layers onto the slide.
  applyBackgroundImage(rs, `${root} .slide__layout`, model.backgroundImage);

  // The built-in design owns every layout's structure and spacing, so we do NOT
  // re-impose our own flex / padding / inter-block spacing here. Doing so fights
  // the design and — because a flex container disables margin-collapsing — makes
  // the design's spacing and ours stack, doubling the gaps between blocks. The
  // editor's colour controls already flow through the `--demotime-*` variables
  // above; here we only layer on any per-layout background image the user added.
  for (const key of LAYOUT_KEYS) {
    applyLayoutBackgroundImage(rs, root, key, model.layouts[key]);
  }

  // Quote text + inline code / code-block colours. The built-in designs leave
  // these to the shared preview.css, so emit them here for the editor's "Quote
  // text", "Code color" and "Code bg" controls to take effect.
  rs.set(`${root} blockquote`, 'color', 'var(--demotime-blockquote-color)');
  applyCodeStyles(rs, root, colors);

  const overrides = rs.toString();
  const overrideBlock = overrides ? `\n\n/* Theme Builder overrides */\n${overrides}` : '';
  return banner(model, embedModel) + googleFontImport(t.googleFont) + design + overrideBlock + customCssBlock(model) + '\n';
}

function generateLayout(
  rs: RuleSet,
  root: string,
  key: LayoutKey,
  layout: LayoutSettings,
  globalBadge: boolean,
) {
  const box = `${root} .${key}`;
  const inner = `${box} .slide__content__inner`;

  // Layout box appearance.
  rs.many(box, { background: layout.background, color: layout.color });

  // Per-layout heading color/background + size.
  rs.many(`${box} h1`, {
    color: layout.headingColor,
    background: layout.headingBackground,
    'font-size': layout.headingSize > 0 ? `${layout.headingSize}em` : undefined,
  });
  // Keep the "badge" treatment consistent for per-layout heading backgrounds:
  // give a new badge its padding, or clear an inherited global badge when the
  // layout explicitly resets the background to transparent.
  if (isBadge(layout.headingBackground)) {
    rs.many(`${box} h1`, { display: 'inline-block', padding: BADGE_PADDING });
  } else if (layout.headingBackground === 'transparent' && globalBadge) {
    rs.many(`${box} h1`, { display: 'block', padding: '0' });
  }

  if (key === 'two-columns') {
    // Base: stack content (so a wrapper-less two-columns slide still flows),
    // honouring the layout's vertical alignment.
    rs.many(inner, {
      display: 'flex',
      'flex-direction': 'column',
      'justify-content': JUSTIFY[layout.justify],
      padding: `${layout.padding}rem`,
    });
    spacing(rs, inner);
    // When the author provides .slide__left/.slide__right, switch to a 2-col grid.
    rs.many(`${inner}:has(> .slide__left)`, {
      display: 'grid',
      'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
      gap: '2rem',
    });
    rs.set(`${inner}:has(> .slide__left) > :not([hidden]) ~ :not([hidden])`, 'margin-top', '0');
    rs.many(`${box} .slide__left, ${box} .slide__right`, {
      width: '100%',
      'margin-top': '0 !important',
    });
    rs.set(`${box} .slide__left > * ~ *, ${box} .slide__right > * ~ *`, 'margin-top', '1rem');
    return;
  }

  if (key === 'image-left' || key === 'image-right') {
    const imageSel =
      key === 'image-left' ? `${box} .slide__image_left` : `${box} .slide__image_right`;
    // The actual image usually comes from the slide's `image` front matter (set
    // as an inline style at runtime). The theme controls how it is displayed, so
    // fit/position/repeat use !important to win over that inline style — exactly
    // how the built-in themes do it. A theme-provided image is a fallback only.
    const img = layout.backgroundImage;
    if (img && img.url) {
      rs.set(imageSel, 'background-image', backgroundImageValue(img));
    }
    rs.set(imageSel, 'background-size', `${img?.size ?? 'cover'} !important`);
    rs.set(imageSel, 'background-position', `${img?.position ?? 'center center'} !important`);
    rs.set(imageSel, 'background-repeat', `${img?.repeat ?? 'no-repeat'} !important`);

    rs.set(inner, 'padding', `${layout.padding}rem`);
    rs.many(inner, {
      display: 'flex',
      'flex-direction': 'column',
      'justify-content': JUSTIFY[layout.justify],
    });
    spacing(rs, inner);
    return;
  }

  // Standard / centered layouts.
  rs.many(inner, {
    display: 'flex',
    'flex-direction': 'column',
    'justify-content': JUSTIFY[layout.justify],
    'align-items': ALIGN[layout.align],
    padding: `${layout.padding}rem`,
  });
  spacing(rs, inner);

  // The video layout needs its background <video> positioned full-bleed behind
  // the content, exactly like the built-in themes do.
  if (key === 'video') {
    rs.set(inner, 'background-color', 'transparent');
    rs.many(`${box} .slide__video`, {
      position: 'fixed',
      inset: '0',
      'z-index': '-1',
      overflow: 'hidden',
      'pointer-events': 'none',
    });
    rs.many(`${box} .slide__video video`, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      'min-width': '100%',
      'min-height': '100%',
      width: 'auto',
      height: 'auto',
      'object-fit': 'cover',
    });
  }

  // Background image override for non image-left/right layouts.
  if (CENTERED_LAYOUTS.includes(key) || key === 'default') {
    applyBackgroundImage(rs, box, layout.backgroundImage);
  }
}

/** Even vertical spacing between adjacent content blocks. */
function spacing(rs: RuleSet, inner: string) {
  rs.set(`${inner} > :not([hidden]) ~ :not([hidden])`, 'margin-top', '0.75rem');
}

/* ----------------------------------------------------------------- banners */

function banner(model: ThemeModel, embedModel: boolean): string {
  const name = sanitizeName(model.name);
  const lines = [
    `/*!`,
    ` * ${model.displayName || model.name} — Demo Time slide theme`,
    ` * Created with the Demo Time Theme Builder.`,
    ` *`,
    ` * Usage — reference this file from a slide's front matter:`,
    ` *   ---`,
    ` *   theme: ${name}`,
    ` *   customTheme: ./${name}.css`,
    ` *   ---`,
    ` * or set "demoTime.customTheme" in .vscode/settings.json to apply it globally.`,
    ` */`,
  ];
  let out = lines.join('\n') + '\n';
  if (embedModel) {
    out += `/* ${MODEL_MARKER} ${encodeModel(model)} */\n`;
  }
  return out + '\n';
}

function customCssBlock(model: ThemeModel): string {
  const css = (model.customCss || '').trim();
  if (!css) {
    return '';
  }
  return `\n\n/* Custom CSS */\n${css}\n`;
}

/** Make a user-provided name safe to use as a CSS class. */
export function sanitizeName(name: string): string {
  const cleaned = (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1');
  return cleaned || 'my-theme';
}
