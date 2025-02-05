import {
  commands,
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
  private static isZoomed = false;
  private static isHighlighted = false;

  public static register() {
    const borderColor =
      Extension.getInstance().getSetting<string>(Config.highlight.borderColor) || "rgba(255, 0, 0, 0.5)";
    const background =
      Extension.getInstance().getSetting<string>(Config.highlight.background) ||
      "var(--vscode-editor-selectionBackground)";

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

    DecoratorService.lineDecorator = window.createTextEditorDecorationType({
      ...genericStyles,
      borderWidth: "2px;",
    });

    DecoratorService.startBlockDecorator = window.createTextEditorDecorationType({
      ...genericStyles,
      textDecoration: "none;",
      borderWidth: "2px 2px 0 2px",
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
      borderWidth: "0 2px 2px 2px",
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

  public static isDecorated(): boolean {
    return DecoratorService.isHighlighted;
  }

  public static setDecorated(isDecorated: boolean) {
    DecoratorService.isHighlighted = isDecorated;
  }

  public static hightlightLines(textEditor: TextEditor, range: Range, zoomLevel?: number) {
    const zoomEnabled = Extension.getInstance().getSetting<boolean | number>(Config.highlight.zoom);

    // Remove the previous highlight
    DecoratorService.unselect(textEditor);

    if (typeof zoomLevel !== "undefined" || zoomEnabled) {
      DecoratorService.isZoomed = true;
      let level = zoomEnabled;
      if (typeof zoomLevel === "number") {
        level = zoomLevel;
      }

      if (typeof level === "number") {
        for (let i = 0; i < level; i++) {
          commands.executeCommand("editor.action.fontZoomIn");
        }
      } else {
        commands.executeCommand("editor.action.fontZoomIn");
      }
    }

    // Get before and after lines
    const beforeLine = range.start.line;
    const afterLine = range.end.line + 1;

    // Set the blur on the before and after lines
    let blurRanges = [];
    if (beforeLine >= 0) {
      const beforeRange = new Range(0, 0, beforeLine, 0);
      blurRanges.push(beforeRange);
    }

    if (afterLine < textEditor.document.lineCount) {
      const afterRange = new Range(afterLine, 0, textEditor.document.lineCount, 0);
      blurRanges.push(afterRange);
    }

    textEditor.setDecorations(DecoratorService.blurDecorator, blurRanges);

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

    DecoratorService.isHighlighted = true;
  }

  public static unselect(textEditor: TextEditor) {
    DecoratorService.isHighlighted = false;
    textEditor.setDecorations(DecoratorService.blurDecorator, []);
    textEditor.setDecorations(DecoratorService.lineDecorator, []);
    textEditor.setDecorations(DecoratorService.startBlockDecorator, []);
    textEditor.setDecorations(DecoratorService.betweenBlockDecorator, []);
    textEditor.setDecorations(DecoratorService.endBlockDecorator, []);

    if (DecoratorService.isZoomed) {
      DecoratorService.isZoomed = false;
      commands.executeCommand("editor.action.fontZoomReset");
    }
  }
}
