import type { ThemeModel } from '../../types/theme';
import { STORAGE_KEY } from './constants';
import { normalizeModel } from './defaultTheme';

/** Persist the working theme so a refresh never loses progress. */
export function saveTheme(model: ThemeModel): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
  } catch {
    // Storage can be full or blocked (private mode) — fail silently.
  }
}

export function loadTheme(): ThemeModel | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    // Backfill so an older/partial persisted model can't crash on rehydrate.
    return normalizeModel(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearTheme(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
