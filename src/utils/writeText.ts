import { Position, TextEditor, window } from "vscode";
import { getLineInsertionSpeed } from "./getLineInsertionSpeed";
import { sleep } from "./sleep";

export const writeText = async (editor: TextEditor, text: string, position: Position, speed: number = 25) => {
  // Write letter by letter
  const lineSpeed = getLineInsertionSpeed(speed) || 25;
  const contentArray = text.split("");
  let i = 0;
  for (const char of contentArray) {
    await sleep(lineSpeed);
    await editor.edit((editBuilder) => {
      const charPos = new Position(position.line, position.character + i);
      editBuilder.insert(charPos, char);
      i++;
    });
  }
};
