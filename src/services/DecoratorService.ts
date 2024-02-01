import {
  DecorationRenderOptions,
  Range,
  TextEditor,
  TextEditorDecorationType,
  TextEditorSelectionChangeKind,
  window,
} from "vscode";
import { Extension } from "./Extension";
import { Config } from "../constants";

export class DecoratorService {
  private static lineDecorator: TextEditorDecorationType;
  private static startBlockDecorator: TextEditorDecorationType;
  private static betweenBlockDecorator: TextEditorDecorationType;
  private static endBlockDecorator: TextEditorDecorationType;

  public static register() {
    const borderColor =
      Extension.getInstance().getSetting<string>(Config.highlight.borderColor) || "rgba(255, 0, 0, 0.5)";
    const zoomEnabled = Extension.getInstance().getSetting<boolean>(Config.highlight.zoom);

    const genericStyles: DecorationRenderOptions = {
      isWholeLine: true,
      borderColor,
      borderStyle: "solid;",
      backgroundColor: "var(--vscode-editor-selectionBackground)",
    };

    const zoomStyles: DecorationRenderOptions = {};
    if (zoomEnabled) {
      genericStyles.textDecoration = "none; zoom: 1.3;";
      zoomStyles.textDecoration = "none; height: 5px; content: ' '; display: block;";
    }

    DecoratorService.lineDecorator = window.createTextEditorDecorationType({
      ...genericStyles,
      borderWidth: zoomEnabled ? "2px; height: calc(100% + 10px) !important" : "2px;",
      before: {
        ...zoomStyles,
      },
      after: {
        ...zoomStyles,
      },
    });

    DecoratorService.startBlockDecorator = window.createTextEditorDecorationType({
      ...genericStyles,
      textDecoration: "none;",
      borderWidth: "2px 2px 0 2px",
      before: {
        ...zoomStyles,
      },
    });

    DecoratorService.betweenBlockDecorator = window.createTextEditorDecorationType({
      ...genericStyles,
      borderWidth: "0 2px 0 2px",
    });

    DecoratorService.endBlockDecorator = window.createTextEditorDecorationType({
      ...genericStyles,
      textDecoration: "none;",
      borderWidth: zoomEnabled ? "0 2px 2px 2px; height: calc(100% + 5px) !important;" : "0 2px 2px 2px",
      after: {
        ...zoomStyles,
      },
    });

    // Remove the highlight when the user clicks in the editor
    window.onDidChangeTextEditorSelection((e) => {
      if (e.kind === TextEditorSelectionChangeKind.Mouse) {
        DecoratorService.unselect(e.textEditor);
      }
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
