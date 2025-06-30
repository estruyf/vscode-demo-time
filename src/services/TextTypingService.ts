import { diffChars, applyPatch } from 'diff';
import { Extension, Notifications } from '../services';
import { Config } from '../constants';
import {
  CancellationToken,
  Position,
  TextEditor,
  workspace,
  WorkspaceEdit,
  Range,
  Selection,
  TextEditorRevealType,
  Uri,
  window,
} from 'vscode';
import { getFileContents, writeFile } from '../utils';
import { InsertTypingMode, Step } from '../models';

export class TextTypingService {
  /**
   * Inserts text character by character
   */
  public static async typeText(
    editor: TextEditor,
    text: string,
    startPosition: Position | number,
    delayMs: number,
    token?: CancellationToken,
  ): Promise<void> {
    let i = 0;
    let currentPos: Position =
      typeof startPosition === 'number' ? editor.document.positionAt(startPosition) : startPosition;

    while (i < text.length) {
      if (token?.isCancellationRequested) {
        return;
      }
      let char = text[i];
      if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        char = '\r\n';
        i += 2;
      } else {
        i += 1;
      }
      const edit = new WorkspaceEdit();
      edit.insert(editor.document.uri, currentPos, char);
      await workspace.applyEdit(edit);
      // Update cursor position
      if (typeof startPosition === 'number') {
        startPosition += char.length;
        currentPos = editor.document.positionAt(startPosition);
      } else {
        if (char === '\r\n' || char === '\n') {
          currentPos = new Position(currentPos.line + 1, 0);
        } else {
          currentPos = new Position(currentPos.line, currentPos.character + char.length);
        }
      }
      editor.selection = new Selection(currentPos, currentPos);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  /**
   * Removes text character by character
   */
  public static async removeText(
    editor: TextEditor,
    textToRemove: string,
    startPosition: number,
    delayMs: number,
    token?: CancellationToken,
  ): Promise<void> {
    for (let i = textToRemove.length - 1; i >= 0; i--) {
      if (token?.isCancellationRequested) {
        return;
      }
      const currentPos = editor.document.positionAt(startPosition + i);
      const nextPos = currentPos.translate(0, 1);
      const edit = new WorkspaceEdit();
      edit.delete(editor.document.uri, new Range(currentPos, nextPos));
      await workspace.applyEdit(edit);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  /**
   * Inserts content with character-by-character typing effect
   */
  public static async insert(
    editor: TextEditor,
    content: string,
    position: Position,
    typingSpeed?: number,
    token?: CancellationToken,
  ): Promise<void> {
    const delayMs =
      typingSpeed || Extension.getInstance().getSetting<number>(Config.insert.typingSpeed) || 50;
    editor.revealRange(new Range(position, position), TextEditorRevealType.InCenter);
    editor.selection = new Selection(position, position);
    await TextTypingService.typeText(editor, content, position, delayMs, token);
  }

  /**
   * Replaces content with character-by-character typing effect
   */
  public static async replace(
    editor: TextEditor,
    range: Range,
    content: string,
    typingSpeed?: number,
    token?: CancellationToken,
  ): Promise<void> {
    const deleteEdit = new WorkspaceEdit();
    deleteEdit.delete(editor.document.uri, range);
    await workspace.applyEdit(deleteEdit);
    await TextTypingService.insert(editor, content, range.start, typingSpeed, token);
  }

  /**
   * Applies a patch to the given file content, optionally displaying a typing effect in the editor.
   *
   * @param filePath - The URI of the file to patch.
   * @param content - The current content of the file.
   * @param step - The step object containing patch information.
   * @param token - (Optional) A cancellation token to cancel the operation.
   * @returns A promise that resolves when the patch has been applied.
   */
  public static async applyPatch(
    filePath: Uri,
    content: string,
    step: Step,
    token?: CancellationToken,
  ) {
    if (!step?.patch) {
      Notifications.error('No patch provided');
      return;
    }

    const wsFolder = Extension.getInstance().workspaceFolder;
    if (!wsFolder) {
      return;
    }

    const patchContent = await getFileContents(wsFolder, step.patch);
    if (!patchContent) {
      Notifications.error('No file content retrieved for the patch');
      return;
    }

    const patched = applyPatch(content, patchContent);
    if (!patched) {
      Notifications.error('Could not apply patch to the file');
      return;
    }

    const typingMode = TextTypingService.getInsertTypingMode(step);
    const typingSpeed = TextTypingService.getInsertTypingSpeed(step);

    if (typingMode === 'character-by-character') {
      await TextTypingService.applyDiffByChar(filePath, content, patched, token);
    } else if (typingMode === 'line-by-line') {
      await TextTypingService.applyDiffByLine(filePath, patched, typingSpeed, token);
    } else {
      // Instant mode (default)
      await writeFile(filePath, patched);
    }
  }

  /**
   * Gets the insert typing mode for a step or global config.
   */
  public static getInsertTypingMode(step?: Step): InsertTypingMode {
    return (
      step?.insertTypingMode ||
      Extension.getInstance().getSetting<InsertTypingMode>(Config.insert.typingMode) ||
      'instant'
    );
  }

  /**
   * Gets the insert typing speed for a step or global config.
   */
  public static getInsertTypingSpeed(step?: Step): number {
    return (
      step?.insertTypingSpeed ||
      Extension.getInstance().getSetting<number>(Config.insert.typingSpeed) ||
      50
    );
  }

  /**
   * Applies patch changes with a typewriter effect to simulate live coding
   */
  private static async applyDiffByChar(
    filePath: Uri,
    currentContent: string,
    targetContent: string,
    token?: CancellationToken,
  ): Promise<void> {
    const editor = TextTypingService.findEditorForFile(filePath);
    if (editor) {
      const delayMs = Extension.getInstance().getSetting<number>(Config.patch.typingSpeed) || 50;
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
            await TextTypingService.removeText(editor, diff.value, currentPosition, delayMs, token);
          }
          if (diff.added) {
            await TextTypingService.typeText(editor, diff.value, currentPosition, delayMs, token);
            currentPosition += diff.value.length;
          }
        }
      } catch (error) {
        Notifications.error('Error applying patch with typing effect', (error as Error).message);
      }
    } else {
      await writeFile(filePath, targetContent);
    }
  }

