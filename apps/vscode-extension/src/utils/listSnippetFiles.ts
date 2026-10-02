import * as path from 'path';
import { FileType, Uri, WorkspaceFolder, workspace } from 'vscode';
import { Extension } from '../services';
import { parse as jsonParse } from 'jsonc-parser';
import { load as yamlLoad } from 'js-yaml';
import { getFileContents } from './getFileContents';

export interface SnippetFileInfo {
  label: string;
  path: string;
  description?: string;
}

const SNIPPET_FOLDERS = ['snippet', 'snippets'];
const SNIPPET_EXTENSIONS = ['.json', '.yaml', '.yml'];

const getSnippetLabel = async (
  snippetPath: string,
  fallbackName: string,
  workspaceFolder: WorkspaceFolder,
): Promise<string> => {
  try {
    const content = await getFileContents(workspaceFolder, snippetPath);
    if (!content) {
      return fallbackName;
    }

    const ext = path.extname(fallbackName).toLowerCase();

    let parsed: unknown;
    if (ext === '.yaml' || ext === '.yml') {
      parsed = yamlLoad(content);
    } else {
      const errors: any[] = [];
      parsed = jsonParse(content, errors);
      if (errors.length > 0) {
        return fallbackName;
      }
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const maybeName = (parsed as { name?: unknown }).name;
      if (typeof maybeName === 'string' && maybeName.trim()) {
        return maybeName.trim();
      }
    }
  } catch {
    // Ignore parse/read errors and keep filename fallback
  }

  return fallbackName;
};

const collectSnippetFiles = async (
  folderUri: Uri,
  pathPrefix: string,
  workspaceFolder: WorkspaceFolder,
  results: SnippetFileInfo[],
): Promise<void> => {
  const entries = await workspace.fs.readDirectory(folderUri);

  for (const [name, fileType] of entries) {
    const entryUri = Uri.joinPath(folderUri, name);
    const nextPrefix = `${pathPrefix}/${name}`;

    if (fileType === FileType.Directory) {
      await collectSnippetFiles(entryUri, nextPrefix, workspaceFolder, results);
      continue;
    }

    const ext = path.extname(name).toLowerCase();
    if (fileType === FileType.File && SNIPPET_EXTENSIONS.includes(ext)) {
      const label = await getSnippetLabel(nextPrefix, name, workspaceFolder);
      results.push({
        label,
        path: nextPrefix,
        description: nextPrefix,
      });
    }
  }
};

/**
 * Scans the `.demo/snippet` and `.demo/snippets` folders in the current workspace
 * and returns metadata for each snippet file found.
 */
export const listSnippetFiles = async (): Promise<SnippetFileInfo[]> => {
  const workspaceFolder = Extension.getInstance().workspaceFolder;
  if (!workspaceFolder) {
    return [];
  }

  const results: SnippetFileInfo[] = [];

  for (const folder of SNIPPET_FOLDERS) {
    const folderUri = Uri.joinPath(workspaceFolder.uri, '.demo', folder);
    const pathPrefix = `.demo/${folder}`;

    try {
      await collectSnippetFiles(folderUri, pathPrefix, workspaceFolder, results);
    } catch {
      // Folder doesn't exist — skip silently
    }
  }

  return results;
};
