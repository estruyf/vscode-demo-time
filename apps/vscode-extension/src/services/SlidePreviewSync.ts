import {
  Position,
  Range,
  Selection,
  TextEditor,
  TextEditorRevealType,
  TextEditorSelectionChangeKind,
  ViewColumn,
  window,
  workspace,
} from 'vscode';
import { Config } from '@demotime/common';
import { Extension } from './Extension';
import { DemoRunner } from './DemoRunner';
import { Preview } from '../preview/Preview';
import { getAbsolutePath, getSlideIndexAtLine, getSlideSourceLine, parseWinPath } from '../utils';

/**
 * Keeps the slide preview and the markdown editor in sync while writing slides:
 * - moving the cursor to another slide shows that slide in the preview;
 * - "Reveal slide source" in the preview moves the cursor to the source of the slide.
 *
 * The sync can be turned off with the `demoTime.slidePreviewSync` setting, and never applies in
 * presentation mode, so it can't change slides during a talk.
 */
export class SlidePreviewSync {
  private static timer: NodeJS.Timeout | undefined;
  // The slide under the cursor, to only follow the cursor when it moves to another slide
  private static lastCursor: { uri: string; slideIndex: number } | undefined;

  public static register() {
    const subscriptions = Extension.getInstance().subscriptions;

    subscriptions.push(
      window.onDidChangeTextEditorSelection((e) =>
        SlidePreviewSync.scheduleSync(e.textEditor, e.kind),
      ),
    );
    subscriptions.push(
      window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          SlidePreviewSync.scheduleSync(editor);
        }
      }),
    );
  }

  /**
   * Whether the preview follows the editor cursor: the setting is on and presentation mode is off.
   */
  public static isEnabled(): boolean {
    const setting = Extension.getInstance().getSetting<boolean>(Config.slides.previewSync);
    return setting !== false && !DemoRunner.getIsPresentationMode();
  }

  /**
   * Gets the slide under the cursor of a markdown editor.
   * @returns The 0-based slide index, or `undefined` when the sync is off or there are no slides
   */
  public static getCursorSlideIndex(editor: TextEditor): number | undefined {
    if (!SlidePreviewSync.isEnabled() || editor.document.languageId !== 'markdown') {
      return undefined;
    }

    const slideIndex = getSlideIndexAtLine(editor.document.getText(), editor.selection.active.line);
    if (slideIndex !== undefined) {
      SlidePreviewSync.lastCursor = { uri: editor.document.uri.toString(), slideIndex };
    }
    return slideIndex;
  }

  /**
   * Moves the cursor to the source of a slide, in the editor that shows the file, or in a new
   * editor next to the preview.
   * @param filePath The workspace-relative path of the slide file
   * @param slideIndex The 0-based slide index
   */
  public static async revealSource(filePath: string, slideIndex: number) {
    // The preview sends a webview URL, which can have encoded characters like `%20`
    try {
      filePath = decodeURIComponent(filePath);
    } catch {
      // Keep the path as is
    }

    const document = await workspace.openTextDocument(getAbsolutePath(parseWinPath(filePath)));
    const line = getSlideSourceLine(document.getText(), slideIndex) ?? 0;
    const position = new Position(line, 0);
    const uri = document.uri.toString();
    const visibleEditor = window.visibleTextEditors.find(
      (editor) => editor.document.uri.toString() === uri,
    );

    // Set before the selection changes, so the preview doesn't sync back to it
    SlidePreviewSync.lastCursor = {
      uri,
      slideIndex: getSlideIndexAtLine(document.getText(), line) ?? slideIndex,
    };

    const editor = await window.showTextDocument(document, {
      viewColumn: visibleEditor?.viewColumn ?? ViewColumn.Beside,
      preview: false,
    });
    editor.selection = new Selection(position, position);
    editor.revealRange(
      new Range(position, position),
      TextEditorRevealType.InCenterIfOutsideViewport,
    );
  }

  /**
   * Selection events fire on every keystroke, so wait until the cursor rests.
   */
  private static scheduleSync(editor: TextEditor, kind?: TextEditorSelectionChangeKind) {
    if (SlidePreviewSync.timer) {
      clearTimeout(SlidePreviewSync.timer);
    }
    SlidePreviewSync.timer = setTimeout(() => {
      SlidePreviewSync.timer = undefined;
      SlidePreviewSync.sync(editor, kind);
    }, 100);
  }

  /**
   * Shows the slide under the cursor in the preview, when the preview shows the file of the editor.
   */
  private static sync(editor: TextEditor, kind?: TextEditorSelectionChangeKind) {
    if (
      !Preview.isOpen ||
      editor.document.languageId !== 'markdown' ||
      !Preview.isShowingFile(editor.document.uri)
    ) {
      return;
    }

    const previous = SlidePreviewSync.lastCursor;
    const slideIndex = SlidePreviewSync.getCursorSlideIndex(editor);
    if (slideIndex === undefined) {
      return;
    }

    // Typing in a slide keeps the slide you navigated to in the preview. A click always syncs.
    const hasMoved =
      !previous ||
      previous.uri !== editor.document.uri.toString() ||
      previous.slideIndex !== slideIndex;
    if (!hasMoved && kind !== TextEditorSelectionChangeKind.Mouse) {
      return;
    }

    if (slideIndex !== Preview.getCurrentSlideIndex()) {
      Preview.goToSlide(slideIndex);
    }
  }
}
