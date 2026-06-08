import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type {
  BackgroundImage,
  LayoutKey,
  LayoutSettings,
  LightVariant,
  ThemeColors,
  ThemeModel,
  Typography,
} from '../types/theme';
import { createDefaultTheme } from '../lib/defaultTheme';
import { loadTheme, saveTheme } from '../lib/storage';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

/** How long edits must settle before they become a single undo checkpoint. */
const COMMIT_DELAY = 500;
/** Cap on retained undo/redo entries (each is a full model snapshot). */
const MAX_HISTORY = 50;

export interface ThemeModelApi {
  model: ThemeModel;
  /** Replace the whole model as one discrete history step (import, preset, reset). */
  setModel: (model: ThemeModel) => void;
  update: (changes: Partial<ThemeModel>) => void;
  updateColors: (changes: Partial<ThemeColors>) => void;
  updateTypography: (changes: Partial<Typography>) => void;
  updateHeading: (tag: HeadingTag, changes: Partial<Typography['h1']>) => void;
  updateLayout: (key: LayoutKey, changes: Partial<LayoutSettings>) => void;
  setBackgroundImage: (image: BackgroundImage | null) => void;
  updateLight: (changes: Partial<LightVariant>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Theme model state with debounced undo/redo history.
 *
 * `present` updates immediately on every edit (so the UI stays live), while the
 * undo stack only records a checkpoint once edits go quiet for COMMIT_DELAY ms —
 * so dragging a slider becomes a single undo step, not hundreds.
 */
export function useThemeModel(): ThemeModelApi {
  const [present, setPresent] = useState<ThemeModel>(() => loadTheme() ?? createDefaultTheme());

  const presentRef = useRef(present);
  useEffect(() => {
    presentRef.current = present;
  }, [present]);

  const pastRef = useRef<ThemeModel[]>([]);
  const futureRef = useRef<ThemeModel[]>([]);
  // The last value recorded into history; pending edits sit between this and `present`.
  const checkpointRef = useRef<ThemeModel>(present);
  const commitTimer = useRef<ReturnType<typeof setTimeout>>();
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  // Debounced autosave of the working theme.
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveTheme(present), 400);
    return () => clearTimeout(saveTimer.current);
  }, [present]);

  useEffect(() => () => clearTimeout(commitTimer.current), []);

  /** Record the current pending edit as a history checkpoint, if it changed. */
  const commitCheckpoint = useCallback(() => {
    const curr = presentRef.current;
    if (JSON.stringify(curr) !== JSON.stringify(checkpointRef.current)) {
      pastRef.current = [...pastRef.current, checkpointRef.current].slice(-MAX_HISTORY);
      futureRef.current = [];
      checkpointRef.current = curr;
      forceRender();
    }
  }, []);

  const mutate = useCallback(
    (updater: (m: ThemeModel) => ThemeModel) => {
      setPresent(updater);
      clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(commitCheckpoint, COMMIT_DELAY);
    },
    [commitCheckpoint]
  );

  const setModel = useCallback(
    (next: ThemeModel) => {
      clearTimeout(commitTimer.current);
      commitCheckpoint(); // fold any pending edit into history first
      pastRef.current = [...pastRef.current, presentRef.current].slice(-MAX_HISTORY);
      futureRef.current = [];
      checkpointRef.current = next;
      presentRef.current = next;
      setPresent(next);
      forceRender();
    },
    [commitCheckpoint]
  );

  const undo = useCallback(() => {
    clearTimeout(commitTimer.current);
    commitCheckpoint();
    if (pastRef.current.length === 0) {
      return;
    }
    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [presentRef.current, ...futureRef.current].slice(0, MAX_HISTORY);
    checkpointRef.current = prev;
    presentRef.current = prev;
    setPresent(prev);
    forceRender();
  }, [commitCheckpoint]);

  const redo = useCallback(() => {
    clearTimeout(commitTimer.current);
    commitCheckpoint(); // a pending edit invalidates the redo stack
    if (futureRef.current.length === 0) {
      return;
    }
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current, presentRef.current].slice(-MAX_HISTORY);
    checkpointRef.current = next;
    presentRef.current = next;
    setPresent(next);
    forceRender();
  }, [commitCheckpoint]);

  const update = useCallback(
    (changes: Partial<ThemeModel>) => mutate((m) => ({ ...m, ...changes })),
    [mutate]
  );

  const updateColors = useCallback(
    (changes: Partial<ThemeColors>) => mutate((m) => ({ ...m, colors: { ...m.colors, ...changes } })),
    [mutate]
  );

  const updateTypography = useCallback(
    (changes: Partial<Typography>) =>
      mutate((m) => ({ ...m, typography: { ...m.typography, ...changes } })),
    [mutate]
  );

  const updateHeading = useCallback(
    (tag: HeadingTag, changes: Partial<Typography['h1']>) =>
      mutate((m) => ({
        ...m,
        typography: { ...m.typography, [tag]: { ...m.typography[tag], ...changes } },
      })),
    [mutate]
  );

  const updateLayout = useCallback(
    (key: LayoutKey, changes: Partial<LayoutSettings>) =>
      mutate((m) => ({
        ...m,
        layouts: { ...m.layouts, [key]: { ...m.layouts[key], ...changes } },
      })),
    [mutate]
  );

  const setBackgroundImage = useCallback(
    (image: BackgroundImage | null) => mutate((m) => ({ ...m, backgroundImage: image })),
    [mutate]
  );

  const updateLight = useCallback(
    (changes: Partial<LightVariant>) => mutate((m) => ({ ...m, light: { ...m.light, ...changes } })),
    [mutate]
  );

  return {
    model: present,
    setModel,
    update,
    updateColors,
    updateTypography,
    updateHeading,
    updateLayout,
    setBackgroundImage,
    updateLight,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
