import { diffChars, applyPatch } from 'diff';
import { Extension, Logger, Notifications } from '../services';
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
  TextDocument,
} from 'vscode';
import {
  getFileContents,
  getInsertionSpeed,
  getLineRange,
  saveFiles,
  sleep,
  writeFile,
} from '../utils';
import { InsertTypingMode, Step } from '../models';

export class TextTypingService {
  /**
   * Inserts content into a text editor at the specified position or range.
   * If a position is provided, the content is inserted at that position.
   * If a range is provided, the content replaces the text within that range.
   * @param textEditor The text editor where the content should be inserted.
   * @param editor The text document associated with the text editor.
   * @param fileUri The URI of the file where the content should be inserted.
   * @param content The content to be inserted.
   * @param position The position at which the content should be inserted.
   * @param step The current step being executed (for accessing action-level properties).
   */
  public static async insert(
    textEditor: TextEditor,
    editor: TextEditor['document'],
    fileUri: Uri,
    content: string,
    position: Position | undefined,
    step: Step,
  ): Promise<void> {
    if (!position) {
      return;
    }

    let lineContent = null;
    try {
      const line = editor.lineAt(position);
      lineContent = line.text;
    } catch (error) {
      Logger.error(`Error getting line content: ${(error as Error).message}`);
    }

    const typingMode = TextTypingService.getInsertTypingMode(step);
    const typingSpeed = getInsertionSpeed(step.insertTypingSpeed);
    let range = new Range(position, position);

    if (!lineContent) {
      await TextTypingService.insertAtPosition(
        textEditor,
        fileUri,
        content,
        position,
        typingMode,
        typingSpeed,
      );
    } else {
      await TextTypingService.replaceAtPosition(
        textEditor,
        editor,
        fileUri,
        content,
        position,
        typingMode,
        typingSpeed,
      );
    }

    if (textEditor) {
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
      textEditor.selection = new Selection(range.start, range.start);
    }

    await saveFiles();
  }

  private static async insertAtPosition(
    textEditor: TextEditor,
    fileUri: Uri,
    content: string,
    position: Position,
    typingMode: InsertTypingMode,
    typingSpeed: number | undefined,
  ) {
    if (typingMode === 'character-by-character') {
      textEditor.revealRange(new Range(position, position), TextEditorRevealType.InCenter);
      await TextTypingService.insertCharByChar(textEditor, content, position, typingSpeed);
    } else if (typingMode === 'hacker-typer') {
      textEditor.revealRange(new Range(position, position), TextEditorRevealType.InCenter);
      await TextTypingService.insertHackerTyper(textEditor, content, position, typingSpeed);
    } else if (typingSpeed && typingMode === 'line-by-line') {
      const lineRange = textEditor.document.lineAt(position).range;
      textEditor.revealRange(lineRange, TextEditorRevealType.InCenter);
      await TextTypingService.insertLineByLine(fileUri, lineRange.start.line, content, typingSpeed);
    } else {
      // Instant mode (default)
      await TextTypingService.insertInstant(fileUri, position, content);
    }
  }

  private static async replaceAtPosition(
    textEditor: TextEditor,
    editor: TextDocument,
    fileUri: Uri,
    content: string,
    position: Position,
    typingMode: InsertTypingMode,
    typingSpeed: number | undefined,
  ) {
    if (typingMode === 'character-by-character') {
      const line = editor.lineAt(position);
      const range = line.range;
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
      await TextTypingService.replaceCharByChar(textEditor, range, content, typingSpeed);
    } else if (typingMode === 'hacker-typer') {
      const line = editor.lineAt(position);
      const range = line.range;
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
      await TextTypingService.replaceHackerTyper(textEditor, range, content, typingSpeed);
    } else if (typingSpeed && typingMode === 'line-by-line') {
      const lineRange = getLineRange(editor, position);
      if (!lineRange) {
        Logger.error('Line range not found');
        return;
      }
      await TextTypingService.replaceInstant(fileUri, lineRange, '');
      textEditor.revealRange(lineRange, TextEditorRevealType.InCenter);
      await TextTypingService.insertLineByLine(fileUri, lineRange.start.line, content, typingSpeed);
    } else {
      // Instant mode (default)
      const line = editor.lineAt(position);
      const range = line.range;
      await TextTypingService.replaceInstant(fileUri, range, content);
    }
  }

