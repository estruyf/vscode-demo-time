import { Position, Range, Selection, TextEditor, TextEditorRevealType } from 'vscode';
import { updateConfig } from '../utils';

export class SelectionService {
  private static isSelected = false;

  public static getSelection(): boolean {
    return SelectionService.isSelected;
  }

  /**
   * Selects text in the editor based on the provided range or position.
   * Similar to highlight but actually selects the text instead of just visually highlighting it.
   * @param textEditor The text editor to perform the selection in.
   * @param range The range to select.
   * @param position The position to select (if range is not provided).
   * @param zoomLevel Optional zoom level to apply.
   */
  public static async select(
    textEditor: TextEditor,
    range: Range | undefined,
    position: Position | undefined,
    zoomLevel?: number,
  ): Promise<void> {
    if (!range && !position) {
      return;
    }

    if (!textEditor) {
      return;
    }

    if (!range && position) {
      // If only position is provided, create a range at that position
      range = new Range(position, position);
    }

    if (range) {
      // Apply zoom if specified
      if (zoomLevel !== undefined) {
        await updateConfig('window.zoomLevel', zoomLevel);
      }

      // Create selection from the range
      textEditor.selection = new Selection(range.start, range.end);
      SelectionService.isSelected = true;

      // Reveal the selection in the center of the editor
      textEditor.revealRange(range, TextEditorRevealType.InCenter);
    }
  }

  public static unselect(textEditor?: TextEditor) {
    if (!textEditor) {
      return;
    }

    // Reset the cursor position to avoid selecting text
    const cursorPosition = textEditor.selection.active;
    textEditor.selection = new Selection(cursorPosition, cursorPosition);
    SelectionService.isSelected = false;
  }
}
