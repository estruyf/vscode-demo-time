import { Uri } from 'vscode';
import { readFile } from './readFile';
import { Extension } from '../services';

/**
 * Reads a JSON or YAML file and extracts all unique placeholders of the form {<name>}.
 * @param filePath Path to the snippet file (string or Uri)
 * @returns Array of unique placeholder names (without braces)
 */
export const checkSnippetArgs = async (filePath: string): Promise<string[]> => {
  // Support both string and Uri
  const workspaceFolder = Extension.getInstance().workspaceFolder;
  if (!workspaceFolder) {
    throw new Error('No workspace folder found. Cannot resolve snippet file path.');
  }
  const uri = Uri.joinPath(workspaceFolder.uri, filePath);
  const content = await readFile(uri);
  // Match all occurrences of {NAME} (non-greedy, no nested braces)
  const regex = /\{([a-zA-Z0-9_-]+)\}/g;
  const names = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    names.add(match[1]);
  }
  return Array.from(names);
};