  /**
   * Replaces the specified range or position in the text editor with the given content.
   * If a range is provided, it replaces the content within that range.
   * If a position is provided, it replaces the content within the line of that position.
   * @param textEditor The text editor in which the replacement should occur.
   * @param editor The text document associated with the text editor.
   * @param fileUri The URI of the file being edited.
   * @param content The content to replace with.
   * @param range The range within which the content should be replaced.
   * @param position The position within the line where the content should be replaced.
   * @param step The current step being executed (for accessing action-level properties).
   */
  public static async replace(
    textEditor: TextEditor,
    editor: TextDocument,
    fileUri: Uri,
    content: string,
    range: Range | undefined,
    position: Position | undefined,
    step: Step,
  ): Promise<void> {
    if (!range && !position) {
      return;
    }

    const typingMode = TextTypingService.getInsertTypingMode(step);
    const typingSpeed = getInsertionSpeed(step.insertTypingSpeed);

    if (range) {
      await TextTypingService.replaceWithRange(
        textEditor,
        editor,
        fileUri,
        content,
        range,
        typingMode,
        typingSpeed,
      );
    } else if (position) {
      await TextTypingService.replaceWithPosition(
        textEditor,
        editor,
        fileUri,
        content,
        position,
        typingMode,
        typingSpeed,
      );
    }

    if (textEditor && (range || position)) {
      let revealRange: Range;
      if (range) {
        revealRange = range;
      } else if (position) {
        revealRange = editor.lineAt(position).range;
      } else {
        Logger.error('No range or position provided for reveal');
        return;
      }
      textEditor.revealRange(revealRange, TextEditorRevealType.InCenter);
      textEditor.selection = new Selection(revealRange.start, revealRange.start);
    }

    await saveFiles();
  }

  private static async replaceWithRange(
    textEditor: TextEditor,
    editor: TextDocument,
    fileUri: Uri,
    content: string,
    range: Range,
    typingMode: InsertTypingMode,
    typingSpeed: number | undefined,
  ) {
    if (typingMode === 'character-by-character') {
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
      await TextTypingService.replaceCharByChar(textEditor, range, content, typingSpeed);
    } else if (typingMode === 'hacker-typer') {
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
      await TextTypingService.replaceHackerTyper(textEditor, range, content, typingSpeed);
    } else if (typingSpeed && typingMode === 'line-by-line') {
      const startLine = editor.lineAt(range.start);
      const endLine = editor.lineAt(range.end);
      const start = new Position(startLine.lineNumber, 0);
      const end = new Position(endLine.lineNumber, endLine.text.length);
      const fullRange = new Range(start, end);

      await TextTypingService.replaceInstant(fileUri, fullRange, '');
      textEditor.revealRange(fullRange, TextEditorRevealType.InCenter);
      await TextTypingService.insertLineByLine(fileUri, startLine.lineNumber, content, typingSpeed);
    } else {
      // Instant mode (default)
      await TextTypingService.replaceInstant(fileUri, range, content);
    }
  }

  private static async replaceWithPosition(
    textEditor: TextEditor,
    editor: TextDocument,
    fileUri: Uri,
    content: string,
    position: Position,
    typingMode: InsertTypingMode,
    typingSpeed: number | undefined,
  ) {
    if (typingMode === 'character-by-character') {
      const line = editor.lineAt(position);
      const range = line.range;
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
      await TextTypingService.replaceCharByChar(textEditor, range, content, typingSpeed);
    } else if (typingMode === 'hacker-typer') {
      const line = editor.lineAt(position);
      const range = line.range;
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
      await TextTypingService.replaceHackerTyper(textEditor, range, content, typingSpeed);
    } else if (typingSpeed && typingMode === 'line-by-line') {
      const range = getLineRange(editor, position);
      if (!range) {
        Logger.error('Line range not found');
        return;
      }
      await TextTypingService.replaceInstant(fileUri, range, '');
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
      await TextTypingService.insertLineByLine(fileUri, range.start.line, content, typingSpeed);
    } else {
      // Instant mode (default)
      const line = editor.lineAt(position);
      const range = line.range;
      await TextTypingService.replaceInstant(fileUri, range, content);
    }
  }

