import { extensions, Uri, workspace } from "vscode";
import { Theme } from "../models";
import { readFile } from ".";

export const getTheme = async (themeName?: string) => {
  let crntTheme = workspace.getConfiguration("workbench").get("colorTheme") as string;

  // Get all the theme extensions
  const allExtensions = extensions.all.filter((e) => {
    const pkg = e.packageJSON;
    return pkg.contributes && pkg.contributes.themes && pkg.contributes.themes.length > 0;
  });

  themeName = !themeName || themeName === "" ? crntTheme : themeName;

  // Get the theme extension that matches the active theme
  const themeExtension = allExtensions.find((e) => {
    const pkg = e.packageJSON;
    return pkg.contributes.themes.find((theme: Theme) => theme.label === themeName || theme.id === themeName);
  });

  if (!themeExtension) {
    throw new Error(`Could not find theme extension for ${themeName}`);
  }

  // Get the theme file
  const themeFile: Theme = themeExtension.packageJSON.contributes.themes.find(
    (theme: Theme) => theme.label === themeName || theme.id === themeName
  );

  const themePath = Uri.joinPath(themeExtension.extensionUri, themeFile.path);
  const fileContents = await readFile(themePath);

  const theme = JSON.parse(fileContents);
  if (!theme) {
    throw new Error(`Could not find theme file for ${themeName}`);
  }

  if (theme.include) {
    const includePath = Uri.joinPath(themePath, "..", theme.include);
    const includeContents = await readFile(includePath);
    return { ...theme, ...JSON.parse(includeContents) };
  }

  return theme;
};
