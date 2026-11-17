import { Uri, WorkspaceFolder } from 'vscode';
import { collectSlideIncludes, Slide, SlideIncludes, SlideParser } from '@demotime/common';
import { DemoRunner } from '../services/DemoRunner';
import { Extension } from '../services/Extension';
import { getFileContents } from './getFileContents';
import { getFileUri } from './getFileUri';
import { getRelPath } from './getRelPath';
import { isPathInWorkspace } from './isPathInWorkspace';
import { parseWinPath } from './parseWinPath';
import { readFile } from './readFile';

/**
 * Reads the files that the slides of a slide file include with `src`, and the files they include.
 *
 * @param markdown The content of the slide file
 * @param fileUri The slide file
 * @returns `undefined` when the slide file is outside of the workspace folder
 */
export const getSlideIncludes = async (
  markdown: string,
  fileUri: Uri,
): Promise<SlideIncludes | undefined> => {
  const wsFolder = Extension.getInstance().workspaceFolder;
  if (!wsFolder || !isPathInWorkspace(fileUri, wsFolder)) {
    return undefined;
  }

  return collectSlideIncludes(markdown, getRelPath(parseWinPath(fileUri.fsPath)), async (path) => {
    const uri = Uri.joinPath(wsFolder.uri, path);
    return isPathInWorkspace(uri, wsFolder) ? readFile(uri) : undefined;
  });
};

/**
 * Parses the slides of a slide file, where the slides with a `src` are replaced by the slides of
 * that file.
 *
 * @param markdown The content of the slide file
 * @param fileUri The slide file, which the `src` paths are relative to
 */
export const parseSlideFile = async (markdown: string, fileUri?: Uri): Promise<Slide[]> => {
  const includes = fileUri ? await getSlideIncludes(markdown, fileUri) : undefined;
  return new SlideParser({ includes }).parseSlides(markdown);
};

/**
 * Reads and parses the slides of the file of an `openSlide` move, with the slides it includes.
 *
 * @param path The path of the move
 * @returns `undefined` when the file can't be read
 */
export const readSlideFile = async (
  workspaceFolder: WorkspaceFolder,
  path?: string,
): Promise<Slide[] | undefined> => {
  const content = await getFileContents(workspaceFolder, path);
  if (!content || !path) {
    return undefined;
  }

  const version = await DemoRunner.getCurrentVersion();
  return parseSlideFile(content, getFileUri(path, workspaceFolder, version));
};
