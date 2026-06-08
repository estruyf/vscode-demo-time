import type { BackgroundSize, ThemeModel } from '../types/theme';
import { createDefaultTheme } from './defaultTheme';
import { sanitizeName } from './generateCss';
import { decodeModel, MODEL_MARKER } from './serialize';

export interface ParseResult {
  model: ThemeModel;
  /** True when the model was restored from the embedded snapshot (perfect). */
  lossless: boolean;
  warnings: string[];
}

/**
 * Import a theme CSS file back into a model.
 *
 *  - Themes created here embed a JSON snapshot → restored with full fidelity.
 *  - Any other CSS → best-effort extraction of the theme name, the
 *    `--demotime-*` variables and the root colours/typography.
 */
export function parseCss(css: string): ParseResult {
  const embedded = extractEmbeddedModel(css);
  if (embedded) {
    return { model: embedded, lossless: true, warnings: [] };
  }

  const warnings: string[] = [
    'This CSS was not created with the Theme Builder, so it was imported best-effort. Colours and typography were read where possible — please review every panel.',
  ];

  // Work on a comment-free copy so `.slide.<x>` / declarations inside example
  // comments can't be mistaken for real rules.
  const scan = stripComments(css);

  const name = findThemeName(scan) ?? 'imported-theme';
  const model = createDefaultTheme(sanitizeName(name));
  model.displayName = humanize(name);

  const vars = collectVariables(scan);
  const rootDecls = leadingDeclarations(scan, escapeForRegex(`.slide.${name}`));

  // Colours from --demotime-* variables (built-in theme style).
  assign(model.colors, 'text', resolveVar(vars, 'demotime-color'));
  assign(model.colors, 'background', resolveVar(vars, 'demotime-background'));
  assign(model.colors, 'heading', resolveVar(vars, 'demotime-heading-color'));
  assign(model.colors, 'headingBackground', resolveVar(vars, 'demotime-heading-background'));
  assign(model.colors, 'link', resolveVar(vars, 'demotime-link-color'));
  assign(model.colors, 'linkHover', resolveVar(vars, 'demotime-link-active-color'));
  assign(model.colors, 'blockquoteBorder', resolveVar(vars, 'demotime-blockquote-border'));
  assign(model.colors, 'blockquoteBackground', resolveVar(vars, 'demotime-blockquote-background'));
  assign(model.colors, 'accent', resolveVar(vars, 'demotime-accent'));

  // Direct *concrete* root declarations (espc25 / hand-written style) take
  // precedence. Skip values that are themselves `var(...)` references — the
  // variable-driven built-in designs set `color: var(--demotime-color)` on the
  // root, which must not clobber the value we just resolved from that variable.
  assign(model.colors, 'background', concrete(rootDecls['background'] ?? rootDecls['background-color']));
  assign(model.colors, 'text', concrete(rootDecls['color']));
  if (concrete(rootDecls['font-family'])) {
    model.typography.fontFamily = rootDecls['font-family'];
  }
  const fontSize = parsePx(rootDecls['font-size']);
  if (fontSize) {
    model.typography.baseFontSize = fontSize;
  }

  // Slide-wide background image, if declared on the layout box. Themes may
  // write this flat (`.slide.x .slide__layout`) or nested (`.slide__layout`).
  const layoutDecls = firstNonEmpty(
    leadingDeclarations(scan, escapeForRegex(`.slide.${name} .slide__layout`)),
    leadingDeclarations(scan, escapeForRegex('.slide__layout'))
  );
  const bgImage = extractUrl(layoutDecls['background-image'] ?? layoutDecls['background']);
  if (bgImage) {
    model.backgroundImage = {
      url: bgImage,
      size: parseBgSize(layoutDecls['background-size']),
      position: layoutDecls['background-position'] || 'center center',
      repeat: 'no-repeat',
      overlay: 0,
    };
  }

  // Heading colour from an `h1` rule (flat or nested), concrete values only.
  const h1Decls = firstNonEmpty(
    leadingDeclarations(scan, escapeForRegex(`.slide.${name} h1`)),
    leadingDeclarations(scan, '(?:^|\\s)h1')
  );
  assign(model.colors, 'heading', concrete(h1Decls['color']));

  return { model, lossless: false, warnings };
}

/* ------------------------------------------------------------------ helpers */

function extractEmbeddedModel(css: string): ThemeModel | null {
  const idx = css.indexOf(MODEL_MARKER);
  if (idx === -1) {
    return null;
  }
  const after = css.slice(idx + MODEL_MARKER.length);
  const end = after.indexOf('*/');
  const payload = (end === -1 ? after : after.slice(0, end)).trim();
  return decodeModel(payload);
}