  /**
   * Deletes the specified range or line in the given editor.
   * If a range is provided, it deletes the range.
   * If a position is provided, it deletes the line at that position.
   * @param editor The text document editor.
   * @param fileUri The URI of the file being edited.
   * @param range The range to delete (optional).
   * @param position The position of the line to delete (optional).
   */
  public static async delete(
    editor: TextDocument,
    fileUri: Uri,
    range: Range | undefined,
    position: Position | undefined,
  ): Promise<void> {
    if (!range && !position) {
      return;
    }

    const edit = new WorkspaceEdit();

    if (range) {
      edit.delete(fileUri, range);
    } else if (position) {
      const line = editor.lineAt(position);
      edit.delete(fileUri, line.range);
    }

    await workspace.applyEdit(edit);

    await saveFiles();
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
    const typingSpeed = getInsertionSpeed(step.insertTypingSpeed);

    if (typingMode === 'character-by-character') {
      await TextTypingService.applyDiffByChar(filePath, content, patched, typingSpeed, token);
    } else if (typingMode === 'hacker-typer') {
      await TextTypingService.applyDiffByHackerTyper(filePath, content, patched, typingSpeed, token);
    } else if (typingMode === 'line-by-line') {
      await TextTypingService.applyDiffByLine(filePath, patched, typingSpeed, token);
    } else {
      // Instant mode (default)
      await writeFile(filePath, patched);
    }
  }

