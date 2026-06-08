import { useCallback, useEffect, useRef, useState } from 'react';
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

export interface ThemeModelApi {
  model: ThemeModel;
  /** Replace the whole model (import, preset, reset). */
  setModel: (model: ThemeModel) => void;
  update: (changes: Partial<ThemeModel>) => void;
  updateColors: (changes: Partial<ThemeColors>) => void;
  updateTypography: (changes: Partial<Typography>) => void;
  updateHeading: (tag: HeadingTag, changes: Partial<Typography['h1']>) => void;
  updateLayout: (key: LayoutKey, changes: Partial<LayoutSettings>) => void;
  setBackgroundImage: (image: BackgroundImage | null) => void;
  updateLight: (changes: Partial<LightVariant>) => void;
}

export function useThemeModel(): ThemeModelApi {
  const [model, setModelState] = useState<ThemeModel>(() => loadTheme() ?? createDefaultTheme());

  // Debounced autosave of the working theme.
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveTheme(model), 400);
    return () => clearTimeout(timer.current);
  }, [model]);

  const setModel = useCallback((next: ThemeModel) => setModelState(next), []);

  const update = useCallback(
    (changes: Partial<ThemeModel>) => setModelState((m) => ({ ...m, ...changes })),
    []
  );

  const updateColors = useCallback(
    (changes: Partial<ThemeColors>) =>
      setModelState((m) => ({ ...m, colors: { ...m.colors, ...changes } })),
    []
  );

  const updateTypography = useCallback(
    (changes: Partial<Typography>) =>
      setModelState((m) => ({ ...m, typography: { ...m.typography, ...changes } })),
    []
  );

  const updateHeading = useCallback(
    (tag: HeadingTag, changes: Partial<Typography['h1']>) =>
      setModelState((m) => ({
        ...m,
        typography: { ...m.typography, [tag]: { ...m.typography[tag], ...changes } },
      })),
    []
  );

  const updateLayout = useCallback(
    (key: LayoutKey, changes: Partial<LayoutSettings>) =>
      setModelState((m) => ({
        ...m,
        layouts: { ...m.layouts, [key]: { ...m.layouts[key], ...changes } },
      })),
    []
  );

  const setBackgroundImage = useCallback(
    (image: BackgroundImage | null) => setModelState((m) => ({ ...m, backgroundImage: image })),
    []
  );

  const updateLight = useCallback(
    (changes: Partial<LightVariant>) =>
      setModelState((m) => ({ ...m, light: { ...m.light, ...changes } })),
    []
  );

  return {
    model,
    setModel,
    update,
    updateColors,
    updateTypography,
    updateHeading,
    updateLayout,
    setBackgroundImage,
    updateLight,
  };
}
