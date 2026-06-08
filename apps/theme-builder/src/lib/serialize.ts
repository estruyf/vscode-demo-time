import type { ThemeModel } from '../types/theme';
import { normalizeModel } from './defaultTheme';

/**
 * Marker used to embed a lossless snapshot of the model inside the exported CSS,
 * so a theme created here can be re-imported and edited with full fidelity.
 */
export const MODEL_MARKER = '@demotime-theme-builder:1';

/** UTF-8 safe base64 encode (handles emoji / non-latin display names). */
export function encodeModel(model: ThemeModel): string {
  const json = JSON.stringify(model);
  return btoa(unescape(encodeURIComponent(json)));
}

/** Returns the parsed (and backfilled) model, or null if the payload is invalid. */
export function decodeModel(b64: string): ThemeModel | null {
  try {
    const json = decodeURIComponent(escape(atob(b64.trim())));
    const raw = JSON.parse(json);
    // Require at least one recognisable model field before trusting the payload;
    // normalizeModel then backfills anything missing so downstream never crashes.
    if (raw && typeof raw === 'object' && (raw.version === 1 || raw.layouts || raw.colors)) {
      return normalizeModel(raw);
    }
    return null;
  } catch {
    return null;
  }
}