  /**
   * Removes text character by character
   */
  private static async removeText(
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
  private static async insertCharByChar(
    editor: TextEditor,
    content: string,
    position: Position,
    typingSpeed?: number,
    token?: CancellationToken,
  ): Promise<void> {
    const delayMs = getInsertionSpeed(typingSpeed);
    editor.revealRange(new Range(position, position), TextEditorRevealType.InCenter);
    editor.selection = new Selection(position, position);
    await TextTypingService.typeText(editor, content, position, delayMs, token);
  }

  /**
   * Inserts content line by line with a typing effect.
   */
  private static async insertLineByLine(
    fileUri: Uri,
    startLine: number,
    content: string,
    delayMs: number,
  ): Promise<void> {
    const lines = content.split('\n');
    const totalLines = lines.length;
    const lastLine = lines[totalLines - 1];

    let crntPosition = new Position(startLine, 0);
    let i = 0;
    for (const line of lines) {
      let lineContent = line;

      if (totalLines > 1) {
        if (i === totalLines - 1 && lastLine.trim() === '') {
          lineContent = ``;
        } else if (i < totalLines - 1) {
          lineContent = `${lineContent}\n`;
        } else {
          lineContent = `${lineContent}`;
        }
      }

      await TextTypingService.insertInstant(fileUri, crntPosition, lineContent);

      crntPosition = new Position(crntPosition.line + 1, 0);
      await sleep(delayMs);
      ++i;
    }
  }

  /**
   * Instantly inserts the specified content at the given position in the provided file.
   *
   * @param fileUri - The URI of the file where the content will be inserted.
   * @param position - The position within the file to insert the content.
   * @param content - The string content to insert.
   * @returns A promise that resolves when the edit has been applied.
   */
  private static async insertInstant(
    fileUri: Uri,
    position: Position,
    content: string,
  ): Promise<void> {
    const edit = new WorkspaceEdit();
    edit.insert(fileUri, position, content);
    await workspace.applyEdit(edit);
  }

  /**
   * Instantly replaces the text within the specified range of a file with the provided content.
   *
   * @param fileUri - The URI of the file to edit.
   * @param range - The range within the file to replace.
   * @param content - The new content to insert in the specified range.
   * @returns A promise that resolves when the edit has been applied.
   */
  private static async replaceInstant(fileUri: Uri, range: Range, content: string): Promise<void> {
    const edit = new WorkspaceEdit();
    edit.replace(fileUri, range, content);
    await workspace.applyEdit(edit);
  }

  /**
   * Inserts text character by character
   */
  private static async typeText(
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
      const { char, nextIndex } = TextTypingService.getNextChar(text, i);
      i = nextIndex;
      const edit = new WorkspaceEdit();
      edit.insert(editor.document.uri, currentPos, char);
      await workspace.applyEdit(edit);
      currentPos = TextTypingService.getNextPosition(currentPos, char, editor, startPosition);
      editor.selection = new Selection(currentPos, currentPos);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  /**
   * Helper to get the next character (handles CRLF as one char)
   */
  private static getNextChar(text: string, index: number): { char: string; nextIndex: number } {
    if (text[index] === '\r' && index + 1 < text.length && text[index + 1] === '\n') {
      return { char: '\r\n', nextIndex: index + 2 };
    }
    return { char: text[index], nextIndex: index + 1 };
  }

  /**
   * Helper to get the next cursor position after inserting a char
   */
  private static getNextPosition(
    currentPos: Position,
    char: string,
    editor: TextEditor,
    startPosition: Position | number,
  ): Position {
    if (typeof startPosition === 'number') {
      // If using offset, update offset and recalculate position
      const offset = editor.document.offsetAt(currentPos) + char.length;
      return editor.document.positionAt(offset);
    } else if (char === '\r\n' || char === '\n') {
      return new Position(currentPos.line + 1, 0);
    } else {
      return new Position(currentPos.line, currentPos.character + char.length);
    }
  }

  /**
   * Replaces content with character-by-character typing effect
   */
  public static async replaceCharByChar(
    editor: TextEditor,
    range: Range,
    content: string,
    typingSpeed?: number,
    token?: CancellationToken,
  ): Promise<void> {
    const deleteEdit = new WorkspaceEdit();
    deleteEdit.delete(editor.document.uri, range);
    await workspace.applyEdit(deleteEdit);
    await TextTypingService.insertCharByChar(editor, content, range.start, typingSpeed, token);
  }

  /**
   * Applies patch changes with a typewriter effect to simulate live coding
   */
  private static async applyDiffByChar(
    filePath: Uri,
    currentContent: string,
    targetContent: string,
    typingSpeed?: number,
    token?: CancellationToken,
  ): Promise<void> {
    const editor = TextTypingService.findEditorForFile(filePath);
    if (editor) {
      const delayMs = getInsertionSpeed(typingSpeed);
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
   * Inserts content with hacker-typer effect - chunks of content per keystroke
   */
  private static async insertHackerTyper(
    editor: TextEditor,
    content: string,
    position: Position,
    typingSpeed?: number,
    token?: CancellationToken,
  ): Promise<void> {
    const delayMs = getInsertionSpeed(typingSpeed);
    const chunkSize = TextTypingService.getHackerTyperChunkSize();
    editor.revealRange(new Range(position, position), TextEditorRevealType.InCenter);
    editor.selection = new Selection(position, position);
    
    let currentPos = position;
    let i = 0;
    
    while (i < content.length) {
      if (token?.isCancellationRequested) {
        return;
      }
      
      const chunk = content.slice(i, i + chunkSize);
      const edit = new WorkspaceEdit();
      edit.insert(editor.document.uri, currentPos, chunk);
      await workspace.applyEdit(edit);
      
      // Update position accounting for newlines in the chunk
      const lines = chunk.split('\n');
      if (lines.length > 1) {
        // Multi-line chunk
        const lastLineLength = lines[lines.length - 1].length;
        currentPos = new Position(currentPos.line + lines.length - 1, lastLineLength);
      } else {
        // Single-line chunk
        currentPos = new Position(currentPos.line, currentPos.character + chunk.length);
      }
      
      editor.selection = new Selection(currentPos, currentPos);
      i += chunkSize;
      
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  /**
   * Replaces content with hacker-typer effect
   */
  private static async replaceHackerTyper(
    editor: TextEditor,
    range: Range,
    content: string,
    typingSpeed?: number,
    token?: CancellationToken,
  ): Promise<void> {
    const deleteEdit = new WorkspaceEdit();
    deleteEdit.delete(editor.document.uri, range);
    await workspace.applyEdit(deleteEdit);
    await TextTypingService.insertHackerTyper(editor, content, range.start, typingSpeed, token);
  }

  /**
   * Applies diff with hacker-typer effect
   */
  private static async applyDiffByHackerTyper(
    filePath: Uri,
    currentContent: string,
    targetContent: string,
    typingSpeed?: number,
    token?: CancellationToken,
  ): Promise<void> {
    const editor = TextTypingService.findEditorForFile(filePath);
    if (editor) {
      try {
        const differences = diffChars(currentContent, targetContent);
        let currentPosition = 0;
        const chunkSize = TextTypingService.getHackerTyperChunkSize();
        const delayMs = getInsertionSpeed(typingSpeed);

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
            // Insert in chunks for hacker-typer effect
            let i = 0;
            while (i < diff.value.length) {
              if (token?.isCancellationRequested) {
                return;
              }
              const chunk = diff.value.slice(i, i + chunkSize);
              await TextTypingService.typeText(editor, chunk, currentPosition, delayMs, token);
              currentPosition += chunk.length;
              i += chunkSize;
            }
          }
        }
      } catch (error) {
        Notifications.error('Error applying patch with hacker-typer effect', (error as Error).message);
      }
    } else {
      await writeFile(filePath, targetContent);
    }
  }

  /**
   * Gets the hacker-typer chunk size from configuration
   */
  private static getHackerTyperChunkSize(): number {
    return Extension.getInstance().getSetting<number>(Config.insert.hackerTyperChunkSize) ?? 3;
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

  /**
   * Gets the insert typing mode for a step or global config.
   */
  public static getInsertTypingMode(step?: Step): InsertTypingMode {
    return (
      step?.insertTypingMode ??
      Extension.getInstance().getSetting<InsertTypingMode>(Config.insert.typingMode) ??
      'instant'
    );
  }
}
