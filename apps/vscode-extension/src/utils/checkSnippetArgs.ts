import { Uri } from 'vscode';
import { readFile } from './readFile';
import { Extension } from '../services';
import { isSnippetFileFormat, SnippetField } from '@demotime/common';
import { parse as jsonParse } from 'jsonc-parser';
import { load as yamlLoad } from 'js-yaml';

/**
 * Reads a JSON or YAML snippet file and returns its field definitions.
 * - For the new gallery format (object with `fields`), returns the full SnippetField metadata.
 * - For the legacy format (plain array of steps), extracts {PLACEHOLDER} names as synthetic fields.
 * @param filePath Workspace-relative path to the snippet file
 * @returns Array of SnippetField objects
 */
export const checkSnippetArgs = async (filePath: string): Promise<SnippetField[]> => {
  const workspaceFolder = Extension.getInstance().workspaceFolder;
  if (!workspaceFolder) {
    throw new Error('No workspace folder found. Cannot resolve snippet file path.');
  }
  const uri = Uri.joinPath(workspaceFolder.uri, filePath);
  const content = await readFile(uri);

  const lower = filePath.toLowerCase();

  // Try to parse as structured snippet first
  let parsed: unknown;
  try {
    if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
      parsed = yamlLoad(content);
    } else {
      const errors: any[] = [];
      parsed = jsonParse(content, errors);
    }
  } catch {
    // Fall through to regex scan below
  }

  if (parsed && isSnippetFileFormat(parsed) && parsed.fields && parsed.fields.length > 0) {
    return parsed.fields;
  }

  // Legacy format: regex-scan the raw content for {PLACEHOLDER} occurrences
  const regex = /\{([a-zA-Z0-9_-]+)\}/g;
  const names = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    names.add(match[1]);
  }
  return Array.from(names).map((name) => ({ name, type: 'string' as const }));
};
