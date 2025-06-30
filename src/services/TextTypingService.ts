import { diffChars } from 'diff';
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
} from 'vscode';

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
   * Applies patch changes with a typewriter effect to simulate live coding
   */
  public static async applyDiff(
    editor: TextEditor,
    currentContent: string,
    targetContent: string,
    token?: CancellationToken,
  ): Promise<void> {
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
  }
}
