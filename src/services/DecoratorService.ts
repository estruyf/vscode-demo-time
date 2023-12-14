import { Range, TextEditor, TextEditorDecorationType, window } from "vscode";
import { Extension } from "./Extension";
import { Config } from "../constants";

export class DecoratorService {
  private static lineDecorator: TextEditorDecorationType;
  private static startBlockDecorator: TextEditorDecorationType;
  private static betweenBlockDecorator: TextEditorDecorationType;
  private static endBlockDecorator: TextEditorDecorationType;

  public static register() {
    const borderColor = Extension.getInstance().getSetting<string>(Config.highlight.borderColor) || "rgba(255,0,0,0.5)";

    const genericStyles = {
      isWholeLine: true,
      borderColor,
      borderStyle: "solid",
    };

    DecoratorService.lineDecorator = window.createTextEditorDecorationType({
      ...genericStyles,
      borderWidth: "2px",
    });

    DecoratorService.startBlockDecorator = window.createTextEditorDecorationType({
      ...genericStyles,
      borderWidth: "2px 2px 0 2px",
    });

    DecoratorService.betweenBlockDecorator = window.createTextEditorDecorationType({
      ...genericStyles,
      borderWidth: "0 2px 0 2px",
    });

    DecoratorService.endBlockDecorator = window.createTextEditorDecorationType({
      ...genericStyles,
      borderWidth: "0 2px 2px 2px",
    });
  }

  public static hightlightLines(textEditor: TextEditor, range: Range) {
    if (range.start.line === range.end.line) {
      textEditor.setDecorations(DecoratorService.lineDecorator, [range]);
    } else {
      const startRange = new Range(range.start.line, 0, range.start.line, 0);
      textEditor.setDecorations(DecoratorService.startBlockDecorator, [startRange]);

      const nextLine = range.start.line + 1;
      if (nextLine < range.end.line) {
        const betweenRange = new Range(nextLine, 0, range.end.line - 1, 0);
        textEditor.setDecorations(DecoratorService.betweenBlockDecorator, [betweenRange]);
      }

      const endRange = new Range(range.end.line, 0, range.end.line, 0);
      textEditor.setDecorations(DecoratorService.endBlockDecorator, [endRange]);
    }
  }

  public static unselect(textEditor: TextEditor) {
    textEditor.setDecorations(DecoratorService.lineDecorator, []);
    textEditor.setDecorations(DecoratorService.startBlockDecorator, []);
    textEditor.setDecorations(DecoratorService.betweenBlockDecorator, []);
    textEditor.setDecorations(DecoratorService.endBlockDecorator, []);
  }
}