function findThemeName(css: string): string | null {
  // First `.slide.<name>` selector that isn't a structural helper.
  const re = /\.slide\.([a-zA-Z_][\w-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css))) {
    const candidate = match[1];
    if (candidate !== 'light') {
      return candidate;
    }
  }
  return null;
}

function collectVariables(css: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const re = /--([\w-]+)\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css))) {
    const name = match[1].trim();
    // Read the value with a paren/quote-aware scanner so data URLs (which
    // contain ';') survive intact.
    const { value, end } = readValue(css, re.lastIndex);
    if (value && !(name in vars)) {
      vars[name] = value;
    }
    re.lastIndex = end;
  }
  return vars;
}

/** Read a declaration value from `start` until a top-level ';' or '}'. */
function readValue(s: string, start: number): { value: string; end: number } {
  let depth = 0;
  let quote = '';
  let i = start;
  for (; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote && s[i - 1] !== '\\') {
        quote = '';
      }
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '(') {
      depth++;
    } else if (c === ')') {
      if (depth > 0) {
        depth--;
      }
    } else if ((c === ';' || c === '}') && depth === 0) {
      break;
    }
  }
  return { value: s.slice(start, i).trim(), end: i };
}

/**
 * Resolve a variable to a concrete value, following one level of
 * `var(--other)` indirection (common in the built-in themes).
 */
function resolveVar(vars: Record<string, string>, name: string, depth = 0): string | undefined {
  const value = vars[name];
  if (!value || depth > 5) {
    return undefined;
  }
  const varRef = value.match(/^var\(\s*--([\w-]+)\s*(?:,\s*([^)]+))?\)$/);
  if (varRef) {
    const resolved = resolveVar(vars, varRef[1], depth + 1);
    return resolved ?? varRef[2]?.trim();
  }
  // Skip values we can't render as a swatch (e.g. var() pointing at vscode vars).
  if (value.startsWith('var(')) {
    return undefined;
  }
  return value;
}

/**
 * Return the top-level declarations that appear immediately after a selector's
 * opening brace (before any nested rule). Works for both flat and nested CSS.
 */
function leadingDeclarations(css: string, selectorPattern: string): Record<string, string> {
  const re = new RegExp(selectorPattern + '\\s*\\{');
  const match = re.exec(css);
  if (!match) {
    return {};
  }
  const start = match.index + match[0].length;
  const nextOpen = css.indexOf('{', start);
  const nextClose = css.indexOf('}', start);
  let end = nextClose;
  if (nextOpen !== -1 && nextOpen < nextClose) {
    end = nextOpen;
  }
  if (end === -1) {
    end = css.length;
  }
  return parseDeclarations(css.slice(start, end));
}

function parseDeclarations(block: string): Record<string, string> {
  const decls: Record<string, string> = {};
  for (const part of splitTopLevel(block, ';')) {
    const colon = part.indexOf(':');
    if (colon === -1) {
      continue;
    }
    const prop = part.slice(0, colon).trim().toLowerCase();
    const value = part.slice(colon + 1).trim();
    if (prop && value && !prop.startsWith('--')) {
      decls[prop] = value;
    }
  }
  return decls;
}

/** Split on a separator that appears at the top level (outside () and quotes). */
function splitTopLevel(input: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let buf = '';
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quote) {
      if (c === quote && input[i - 1] !== '\\') {
        quote = '';
      }
      buf += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      buf += c;
    } else if (c === '(') {
      depth++;
      buf += c;
    } else if (c === ')') {
      if (depth > 0) {
        depth--;
      }
      buf += c;
    } else if (c === sep && depth === 0) {
      parts.push(buf);
      buf = '';
    } else {
      buf += c;
    }
  }
  if (buf.trim()) {
    parts.push(buf);
  }
  return parts;
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

function extractUrl(value?: string): string | null {
  if (!value) {
    return null;
  }
  const match = value.match(/url\(\s*["']?([^"')]+)["']?\s*\)/);
  return match ? match[1] : null;
}

function parseBgSize(value?: string): BackgroundSize {
  const v = (value || '').trim().toLowerCase();
  return v === 'contain' || v === 'auto' ? v : 'cover';
}

function parsePx(value?: string): number | null {
  if (!value) {
    return null;
  }
  const match = value.match(/([\d.]+)\s*px/);
  return match ? Math.round(parseFloat(match[1])) : null;
}

function assign<T extends object, K extends keyof T>(target: T, key: K, value: string | undefined) {
  if (value !== undefined && value !== '') {
    target[key] = value as T[K];
  }
}

function firstNonEmpty(...records: Record<string, string>[]): Record<string, string> {
  return records.find((r) => Object.keys(r).length > 0) ?? {};
}

/** A concrete value (not a `var(...)` reference, not empty), else undefined. */
function concrete(value?: string): string | undefined {
  const v = value?.trim();
  return v && !v.startsWith('var(') ? v : undefined;
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function humanize(name: string): string {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
