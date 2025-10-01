import {
  commands,
  DecorationRenderOptions,
  Range,
  TextEditor,
  TextEditorDecorationType,
  TextEditorSelectionChangeKind,
  window,
} from 'vscode';
import { Extension } from './Extension';
import { Config } from '@demotime/common';

export class DecoratorService {
  private static lineDecorator: TextEditorDecorationType;
  private static startBlockDecorator: TextEditorDecorationType;
  private static betweenBlockDecorator: TextEditorDecorationType;
  private static endBlockDecorator: TextEditorDecorationType;
  private static blurDecorator: TextEditorDecorationType;
  private static isZoomed = false;
  private static isHighlighted = false;

  public static register() {
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

    const opacityAndBlur = `${opacity}; filter: blur(${blur}px);`;
    DecoratorService.blurDecorator = window.createTextEditorDecorationType({
      opacity: opacityAndBlur,
    });

    // Initialize decorators
    DecoratorService.setLineDecorator();
    DecoratorService.setBeforeDecorators();
    DecoratorService.setBetweenDecorators();
    DecoratorService.setAfterDecorators();

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

  public static hightlightLines(
    textEditor: TextEditor,
    range: Range,
    zoomLevel?: number,
    isWholeLine?: boolean,
  ) {
    const zoomEnabled = Extension.getInstance().getSetting<boolean | number>(Config.highlight.zoom);

    // Remove the previous highlight
    DecoratorService.unselect(textEditor);

    // Reset the decorators
    DecoratorService.setLineDecorator();
    DecoratorService.setBeforeDecorators();
    DecoratorService.setBetweenDecorators();
    DecoratorService.setAfterDecorators();

    if (typeof zoomLevel !== 'undefined' || zoomEnabled) {
      DecoratorService.isZoomed = true;
      let level = zoomEnabled;
      if (typeof zoomLevel === 'number') {
        level = zoomLevel;
      }

      if (typeof level === 'number') {
        for (let i = 0; i < level; i++) {
          commands.executeCommand('editor.action.fontZoomIn');
        }
      } else {
        commands.executeCommand('editor.action.fontZoomIn');
      }
    }

    // Get before and after lines
    const beforeLine = range.start.line;
    const afterLine = range.end.line;

    const beforeChar = range.start.character === 0 ? 0 : range.start.character;
    const afterChar = range.end.character === 0 ? 0 : range.end.character;
    const line = textEditor.document.lineAt(afterLine);

    // Set the blur on the before lines
    let blurRanges = [];
    if (beforeLine >= 0 || beforeChar > 0) {
      let endCharacter = isWholeLine ? 0 : beforeChar;
      if (beforeChar === 0) {
        endCharacter = 0;
      }

      const beforeRange = new Range(0, 0, beforeLine, endCharacter);
      blurRanges.push(beforeRange);
    }

    // Set the blur on the after lines
    if (afterLine < textEditor.document.lineCount) {
      let afterRange = new Range(afterLine + 1, 0, textEditor.document.lineCount, 0);
      // Check if the last character is not the end of the line
      // If it is the end, the next line can be blurred
      // We add 1 to the range to include the end of the line
      if (afterChar !== line.range.end.character + 1) {
        // It is not the end of the line, check if the whole line needs to be blurred
        if (!isWholeLine) {
          afterRange = new Range(afterLine, afterChar || 0, textEditor.document.lineCount, 0);
        }
      }
      blurRanges.push(afterRange);
    }

    // Set the blur decorator
    textEditor.setDecorations(DecoratorService.blurDecorator, blurRanges);

    if (range.start.line === range.end.line) {
      DecoratorService.setLineDecorator(isWholeLine);
      textEditor.setDecorations(DecoratorService.lineDecorator, [range]);
    } else {
      let enableWholeLine = true;
      let startRange = new Range(range.start.line, 0, range.start.line, 0);
      if (!isWholeLine) {
        enableWholeLine = !(beforeChar > 0);
        DecoratorService.setBeforeDecorators(enableWholeLine);
        DecoratorService.setBetweenDecorators(enableWholeLine);
      }

      if (beforeChar > 0) {
        // Get line length of the start line
        const line = textEditor.document.lineAt(range.start.line);
        const lineLength = line.text.length;

        startRange = new Range(range.start.line, beforeChar, range.start.line, lineLength);
      }

      textEditor.setDecorations(DecoratorService.startBlockDecorator, [startRange]);

      const nextLine = range.start.line + 1;
      if (nextLine < range.end.line) {
        const betweenRange = new Range(nextLine, 0, range.end.line - 1, 0);
        textEditor.setDecorations(DecoratorService.betweenBlockDecorator, [betweenRange]);
      }

      let endRange = new Range(range.end.line, 0, range.end.line, 0);
      if (!isWholeLine) {
        DecoratorService.setAfterDecorators(enableWholeLine);
        endRange = new Range(range.end.line, 0, range.end.line, afterChar);
      }

      textEditor.setDecorations(DecoratorService.endBlockDecorator, [endRange]);
    }

    DecoratorService.isHighlighted = true;
  }

  public static unselect(textEditor?: TextEditor) {
    if (!textEditor) {
      textEditor = window.activeTextEditor;

      if (!textEditor) {
        return;
      }
    }

    DecoratorService.isHighlighted = false;
    textEditor.setDecorations(DecoratorService.blurDecorator, []);
    textEditor.setDecorations(DecoratorService.lineDecorator, []);
    textEditor.setDecorations(DecoratorService.startBlockDecorator, []);
    textEditor.setDecorations(DecoratorService.betweenBlockDecorator, []);
    textEditor.setDecorations(DecoratorService.endBlockDecorator, []);

    if (DecoratorService.isZoomed) {
      DecoratorService.isZoomed = false;
      commands.executeCommand('editor.action.fontZoomReset');
    }
  }

  private static getGenericStyles(): DecorationRenderOptions {
    const borderColor =
      Extension.getInstance().getSetting<string>(Config.highlight.borderColor) ||
      'rgba(255, 0, 0, 0.5)';
    const background =
      Extension.getInstance().getSetting<string>(Config.highlight.background) ||
      'var(--vscode-editor-selectionBackground)';

    const borderStyles = {
      borderColor,
      borderStyle: 'solid;',
    };

    const genericStyles: DecorationRenderOptions = {
      isWholeLine: true,
      backgroundColor: background,
      ...borderStyles,
    };
    return genericStyles;
  }

  private static setLineDecorator(isWholeLine = true) {
    const genericStyles = DecoratorService.getGenericStyles();
    const lineStyles = {
      ...genericStyles,
      borderWidth: '2px;',
      isWholeLine,
    };

    DecoratorService.lineDecorator = window.createTextEditorDecorationType(lineStyles);
  }

  private static setBeforeDecorators(isWholeLine = true) {
    const genericStyles = DecoratorService.getGenericStyles();
    const lineStyles = {
      ...genericStyles,
      textDecoration: 'none;',
      borderWidth: '2px 2px 0 2px',
      opacity: '1; filter: blur(0);',
      isWholeLine,
    };

    if (!isWholeLine) {
      lineStyles.borderColor = 'transparent';
    }

    DecoratorService.startBlockDecorator = window.createTextEditorDecorationType(lineStyles);
  }

  private static setBetweenDecorators(isWholeLine = true) {
    const genericStyles = DecoratorService.getGenericStyles();
    const lineStyles = {
      ...genericStyles,
      borderWidth: '0 2px 0 2px',
      opacity: '1; filter: blur(0);',
    };

    if (!isWholeLine) {
      lineStyles.borderColor = 'transparent';
    }

    DecoratorService.betweenBlockDecorator = window.createTextEditorDecorationType(lineStyles);
  }

  private static setAfterDecorators(isWholeLine = true) {
    const genericStyles = DecoratorService.getGenericStyles();
    const lineStyles = {
      ...genericStyles,
      textDecoration: 'none;',
      borderWidth: '0 2px 2px 2px',
      opacity: '1; filter: blur(0);',
      isWholeLine,
    };

    if (!isWholeLine) {
      lineStyles.borderColor = 'transparent';
    }

    DecoratorService.endBlockDecorator = window.createTextEditorDecorationType(lineStyles);
  }
}
