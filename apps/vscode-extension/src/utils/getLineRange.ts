import { Position, Range, TextDocument } from "vscode";

export const getLineRange = (doc: TextDocument, position: Position): Range | undefined => {
  const text = doc.getText();
  const lines = text.split("\n");

  let range: Range | undefined;
  try {
    range = doc.lineAt(position).range;
  } catch (error) {
    if (position.line >= lines.length) {
      range = new Range(new Position(lines.length, 0), new Position(lines.length, 0));
    }
  }

  return range;
};
