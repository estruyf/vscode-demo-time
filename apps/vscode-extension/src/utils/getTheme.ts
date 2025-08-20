import { extensions, Uri, workspace } from 'vscode';
import { Theme } from '../models';
import { readFile } from '.';

// Helper to get all extensions that contribute themes, with error handling
const getThemeExtensions = () =>
  extensions.all.filter((e) => {
    const pkg = e.packageJSON;
    const contributes = pkg?.contributes;
    const themes = contributes?.themes;
    return Array.isArray(themes) && themes.length > 0;
  });

export const getThemes = async () => {
  const themes: Theme[] = [];
  const allExtensions = getThemeExtensions();

  for (const ext of allExtensions) {
    const pkg = ext.packageJSON;
    const extThemes = pkg?.contributes?.themes;
    if (Array.isArray(extThemes)) {
      for (const theme of extThemes) {
        themes.push(theme);
      }
    }
  }

  return themes;
};

export const getTheme = async (themeName?: string) => {
  let crntTheme = workspace.getConfiguration('workbench').get('colorTheme') as string;

  // Get all the theme extensions
  const allExtensions = getThemeExtensions();

  themeName = !themeName || themeName === '' ? crntTheme : themeName;

  // Get the theme extension that matches the active theme
  const themeExtension = allExtensions.find((e) => {
    const pkg = e.packageJSON;
    const extThemes = pkg?.contributes?.themes;
    if (!Array.isArray(extThemes)) {
      return false;
    }
    return extThemes.find((theme: Theme) => theme.label === themeName || theme.id === themeName);
  });

  if (!themeExtension) {
    throw new Error(`Could not find theme extension for ${themeName}`);
  }

  // Get the theme file
  const extThemes = themeExtension.packageJSON?.contributes?.themes;
  if (!Array.isArray(extThemes)) {
    throw new Error(`Theme extension for ${themeName} has no valid themes array.`);
  }
  const themeFile: Theme | undefined = extThemes.find(
    (theme: Theme) => theme.label === themeName || theme.id === themeName,
  );
  if (!themeFile?.path) {
    throw new Error(`Could not find theme file for ${themeName}`);
  }

  const themePath = Uri.joinPath(themeExtension.extensionUri, themeFile.path);
  const fileContents = await readFile(themePath);

  const theme = JSON.parse(fileContents);
  if (!theme) {
    throw new Error(`Could not find theme file for ${themeName}`);
  }

  if (theme.include) {
    const includePath = Uri.joinPath(themePath, '..', theme.include);
    const includeContents = await readFile(includePath);
    return { ...theme, ...JSON.parse(includeContents) };
  }

  return theme;
};
