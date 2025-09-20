import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

interface UseThemeManagerReturn {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'demotime-theme-preference';

export const useThemeManager = (): UseThemeManagerReturn => {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  // Get VS Code's current theme
  const getVSCodeTheme = useCallback((): ResolvedTheme => {
    const themeKind = document.body.getAttribute('data-vscode-theme-kind');
    const hasVSCodeDarkClass = document.body.classList.contains('vscode-dark');
    
    if (hasVSCodeDarkClass || themeKind?.includes('dark')) {
      return 'dark';
    }
    return 'light';
  }, []);

  // Resolve the actual theme to apply
  const resolveTheme = useCallback((currentTheme: Theme): ResolvedTheme => {
    if (currentTheme === 'auto') {
      return getVSCodeTheme();
    }
    return currentTheme;
  }, [getVSCodeTheme]);

  // Apply theme to document
  const applyTheme = useCallback((resolvedTheme: ResolvedTheme) => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
    // Remove existing theme classes
    htmlElement.classList.remove('light', 'dark');
    bodyElement.classList.remove('light', 'dark');
    
    // Add new theme class
    htmlElement.classList.add(resolvedTheme);
    bodyElement.classList.add(resolvedTheme);
    
    // Set data attribute for CSS selectors
    htmlElement.setAttribute('data-theme', resolvedTheme);
  }, []);

  // Load saved theme preference
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY) as Theme;
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setThemeState(savedTheme);
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
  }, []);

  // Update resolved theme when theme or VS Code theme changes
  useEffect(() => {
    const newResolvedTheme = resolveTheme(theme);
    setResolvedTheme(newResolvedTheme);
    applyTheme(newResolvedTheme);
  }, [theme, resolveTheme, applyTheme]);

  // Listen for VS Code theme changes when in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const observer = new MutationObserver(() => {
      const newResolvedTheme = resolveTheme(theme);
      if (newResolvedTheme !== resolvedTheme) {
        setResolvedTheme(newResolvedTheme);
        applyTheme(newResolvedTheme);
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-vscode-theme-kind']
    });

    return () => observer.disconnect();
  }, [theme, resolvedTheme, resolveTheme, applyTheme]);

  // Set theme and save preference
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }, []);

  // Toggle between light and dark (skipping auto)
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme
  };
};