import { Uri, WorkspaceFolder } from 'vscode';
import { relative, isAbsolute } from 'path';

/**
 * Validates that a resolved URI path is contained within the workspace root.
 * Prevents path traversal attacks by checking if the resolved path escapes
 * the workspace directory.
 * 
 * @param resolvedPath - The resolved URI to validate
 * @param workspaceFolder - The workspace folder to check containment against
 * @returns true if the path is safely contained within the workspace, false otherwise
 */
export const isPathInWorkspace = (
  resolvedPath: Uri | undefined,
  workspaceFolder: WorkspaceFolder | undefined | null
): boolean => {
  if (!resolvedPath || !workspaceFolder) {
    return false;
  }

  const workspaceRoot = workspaceFolder.uri.fsPath;
  const targetPath = resolvedPath.fsPath;

  // Get the relative path from workspace root to target
  const relativePath = relative(workspaceRoot, targetPath);

  // If the relative path starts with '..' or is absolute, it's outside the workspace
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    return false;
  }

  return true;
};
