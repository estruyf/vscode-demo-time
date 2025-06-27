import { env } from 'vscode';
import { Notifications } from '../services/Notifications';
import { getFileContents } from './getFileContents';
import { insertVariables } from './insertVariables';

/**
 * Copies content to the clipboard, optionally reading from a file and replacing variables.
 * @param content The content to copy (optional if contentPath is provided)
 * @param contentPath Optional file path to read content from
 * @param variables Optional variables to replace in the content
 * @param workspaceFolder The workspace folder context
 */
export async function copyToClipboard({
  content = '',
  contentPath,
  variables,
  workspaceFolder,
}: {
  content?: string;
  contentPath?: string;
  variables?: Record<string, any>;
  workspaceFolder: any;
}): Promise<void> {
  // If contentPath is provided, read content from file
  if (contentPath) {
    const fileContent = await getFileContents(workspaceFolder, contentPath);
    if (!fileContent) {
      Notifications.error(`Could not read content from file: ${contentPath}`);
      return;
    }
    content = fileContent;
  }

  // Replace variables in content if any
  if (variables && Object.keys(variables).length > 0) {
    content = await insertVariables(content, variables);
  }

  if (!content) {
    Notifications.error('No content to copy to clipboard');
    return;
  }

  try {
    await env.clipboard.writeText(content);
  } catch (error) {
    Notifications.error(`Failed to copy to clipboard: ${(error as Error).message}`);
  }
}
