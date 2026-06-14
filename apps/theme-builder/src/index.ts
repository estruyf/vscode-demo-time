/**
 * Package entry point so the builder can be embedded by other apps in the
 * monorepo (the VS Code extension renders it inside a webview via
 * apps/webviews). The standalone app boots from main.tsx instead.
 */
export { default as App } from './App';
export { ExportPanel, type ExportResult } from './components/ExportPanel';
export { isVsCode, vscodeThemeColors } from './lib/importVscodeTheme';
export type { ThemeColors, ThemeModel } from './types/theme';
