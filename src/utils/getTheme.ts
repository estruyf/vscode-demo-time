import { extensions, Uri, workspace } from "vscode";
import { Theme } from "../models";
import { readFile } from ".";

export const getTheme = async () => {
  let crntTheme = workspace.getConfiguration("workbench").get("colorTheme");

  // Get all the theme extensions
  const allExtensions = extensions.all.filter((e) => {
    const pkg = e.packageJSON;
    return pkg.contributes && pkg.contributes.themes && pkg.contributes.themes.length > 0;
  });

  // Get the theme extension that matches the active theme
  const themeExtension = allExtensions.find((e) => {
    const pkg = e.packageJSON;
    return pkg.contributes.themes.find((theme: Theme) => theme.label === crntTheme || theme.id === crntTheme);
  });

  if (!themeExtension) {
    throw new Error(`Could not find theme extension for ${crntTheme}`);
  }

  // Get the theme file
  const themeFile: Theme = themeExtension.packageJSON.contributes.themes.find(
    (theme: Theme) => theme.label === crntTheme || theme.id === crntTheme
  );

  const themePath = Uri.joinPath(themeExtension.extensionUri, themeFile.path);
  const fileContents = await readFile(themePath);

  const theme = JSON.parse(fileContents);
  if (!theme) {
    throw new Error(`Could not find theme file for ${crntTheme}`);
  }

  if (theme.include) {
    const includePath = Uri.joinPath(themePath, "..", theme.include);
    const includeContents = await readFile(includePath);
    return { ...theme, ...JSON.parse(includeContents) };
  }

  return theme;
};
