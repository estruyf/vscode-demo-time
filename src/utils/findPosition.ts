import { Position } from "vscode";

export const findPosition = (fileTxt: string, placeholder: string, atTheEnd = false) => {
  if (!fileTxt || !placeholder) {
    return;
  }
  
  const idx = fileTxt.indexOf(placeholder);
  const lines = fileTxt.split("\n");
  if (idx < 0) {
    return;
  }

  let line: number | undefined = undefined;
  let character: number | undefined = undefined;
  for (let i = 0; i < lines.length; i++) {
    const crntLine = lines[i];
    if (crntLine.includes(placeholder)) {
      line = i;
      character = crntLine.indexOf(placeholder);
      break;
    }
  }

  if (line === undefined || character === undefined) {
    return;
  }

  if (atTheEnd) {
    character += placeholder.length;
  }

  return new Position(line, character);
};