import {
  CodeAction,
  CodeActionKind,
  CodeActionProvider,
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  ExtensionContext,
  languages,
  Range,
  TextDocument,
  TextDocumentChangeEvent,
  workspace,
  WorkspaceEdit,
} from 'vscode';
import {
  getSlideOverflowMessage,
  hasSlideOverflow,
  isAutoFitEnabled,
  SlideOverflowResult,
  SlideParser,
} from '@demotime/common';
import {
  getAbsolutePath,
  getSlideIndexAtLine,
  getSlideSourceLine,
  parseWinPath,
  setSlideBooleanProperty,
} from '../utils';

const DIAGNOSTIC_SOURCE = 'demo-time';
const DIAGNOSTIC_CODE = 'slide-overflow';

/**
 * Shows the slides with content that overflows the slide in the Problems panel. The slide preview
 * measures the slides, as the overflow depends on the theme and fonts, and reports them for the
 * file it shows.
 */
export class SlideOverflowService {
  private static diagnosticCollection: DiagnosticCollection;
  private static registered = false;

  public static register(ctx: ExtensionContext): void {
    if (SlideOverflowService.registered) {
      return;
    }

    SlideOverflowService.diagnosticCollection = languages.createDiagnosticCollection(
      'demo-time-slide-overflow',
    );

    ctx.subscriptions.push(
      SlideOverflowService.diagnosticCollection,
      languages.registerCodeActionsProvider(
        { language: 'markdown', scheme: 'file' },
        new SlideOverflowCodeActionProvider(),
        { providedCodeActionKinds: SlideOverflowCodeActionProvider.providedCodeActionKinds },
      ),
      workspace.onDidChangeTextDocument(SlideOverflowService.onDocumentChanged),
      workspace.onDidDeleteFiles((e) =>
        e.files.forEach((uri) => SlideOverflowService.diagnosticCollection.delete(uri)),
      ),
      workspace.onDidRenameFiles((e) =>
        e.files.forEach(({ oldUri }) => SlideOverflowService.diagnosticCollection.delete(oldUri)),
      ),
    );

    SlideOverflowService.registered = true;
  }

  /**
   * Replaces the overflow diagnostics of a slide file.
   * @param filePath The workspace-relative path of the slide file, as the preview sends it
   * @param overflows The slides that overflow
   */
  public static async update(filePath: string, overflows: SlideOverflowResult[]): Promise<void> {
    if (!SlideOverflowService.diagnosticCollection) {
      return;
    }

    // The preview sends a webview URL, which can have encoded characters like `%20`
    try {
      filePath = decodeURIComponent(filePath);
    } catch {
      // Keep the path as is
    }

    let document: TextDocument;
    try {
      document = await workspace.openTextDocument(getAbsolutePath(parseWinPath(filePath)));
    } catch {
      return;
    }

    const content = document.getText();
    const slides = new SlideParser().parseSlides(content);
    const diagnostics: Diagnostic[] = [];

    for (const overflow of overflows) {
      const slide = slides[overflow.slideIndex];
      const line = getSlideSourceLine(content, overflow.slideIndex);
      if (!slide || line === undefined || !hasSlideOverflow(overflow)) {
        continue;
      }

      const autoFit = isAutoFitEnabled(slide.frontmatter);
      const message = autoFit
        ? `${getSlideOverflowMessage(overflow, true)}. Split the slide or remove content.`
        : `${getSlideOverflowMessage(overflow)}. Split the slide, or add "autoFit: true" to scale it down.`;

      const diagnostic = new Diagnostic(
        document.lineAt(line).range,
        message,
        DiagnosticSeverity.Warning,
      );
      diagnostic.source = DIAGNOSTIC_SOURCE;
      diagnostic.code = DIAGNOSTIC_CODE;
      diagnostics.push(diagnostic);
    }

    SlideOverflowService.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Added or removed lines move the slides, so the diagnostics are removed until the preview
   * measures the slides again after the file is saved.
   */
  private static onDocumentChanged(e: TextDocumentChangeEvent) {
    const diagnostics = SlideOverflowService.diagnosticCollection.get(e.document.uri);
    if (!diagnostics || diagnostics.length === 0) {
      return;
    }

    const linesChanged = e.contentChanges.some(
      (change) => !change.range.isSingleLine || /\r?\n/.test(change.text),
    );
    if (linesChanged) {
      SlideOverflowService.diagnosticCollection.delete(e.document.uri);
    }
  }
}

/**
 * Offers to add `autoFit: true` to a slide that overflows.
 */
class SlideOverflowCodeActionProvider implements CodeActionProvider {
  public static readonly providedCodeActionKinds = [CodeActionKind.QuickFix];

  public provideCodeActions(
    document: TextDocument,
    _range: Range,
    context: { diagnostics: readonly Diagnostic[] },
  ): CodeAction[] {
    const actions: CodeAction[] = [];
    const content = document.getText();

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.code !== DIAGNOSTIC_CODE) {
        continue;
      }

      const slideIndex = getSlideIndexAtLine(content, diagnostic.range.start.line);
      if (slideIndex === undefined) {
        continue;
      }

      const newContent = setSlideBooleanProperty(content, slideIndex, 'autoFit', true);
      if (newContent === undefined || newContent === content) {
        continue;
      }

      const action = new CodeAction(
        'Scale the content down to fit the slide (autoFit: true)',
        CodeActionKind.QuickFix,
      );
      action.diagnostics = [diagnostic];
      action.isPreferred = true;
      action.edit = new WorkspaceEdit();
      action.edit.replace(
        document.uri,
        new Range(document.positionAt(0), document.positionAt(content.length)),
        newContent,
      );
      actions.push(action);
    }

    return actions;
  }
}
