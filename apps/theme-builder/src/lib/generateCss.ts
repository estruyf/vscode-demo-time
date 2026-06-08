import type {
  AlignItems,
  BackgroundImage,
  JustifyContent,
  LayoutKey,
  LayoutSettings,
  ThemeModel,
} from '../types/theme';
import { LAYOUT_KEYS } from '../types/theme';
import { encodeModel, MODEL_MARKER } from './serialize';

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

const CENTERED_LAYOUTS: LayoutKey[] = ['intro', 'section', 'quote', 'image', 'video'];

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
    '--demotime-accent': colors.accent,
    /* root appearance */
    background: colors.background,
    color: colors.text,
    'font-family': t.fontFamily,
    'font-size': `${t.baseFontSize}px`,
  });

  /* ---- slide-wide background image (on the layout box) ---- */
  applyBackgroundImage(rs, `${root} .slide__layout`, model.backgroundImage);

  /* ---- typography / base elements ---- */
  const headings: [string, { size: number; weight: number }][] = [
    ['h1', t.h1],
    ['h2', t.h2],
    ['h3', t.h3],
    ['h4', t.h4],
    ['h5', t.h5],
  ];
  const globalBadge = isBadge(colors.headingBackground);
  for (const [tag, h] of headings) {
    rs.many(`${root} ${tag}`, {
      'font-size': `${h.size}rem`,
      'font-weight': h.weight,
      color: 'var(--demotime-heading-color)',
      background: 'var(--demotime-heading-background)',
      display: globalBadge ? 'inline-block' : undefined,
      padding: globalBadge ? BADGE_PADDING : undefined,
    });
  }

  rs.many(`${root} p`, {
    'font-size': `${t.paragraph.size}rem`,
    'line-height': t.paragraph.lineHeight,
    opacity: t.paragraph.opacity,
  });
  // Images and links inside paragraphs should stay fully opaque.
  rs.set(`${root} p:has(> img)`, 'opacity', '1');
  rs.set(`${root} p:has(> a)`, 'opacity', '1');

  rs.many(`${root} a`, {
    color: 'var(--demotime-link-color)',
    'text-decoration': t.link.underline ? 'underline' : 'none',
  });
  rs.set(`${root} a:hover`, 'color', 'var(--demotime-link-active-color)');

  rs.many(`${root} ul, ${root} ol`, {
    'font-size': `${t.list.size}rem`,
    'margin-left': '1.5rem',
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
    padding: '0.5rem 1rem',
  });

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
    rs.set(`${lightRoot} h1, ${lightRoot} h2, ${lightRoot} h3, ${lightRoot} h4, ${lightRoot} h5`, 'color', model.light.heading);
    rs.set(`${lightRoot} a`, 'color', model.light.link);
  }

  return banner(model, embedModel) + rs.toString() + '\n';
}

function generateLayout(
  rs: RuleSet,
  root: string,
  key: LayoutKey,
  layout: LayoutSettings,
  globalBadge: boolean
) {
  const box = `${root} .${key}`;
  const inner = `${box} .slide__content__inner`;

  // Layout box appearance.
  rs.many(box, { background: layout.background, color: layout.color });

  // Per-layout heading color/background + size.
  rs.many(`${box} h1`, {
    color: layout.headingColor,
    background: layout.headingBackground,
    'font-size': layout.headingSize > 0 ? `${layout.headingSize}rem` : undefined,
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
    rs.many(`${box} .slide__left, ${box} .slide__right`, { width: '100%' });
    rs.set(`${box} .slide__left > * ~ *, ${box} .slide__right > * ~ *`, 'margin-top', '0.75rem');
    return;
  }

  if (key === 'image-left' || key === 'image-right') {
    const imageSel = key === 'image-left' ? `${box} .slide__image_left` : `${box} .slide__image_right`;
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
    'text-align': layout.textAlign,
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
