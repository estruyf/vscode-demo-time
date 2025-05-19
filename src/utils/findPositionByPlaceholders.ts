import { Position, Uri, Range } from "vscode";
import { Extension } from "../services/Extension";
import { fileExists } from "./fileExists";
import { findPosition, readFile } from ".";
import { Notifications } from "../services/Notifications";

export const findPositionByPlaceholders = async (
  startPlaceholder: string,
  filePath: string,
  endPlaceholder?: string
) => {
  if (!filePath || !startPlaceholder) {
    return;
  }

  const workspaceFolder = Extension.getInstance().workspaceFolder;
  if (!workspaceFolder) {
    return;
  }

  const fileUri = Uri.joinPath(workspaceFolder.uri, filePath);
  if (!(await fileExists(fileUri))) {
    return;
  }

  const fileTxt = await readFile(fileUri);

  // Find the position of the start placeholder in the file content
  const startIdx = fileTxt.indexOf(startPlaceholder);
  if (startIdx < 0) {
    return;
  }

  const startPosition = findPosition(fileTxt, startPlaceholder);
  let endPosition: Position | undefined;
  if (!startPosition) {
    return;
  }

  if (endPlaceholder) {
    endPosition = findPosition(fileTxt.substring(startIdx), endPlaceholder, true);
    if (!endPosition) {
      Notifications.error(`End placeholder "${endPlaceholder}" not found in file "${filePath}"`);
      return;
    }
    endPosition = new Position(
      endPosition.line + startPosition.line,
      endPosition.character
    );
  }

  return {
    position: new Position(startPosition.line, startPosition.character),
    range: endPosition
      ? new Range(
          new Position(startPosition.line, startPosition.character),
          new Position(endPosition.line, endPosition.character)
        )
      : undefined,
  };
};
