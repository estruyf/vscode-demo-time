import { Position, TextDocument, Range } from 'vscode';
import { findPositionByLineNumbers, findPositionByPlaceholders } from '.';
import { Step } from '@demotime/common';

/**
 * Retrieves the current position and range based on the provided step.
 *
 * @param editor The text document editor.
 * @param step The step object containing the position information.
 * @returns An object with the current position and range.
 */
export const getPositionAndRange = async (
  editor: TextDocument,
  step: Step,
): Promise<{
  crntPosition: Position | undefined;
  crntRange: Range | undefined;
  usesPlaceholders: boolean;
}> => {
  let positioning: { position: Position | undefined; range: Range | undefined } | undefined =
    undefined;
  let usesPlaceholders = false;

  if (step.position) {
    positioning = findPositionByLineNumbers(editor, step.position);
  } else if (step.startPlaceholder && step.path) {
    usesPlaceholders = true;
    positioning = await findPositionByPlaceholders(
      step.startPlaceholder,
      step.path,
      step.endPlaceholder,
    );
  }

  if (!positioning) {
    return {
      crntPosition: undefined,
      crntRange: undefined,
      usesPlaceholders,
    };
  }

  return {
    crntPosition: positioning.position,
    crntRange: positioning.range,
    usesPlaceholders,
  };
};