  /**
   * Applies patch changes line by line with a typing effect.
   */
  private static async applyDiffByLine(
    filePath: Uri,
    targetContent: string,
    typingSpeed: number,
    token?: CancellationToken,
  ): Promise<void> {
    const editor = TextTypingService.findEditorForFile(filePath);
    if (editor) {
      const lines = targetContent.split(/\r?\n/);
      let doc = editor.document;
      // Remove all content first
      const edit = new WorkspaceEdit();
      const fullRange = new Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
      edit.delete(filePath, fullRange);
      await workspace.applyEdit(edit);
      let pos = new Position(0, 0);
      for (let i = 0; i < lines.length; i++) {
        if (token?.isCancellationRequested) {
          return;
        }
        const line = lines[i] + (i < lines.length - 1 ? '\n' : '');
        const editLine = new WorkspaceEdit();
        editLine.insert(filePath, pos, line);
        await workspace.applyEdit(editLine);
        pos = new Position(i + 1, 0);
        await new Promise((resolve) => setTimeout(resolve, typingSpeed));
      }
    } else {
      await writeFile(filePath, targetContent);
    }
  }

  /**
   * Finds and returns the visible text editor associated with the specified file URI.
   *
   * @param filePath - The URI of the file to find the editor for.
   * @returns The {@link TextEditor} instance if found; otherwise, `undefined`.
   */
  private static findEditorForFile(filePath: Uri) {
    const editor = window.visibleTextEditors.find(
      (e) => e.document.uri.toString() === filePath.toString(),
    );
    return editor;
  }
}
