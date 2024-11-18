import { Position, Uri } from "vscode";
import { sleep } from "./sleep";
import { insertContent } from ".";

export const insertLineByLine = async (fileUri: Uri, stateLineNr: number, content: string, speed: number) => {
  const lines = content.split("\n");
  const totalLines = lines.length;
  const lastLine = lines[totalLines - 1];

  let crntPosition = new Position(stateLineNr, 0);
  let i = 0;
  for await (const line of lines) {
    let lineContent = line;

    if (totalLines > 1) {
      if (i === totalLines - 1 && lastLine.trim() === "") {
        lineContent = ``;
      } else if (i < totalLines - 1) {
        lineContent = `${lineContent}\n`;
      } else {
        lineContent = `${lineContent}`;
      }
    }

    await insertContent(fileUri, crntPosition, lineContent);

    crntPosition = new Position(crntPosition.line + 1, 0);
    await sleep(speed);
    ++i;
  }
};
