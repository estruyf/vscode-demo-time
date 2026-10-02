import type { ThemeColors } from '../../types/theme';

/**
 * Whether the builder is running inside a VS Code webview. VS Code provides
 * `acquireVsCodeApi` before any script runs, so checking once at module load
 * is safe.
 */
export const isVsCode =
  typeof window !== 'undefined' &&
  typeof (window as { acquireVsCodeApi?: unknown }).acquireVsCodeApi !== 'undefined';

/**
 * Maps each theme color to the `--vscode-*` editor-theme variable it should
 * follow, plus a fallback used when that variable is absent (the standalone
 * app, or a VS Code theme that doesn't define it). This mirrors the built-in
 * `default` theme (apps/webviews/src/themes/default.css), so a freshly created
 * theme automatically adapts to whatever VS Code theme is active.
 *
 * `headingBackground` has no clean VS Code equivalent and stays `transparent`;
 * syntax token colors aren't exposed as CSS variables at all.
 */
const VSCODE_COLOR_MAP: Partial<
  Record<keyof ThemeColors, { variable: string; fallback: string }>
> = {
  background: { variable: '--vscode-editor-background', fallback: '#1e1e1e' },
  text: { variable: '--vscode-editor-foreground', fallback: '#e6e6e6' },
  heading: { variable: '--vscode-editor-foreground', fallback: '#ffffff' },
  link: { variable: '--vscode-textLink-foreground', fallback: '#4daafc' },
  linkHover: { variable: '--vscode-textLink-activeForeground', fallback: '#82c5ff' },
  blockquoteBorder: { variable: '--vscode-textBlockQuote-border', fallback: '#4daafc' },
  blockquoteBackground: {
    variable: '--vscode-textBlockQuote-background',
    fallback: 'rgba(77, 170, 252, 0.08)',
  },
  codeColor: { variable: '--vscode-textPreformat-foreground', fallback: '#e6e6e6' },
  codeBackground: {
    variable: '--vscode-textPreformat-background',
    fallback: 'rgba(255, 255, 255, 0.08)',
  },
  accent: { variable: '--vscode-button-background', fallback: '#4daafc' },
};

/**
 * A `var(--vscode-…, fallback)` reference for a theme color, or `undefined` for
 * colors that don't follow a VS Code variable.
 */
export function vscodeColorReference(key: keyof ThemeColors): string | undefined {
  const mapping = VSCODE_COLOR_MAP[key];
  return mapping ? `var(${mapping.variable}, ${mapping.fallback})` : undefined;
}

/**
 * The full color set that follows the active VS Code theme. Used as the default
 * for new themes and by the "Use VS Code colors" reset button — colors stay
 * dynamic until the user picks a concrete value, which overrides the reference.
 */
export function vscodeThemeColors(): ThemeColors {
  return {
    background: vscodeColorReference('background')!,
    text: vscodeColorReference('text')!,
    heading: vscodeColorReference('heading')!,
    headingBackground: 'transparent',
    link: vscodeColorReference('link')!,
    linkHover: vscodeColorReference('linkHover')!,
    blockquoteBorder: vscodeColorReference('blockquoteBorder')!,
    blockquoteBackground: vscodeColorReference('blockquoteBackground')!,
    // Quote text has no dedicated VS Code variable — follow the editor
    // foreground so it matches the body text by default.
    blockquoteText: vscodeColorReference('text')!,
    codeColor: vscodeColorReference('codeColor')!,
    codeBackground: vscodeColorReference('codeBackground')!,
    accent: vscodeColorReference('accent')!,
  };
}

/**
 * Collect every `--vscode-*` custom property VS Code injects onto the webview's
 * root element, as a CSS declaration string. The preview renders in a sandboxed
 * `srcDoc` iframe that does not inherit these, so they must be forwarded in for
 * the theme's `var(--vscode-…)` references to resolve. Returns an empty string
 * in the standalone app (no variables present), where the fallbacks apply.
 */
export function collectVscodeVariables(): string {
  if (typeof document === 'undefined') {
    return '';
  }
  const style = document.documentElement.style;
  let out = '';
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (prop.startsWith('--vscode-')) {
      out += `${prop}:${style.getPropertyValue(prop)};`;
    }
  }
  return out;
}
