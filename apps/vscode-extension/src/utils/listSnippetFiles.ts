import * as path from 'path';
import { Uri, workspace } from 'vscode';
import { Extension } from '../services';

export interface SnippetFileInfo {
  label: string;
  path: string;
  description?: string;
}

const SNIPPET_FOLDERS = ['snippet', 'snippets'];
const SNIPPET_EXTENSIONS = ['.json', '.yaml', '.yml'];

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

    try {
      const entries = await workspace.fs.readDirectory(folderUri);

      for (const [name, fileType] of entries) {
        const ext = path.extname(name).toLowerCase();
        if (fileType === 1 /* FileType.File */ && SNIPPET_EXTENSIONS.includes(ext)) {
          const relativePath = `.demo/${folder}/${name}`;
          results.push({
            label: name,
            path: relativePath,
            description: relativePath,
          });
        }
      }
    } catch {
      // Folder doesn't exist — skip silently
    }
  }

  return results;
};
