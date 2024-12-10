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
  private static blurDecorator: TextEditorDecorationType;

  public static register() {
    const borderColor =
      Extension.getInstance().getSetting<string>(Config.highlight.borderColor) || "rgba(255, 0, 0, 0.5)";
    const background = Extension.getInstance().getSetting<string>(Config.highlight.background) || "var(--vscode-editor-selectionBackground)";
    const zoomEnabled = Extension.getInstance().getSetting<boolean>(Config.highlight.zoom);

    let blur = Extension.getInstance().getSetting<number>(Config.highlight.blur) || 0;
    if (blur < 0) {
      blur = 0;
    }

    let opacity = Extension.getInstance().getSetting<number>(Config.highlight.opacity) || 1;
    if (opacity < 0) {
      opacity = 0;
    } else if (opacity > 1) {
      opacity = 1;
    }

    const borderStyles = {
      borderColor,
      borderStyle: "solid;",
    };

    const genericStyles: DecorationRenderOptions = {
      isWholeLine: true,
      backgroundColor: background,
      ...borderStyles,
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
      opacity: "1; filter: blur(0);",
    });

    DecoratorService.betweenBlockDecorator = window.createTextEditorDecorationType({
      ...genericStyles,
      borderWidth: "0 2px 0 2px",
      opacity: "1; filter: blur(0);",
    });

    DecoratorService.endBlockDecorator = window.createTextEditorDecorationType({
      ...genericStyles,
      textDecoration: "none;",
      borderWidth: zoomEnabled ? "0 2px 2px 2px; height: calc(100% + 5px) !important;" : "0 2px 2px 2px",
      after: {
        ...zoomStyles,
      },
      opacity: "1; filter: blur(0);",
    });

    const opacityAndBlur = `${opacity}; filter: blur(${blur}px);`;
    DecoratorService.blurDecorator = window.createTextEditorDecorationType({
      opacity: opacityAndBlur,
    });

    // Remove the highlight when the user clicks in the editor
    window.onDidChangeTextEditorSelection((e) => {
      if (e.kind === TextEditorSelectionChangeKind.Mouse) {
        DecoratorService.unselect(e.textEditor);
      }
    });
  }

  public static hightlightLines(textEditor: TextEditor, range: Range) {
    // Remove the previous highlight
    DecoratorService.unselect(textEditor);

    textEditor.setDecorations(DecoratorService.blurDecorator, [new Range(0, 0, textEditor.document.lineCount, 0)]);

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
    textEditor.setDecorations(DecoratorService.blurDecorator, []);
    textEditor.setDecorations(DecoratorService.lineDecorator, []);
    textEditor.setDecorations(DecoratorService.startBlockDecorator, []);
    textEditor.setDecorations(DecoratorService.betweenBlockDecorator, []);
    textEditor.setDecorations(DecoratorService.endBlockDecorator, []);
  }
}
