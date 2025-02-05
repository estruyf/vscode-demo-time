/**
 * Parses a position string and returns an object containing the line and character positions.
 *
 * @param position - A string representing the position in the format "line,character" or just "line".
 * @returns An object with `line` and `character` properties. The `line` is zero-based, and the `character` is zero if not specified.
 */
export const getLineAndCharacterPosition = (position: string): { line: number; character: number } => {
  let line = 0;
  let character = 0;

  if (position.includes(",")) {
    let [lineStr, characterStr] = position.split(",");
    line = parseInt(lineStr) - 1;
    character = parseInt(characterStr);
    if (character > 0) {
      character -= 1;
    }
  } else {
    line = parseInt(position) - 1;
  }

  return { line, character };
};
