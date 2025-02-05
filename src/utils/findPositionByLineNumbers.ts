import { Position, TextDocument, Range } from "vscode";
import { getLineAndCharacterPosition } from ".";

export const findPositionByLineNumbers = (editor: TextDocument, position: string | number) => {
  let crntPosition: Position | undefined = undefined;
  let crntRange: Range | undefined = undefined;

  if (typeof position === "string") {
    if (position.includes(":")) {
      let [start, end] = position.split(":");

      if (start === "start") {
        start = "1";
      }

      if (end === "end") {
        end = editor.lineCount.toString();
      }

      const startPosition = getLineAndCharacterPosition(start);
      const endPosition = getLineAndCharacterPosition(end);

      let lastLine = new Position(Number(endPosition.line), endPosition.character);
      try {
        const line = editor.lineAt(lastLine);
        lastLine = new Position(line.range.end.line, lastLine.character || line.range.end.character + 1);
      } catch (error) {
        // do nothing
      }

      crntRange = new Range(new Position(startPosition.line, startPosition.character), lastLine);
    } else {
      const startPosition = getLineAndCharacterPosition(position);
      crntPosition = new Position(startPosition.line, startPosition.character);
    }
  } else {
    crntPosition = new Position(position - 1, 0);
  }

  return { position: crntPosition, range: crntRange };
};
