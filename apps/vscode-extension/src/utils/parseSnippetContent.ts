import { parse as jsonParse } from 'jsonc-parser';
import { load as yamlLoad } from 'js-yaml';
import { Step } from '@demotime/common';

/**
 * Parses snippet content based on the file extension.
 * Supports both JSON (.json) and YAML (.yaml, .yml) formats.
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
    if (!Array.isArray(result)) {
      throw new Error(`Error parsing YAML snippet file "${filePath}": Invalid snippet format`);
    }
    return result as Step[];
  } else {
    // Default to JSON parsing (supports both .json and .jsonc)
    const errors: any[] = [];
    const result = jsonParse(content, errors) as Step[];

    if (errors.length > 0) {
      throw new Error(
        `Error parsing JSON snippet file "${filePath}": ${errors.map((e) => e.error).join(', ')}`,
      );
    }

    if (!result || !Array.isArray(result)) {
      throw new Error(`Error parsing JSON snippet file "${filePath}": Invalid snippet format`);
    }

    return result;
  }
};
