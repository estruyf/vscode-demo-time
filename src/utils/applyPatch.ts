import { Uri, window, CancellationToken } from 'vscode';
import { Extension, Notifications, TextTypingService } from '../services';
import { applyPatch as applyFilePatch } from 'diff';
import { getFileContents, writeFile } from '.';
import { Config } from '../constants';

export const applyPatch = async (
  filePath: Uri,
  content: string,
  patch?: string,
  token?: CancellationToken,
) => {
  if (!patch) {
    Notifications.error('No patch provided');
    return;
  }

  const wsFolder = Extension.getInstance().workspaceFolder;
  if (!wsFolder) {
    return;
  }

  const patchContent = await getFileContents(wsFolder, patch);
  if (!patchContent) {
    Notifications.error('No file content retrieved for the patch');
    return;
  }

  const patched = applyFilePatch(content, patchContent);
  if (!patched) {
    Notifications.error('Could not apply patch to the file');
    return;
  }

  // Check if user wants typing effect
  const useTypingEffect = Extension.getInstance().getSetting<boolean>(Config.patch.useTypingEffect);

  if (useTypingEffect) {
    // Find the active editor for the file
    const editor = window.visibleTextEditors.find(
      (e) => e.document.uri.toString() === filePath.toString(),
    );

    if (editor) {
      await TextTypingService.applyDiff(editor, content, patched, token);
    } else {
      // Fallback to direct file write if no editor is open
      await writeFile(filePath, patched);
    }
  } else {
    // Apply patch directly by writing to file
    await writeFile(filePath, patched);
  }
};
