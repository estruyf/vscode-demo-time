import { Uri } from 'vscode';
import { resolveCodeFiles, ResolveCodeFilesResult } from '@demotime/common';
import { Extension } from '../services/Extension';
import { isPathInWorkspace } from './isPathInWorkspace';
import { parseWinPath } from './parseWinPath';
import { readFile } from './readFile';

/**
 * Gets the URI of a file that a code block on a slide shows. Paths that start with `./` or `../`
 * are relative to the slide file, other paths to the workspace folder.
 *
 * @returns `undefined` when the file is outside of the workspace folder
 */
export const getCodeFileUri = (filePath: string, slideUri?: Uri): Uri | undefined => {
  const wsFolder = Extension.getInstance().workspaceFolder;
  if (!wsFolder || !filePath) {
    return undefined;
  }

  const normalized = parseWinPath(filePath);
  const uri =
    slideUri && /^\.\.?\//.test(normalized)
      ? Uri.joinPath(slideUri, '..', normalized)
      : Uri.joinPath(wsFolder.uri, normalized.replace(/^\/+/, ''));

  return isPathInWorkspace(uri, wsFolder) ? uri : undefined;
};

/**
 * Replaces the code blocks with a `file` option, like ` ```ts file="src/app.ts#L10-24" `, by the
 * code of that file.
 *
 * @param slideUri The slide file, for paths relative to the slide
 */
export const resolveSlideCodeFiles = async (
  content: string,
  slideUri?: Uri,
): Promise<ResolveCodeFilesResult & { uris: Uri[] }> => {
  const uris: Uri[] = [];
  const result = await resolveCodeFiles(content, async (filePath) => {
    const uri = getCodeFileUri(filePath, slideUri);
    if (!uri) {
      return undefined;
    }

    uris.push(uri);
    try {
      return await readFile(uri);
    } catch {
      return undefined;
    }
  });

  return { ...result, uris };
};
