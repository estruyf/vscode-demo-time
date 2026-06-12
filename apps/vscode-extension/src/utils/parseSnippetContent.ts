import { parse as jsonParse } from 'jsonc-parser';
import { load as yamlLoad } from 'js-yaml';
import { isSnippetFileFormat, Step } from '@demotime/common';

/**
 * Parses snippet content based on the file extension.
 * Supports both JSON (.json) and YAML (.yaml, .yml) formats.
 * Supports both the legacy format (array of steps) and the new gallery format
 * (object with `steps` array plus metadata fields).
 *
 * @param content The snippet content as a string
 * @param filePath The path to the snippet file to determine the format
 * @returns Array of Step objects
 */
export const parseSnippetContent = (content: string, filePath: string): Step[] => {
  const path = filePath.toLowerCase();

  if (path.endsWith('.yaml') || path.endsWith('.yml')) {
    let result: unknown;
    try {
      result = yamlLoad(content);
    } catch (error) {
      throw new Error(`Error parsing YAML snippet file "${filePath}": ${error}`);
    }
    if (isSnippetFileFormat(result)) {
      return result.steps;
    }
    if (!Array.isArray(result)) {
      throw new Error(`Error parsing YAML snippet file "${filePath}": Invalid snippet format`);
    }
    return result as Step[];
  } else {
    // Default to JSON parsing (supports both .json and .jsonc)
    const errors: any[] = [];
    const result = jsonParse(content, errors) as unknown;

    if (errors.length > 0) {
      throw new Error(
        `Error parsing JSON snippet file "${filePath}": ${errors.map((e: any) => e.error).join(', ')}`,
      );
    }

    if (!result) {
      throw new Error(`Error parsing JSON snippet file "${filePath}": Invalid snippet format`);
    }

    if (isSnippetFileFormat(result)) {
      return result.steps;
    }

    if (!Array.isArray(result)) {
      throw new Error(`Error parsing JSON snippet file "${filePath}": Invalid snippet format`);
    }

    return result as Step[];
  }
};
