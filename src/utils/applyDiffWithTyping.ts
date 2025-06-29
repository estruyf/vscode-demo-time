import * as vscode from 'vscode';
import { diffChars } from 'diff';
import { Extension, Notifications } from '../services';
import { Config } from '../constants';

/**
 * Applies patch changes with a typewriter effect to simulate live coding
 * @param editor The text editor to apply changes to
 * @param currentContent Current content of the document
 * @param targetContent Target content to transform to
 * @param token Optional cancellation token to stop typing effect
 */
export async function applyDiffWithTyping(
  editor: vscode.TextEditor,
  currentContent: string,
  targetContent: string,
  token?: vscode.CancellationToken,
): Promise<void> {
  const typingSpeed = Extension.getInstance().getSetting<number>(Config.patch.typingSpeed) || 50;
  const delayMs = 1000 / typingSpeed;

  try {
    const differences = diffChars(currentContent, targetContent);
    let currentPosition = 0;

    for (const diff of differences) {
      if (token?.isCancellationRequested) {
        return;
      }

      if (!diff.added && !diff.removed) {
        currentPosition += diff.count!;
        continue;
      }

      if (diff.removed) {
        await removeText(editor, diff.value, currentPosition, delayMs, token);
      }

      if (diff.added) {
        await insertText(editor, diff.value, currentPosition, delayMs, token);
        currentPosition += diff.value.length;
      }
    }
  } catch (error) {
    Notifications.error('Error applying patch with typing effect', (error as Error).message);
  }
}

/**
 * Removes text character by character with typing effect
 */
async function removeText(
  editor: vscode.TextEditor,
  textToRemove: string,
  startPosition: number,
  delayMs: number,
  token?: vscode.CancellationToken,
): Promise<void> {
  for (let i = textToRemove.length - 1; i >= 0; i--) {
    if (token?.isCancellationRequested) {
      return;
    }

    const currentPos = editor.document.positionAt(startPosition + i);
    const nextPos = currentPos.translate(0, 1);

    const edit = new vscode.WorkspaceEdit();
    edit.delete(editor.document.uri, new vscode.Range(currentPos, nextPos));

    await vscode.workspace.applyEdit(edit);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

/**
 * Inserts text character by character with typing effect
 */
async function insertText(
  editor: vscode.TextEditor,
  textToAdd: string,
  startPosition: number,
  delayMs: number,
  token?: vscode.CancellationToken,
): Promise<void> {
  let i = 0;
  while (i < textToAdd.length) {
    if (token?.isCancellationRequested) {
      return;
    }

    let char = textToAdd[i];

    // Handle line breaks properly
    if (char === '\r' && i + 1 < textToAdd.length && textToAdd[i + 1] === '\n') {
      char = '\r\n';
      i += 2;
    } else {
      i += 1;
    }

    const currentPos = editor.document.positionAt(startPosition);

    const edit = new vscode.WorkspaceEdit();
    edit.insert(editor.document.uri, currentPos, char);

    await vscode.workspace.applyEdit(edit);
    startPosition += char.length;

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
