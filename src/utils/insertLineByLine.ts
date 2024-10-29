import { Position, TextLine, Uri } from "vscode";
import { sleep } from "./sleep";
import { insertContent } from ".";

export const insertLineByLine = async (fileUri: Uri, startLine: TextLine, content: string, speed: number) => {
  const lines = content.split("\n");
  const totalLines = lines.length;
  const lastLine = lines[totalLines - 1];

  let crntPosition = new Position(startLine.lineNumber, 0);
  for (let i = 0; i < totalLines; i++) {
    let lineContent = lines[i];

    if (totalLines > 1) {
      if (i === totalLines - 1 && lastLine.trim() === "") {
        lineContent = `\n`;
      } else if (i < totalLines - 1) {
        lineContent = `${lineContent}\n`;
      } else {
        lineContent = `${lineContent}`;
      }
    }

    await insertContent(fileUri, crntPosition, lineContent);

    crntPosition = new Position(crntPosition.line + 1, 0);
    await sleep(speed);
  }
};
