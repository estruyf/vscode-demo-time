import { TextDocument } from 'vscode';

/**
 * Parses a position string and returns an object containing the line and character positions.
 *
 * @param editor - The text document editor, used to determine the line count for 'end' position.
 * @param position - A string representing the position in the format "line,character" or just "line".
 * @returns An object with `line` and `character` properties. The `line` is zero-based, and the `character` is zero if not specified.
 */
export const getLineAndCharacterPosition = (
  editor: TextDocument,
  position: string,
): { line: number; character: number } => {
  if (position === 'start') {
    return { line: 0, character: 0 };
  }
  if (position === 'end') {
    // Return the last line and last character in the document
    const lastLine = editor.lineCount - 1;
    const lastLineText = editor.lineAt(lastLine).text;
    return { line: lastLine, character: lastLineText.length };
  }

  let line = 0;
  let character = 0;

  if (position.includes(',')) {
    let [lineStr, characterStr] = position.split(',');
    line = parseInt(lineStr) - 1;
    character = parseInt(characterStr);
  } else {
    line = parseInt(position) - 1;
  }

  return { line, character };
};
