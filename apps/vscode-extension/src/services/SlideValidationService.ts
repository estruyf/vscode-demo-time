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
  Uri,
  workspace,
  WorkspaceEdit,
} from 'vscode';
import { Action, Config, getDemosFromConfig } from '@demotime/common';
import { General } from '../constants';
import {
  getSlideActionTags,
  getSlideProblems,
  isPathInWorkspace,
  parseWinPath,
  readFile,
  SlideProblem,
  SlideProblemFix,
  SlideProblemSeverity,
} from '../utils';
import { DemoFileProvider } from './DemoFileProvider';
import { Extension } from './Extension';

const DIAGNOSTIC_SOURCE = 'demo-time';
const VALIDATION_DELAY = 300;

const SEVERITIES: Record<SlideProblemSeverity, DiagnosticSeverity> = {
  error: DiagnosticSeverity.Error,
  warning: DiagnosticSeverity.Warning,
  information: DiagnosticSeverity.Information,
};

interface ActInfo {
  sceneIds: Set<string>;
  /**
   * The workspace-relative paths of the slide files that `openSlide` moves open
   */
  slidePaths: Set<string>;
}

/**
 * Reports problems in slide (markdown) files: a `dt-action` component that refers to a scene id
 * that doesn't exist in any act file, and problems in the front matter of the slide files under
 * `.demo/` or opened by an `openSlide` move.
 */
export class SlideValidationService {
  private static diagnosticCollection: DiagnosticCollection;
  private static registered = false;
  private static actInfo: Promise<ActInfo> | undefined;
  private static timers = new Map<string, NodeJS.Timeout>();
  private static revalidateTimer: NodeJS.Timeout | undefined;
  private static fixes = new Map<string, { diagnostic: Diagnostic; fix: SlideProblemFix }[]>();

  public static register(ctx: ExtensionContext): void {
    if (SlideValidationService.registered) {
      return;
    }

    SlideValidationService.diagnosticCollection =
      languages.createDiagnosticCollection('demo-time-slides');

    // Referenced files (images, layouts, act files) can be added or removed outside VS Code
    const watcher = workspace.createFileSystemWatcher('**/*', false, true, false);

    ctx.subscriptions.push(
      SlideValidationService.diagnosticCollection,
      watcher,
      watcher.onDidCreate(SlideValidationService.onFileChanged),
      watcher.onDidDelete(SlideValidationService.onFileChanged),
      languages.registerCodeActionsProvider(
        { language: 'markdown' },
        new SlideProblemCodeActionProvider(),
        { providedCodeActionKinds: SlideProblemCodeActionProvider.providedCodeActionKinds },
      ),
      workspace.onDidOpenTextDocument(SlideValidationService.validateDocument),
      workspace.onDidChangeTextDocument((e) =>
        SlideValidationService.scheduleValidation(e.document),
      ),
      workspace.onDidSaveTextDocument(SlideValidationService.onFileChanged),
      workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration(`${Config.root}.${Config.slides.slideHeaderTemplate}`) ||
          e.affectsConfiguration(`${Config.root}.${Config.slides.slideFooterTemplate}`)
        ) {
          SlideValidationService.scheduleRevalidation();
        }
      }),
      workspace.onDidCloseTextDocument((document) => {
        SlideValidationService.diagnosticCollection.delete(document.uri);
        SlideValidationService.fixes.delete(document.uri.toString());
      }),
    );

    workspace.textDocuments.forEach(SlideValidationService.validateDocument);

    SlideValidationService.registered = true;
  }

  /**
   * Gets the quick fixes of the front matter problems in a document.
   */
  public static getFixes(uri: Uri) {
    return SlideValidationService.fixes.get(uri.toString()) || [];
  }

  private static isActFile(uri: Uri): boolean {
    const filePath = parseWinPath(uri.fsPath);
    return (
      filePath.includes(`/${General.demoFolder}/`) &&
      /\.(json|ya?ml)$/i.test(filePath) &&
      !filePath.endsWith(General.variablesFile)
    );
  }

  /**
   * A file got added, removed or saved. It can be an act file, or a file that a slide refers to,
   * like an image or a custom layout.
   */
  private static onFileChanged(fileOrDocument: Uri | TextDocument) {
    const uri = fileOrDocument instanceof Uri ? fileOrDocument : fileOrDocument.uri;
    const filePath = parseWinPath(uri.fsPath);
    if (uri.scheme !== 'file' || /\/(\.git|node_modules)\//.test(filePath)) {
      return;
    }

    // Saving a slide file validates it through its change events
    if (!(fileOrDocument instanceof Uri) && fileOrDocument.languageId === 'markdown') {
      return;
    }

    if (SlideValidationService.isActFile(uri)) {
      SlideValidationService.actInfo = undefined;
    }
    SlideValidationService.scheduleRevalidation();
  }

  /**
   * Validates the open slide files again.
   */
  private static scheduleRevalidation() {
    clearTimeout(SlideValidationService.revalidateTimer);
    SlideValidationService.revalidateTimer = setTimeout(() => {
      SlideValidationService.revalidateTimer = undefined;
      workspace.textDocuments.forEach(SlideValidationService.validateDocument);
    }, VALIDATION_DELAY);
  }

  private static getActInfo(): Promise<ActInfo> {
    if (!SlideValidationService.actInfo) {
      SlideValidationService.actInfo = DemoFileProvider.getFiles()
        .then((files) => {
          const info: ActInfo = { sceneIds: new Set<string>(), slidePaths: new Set<string>() };
          Object.values(files || {}).forEach((config) => {
            getDemosFromConfig(config).forEach((demo) => {
              if (demo.id) {
                info.sceneIds.add(demo.id);
              }
              demo.steps.forEach((step) => {
                if (step.action === Action.OpenSlide && step.path) {
                  info.slidePaths.add(SlideValidationService.normalizePath(step.path));
                }
              });
            });
          });
          return info;
        })
        .catch(() => ({ sceneIds: new Set<string>(), slidePaths: new Set<string>() }));
    }

    return SlideValidationService.actInfo;
  }

  private static normalizePath(filePath: string) {
    return parseWinPath(filePath).replace(/^\.?\//, '');
  }

  /**
   * A slide file is a markdown file in the `.demo` folder, or one that an `openSlide` move opens.
   */
  private static isSlideFile(document: TextDocument, actInfo: ActInfo): boolean {
    // Skip other versions of the file, like the one of a git diff
    if (document.uri.scheme !== 'file') {
      return false;
    }

    const filePath = parseWinPath(document.uri.fsPath);
    if (filePath.includes(`/${General.demoFolder}/`)) {
      return true;
    }

    const wsFolder = Extension.getInstance().workspaceFolder;
    if (!wsFolder || !isPathInWorkspace(document.uri, wsFolder)) {
      return false;
    }

    const relPath = SlideValidationService.normalizePath(
      filePath.slice(parseWinPath(wsFolder.uri.fsPath).length),
    );
    return actInfo.slidePaths.has(relPath);
  }

  private static scheduleValidation(document: TextDocument) {
    if (document.languageId !== 'markdown') {
      return;
    }

    const key = document.uri.toString();
    clearTimeout(SlideValidationService.timers.get(key));
    SlideValidationService.timers.set(
      key,
      setTimeout(() => {
        SlideValidationService.timers.delete(key);
        SlideValidationService.validateDocument(document);
      }, VALIDATION_DELAY),
    );
  }

  private static async validateDocument(document: TextDocument): Promise<void> {
    if (document.languageId !== 'markdown' || document.isClosed) {
      return;
    }

    const content = document.getText();
    const actInfo = await SlideValidationService.getActInfo();
    const isSlideFile = SlideValidationService.isSlideFile(document, actInfo);
    const tags = content.includes('<dt-action') ? getSlideActionTags(content) : [];

    const diagnostics: Diagnostic[] = [];
    for (const tag of tags) {
      const range = new Range(tag.line, tag.start, tag.line, tag.end);

      let diagnostic: Diagnostic | undefined;
      if (!tag.id) {
        diagnostic = new Diagnostic(
          range,
          'The dt-action component needs an "id" attribute with the id of the scene to run.',
          DiagnosticSeverity.Warning,
        );
        diagnostic.code = 'dt-action-missing-id';
      } else if (!actInfo.sceneIds.has(tag.id)) {
        diagnostic = new Diagnostic(
          range,
          `No scene found with the id "${tag.id}". Add this id to a scene in one of your act files.`,
          DiagnosticSeverity.Warning,
        );
        diagnostic.code = 'dt-action-unknown-id';
      }

      if (diagnostic) {
        diagnostic.source = DIAGNOSTIC_SOURCE;
        diagnostics.push(diagnostic);
      }
    }

    const problems = isSlideFile ? await SlideValidationService.getProblems(content) : [];

    // The document could have changed or closed while the files were loading
    if (document.isClosed || document.getText() !== content) {
      return;
    }

    const fixes: { diagnostic: Diagnostic; fix: SlideProblemFix }[] = [];
    for (const problem of problems) {
      const diagnostic = SlideValidationService.toDiagnostic(problem);
      diagnostics.push(diagnostic);
      if (problem.fix) {
        fixes.push({ diagnostic, fix: problem.fix });
      }
    }

    SlideValidationService.fixes.set(document.uri.toString(), fixes);
    if (diagnostics.length === 0) {
      SlideValidationService.diagnosticCollection.delete(document.uri);
    } else {
      SlideValidationService.diagnosticCollection.set(document.uri, diagnostics);
    }
  }

  private static async getProblems(content: string): Promise<SlideProblem[]> {
    const wsFolder = Extension.getInstance().workspaceFolder;
    if (!wsFolder) {
      return [];
    }

    // Paths are relative to the workspace folder, like the slide preview resolves them
    const toUri = (filePath: string) => Uri.joinPath(wsFolder.uri, filePath);
    const read = async (filePath: string) => {
      const uri = toUri(filePath);
      return isPathInWorkspace(uri, wsFolder) ? readFile(uri) : undefined;
    };

    const extension = Extension.getInstance();
    const templates: string[] = [];
    for (const key of [Config.slides.slideHeaderTemplate, Config.slides.slideFooterTemplate]) {
      const templatePath = extension.getSetting<string>(key);
      const template = templatePath ? await read(templatePath).catch(() => undefined) : undefined;
      if (template) {
        templates.push(template);
      }
    }

    try {
      return await getSlideProblems(content, {
        fileExists: async (filePath) => {
          try {
            await workspace.fs.stat(toUri(filePath));
            return true;
          } catch {
            return false;
          }
        },
        readFile: read,
        templates,
      });
    } catch {
      return [];
    }
  }

  private static toDiagnostic(problem: SlideProblem): Diagnostic {
    const { line, start, end } = problem.range;
    const diagnostic = new Diagnostic(
      new Range(line, start, line, end),
      problem.message,
      SEVERITIES[problem.severity],
    );
    diagnostic.source = DIAGNOSTIC_SOURCE;
    diagnostic.code = problem.code;
    return diagnostic;
  }
}

/**
 * Offers the quick fixes of the front matter problems, like changing a misspelled property.
 */
class SlideProblemCodeActionProvider implements CodeActionProvider {
  public static readonly providedCodeActionKinds = [CodeActionKind.QuickFix];

  public provideCodeActions(
    document: TextDocument,
    _range: Range,
    context: { diagnostics: readonly Diagnostic[] },
  ): CodeAction[] {
    const fixes = SlideValidationService.getFixes(document.uri);
    const actions: CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      const match = fixes.find(
        (item) =>
          item.diagnostic.code === diagnostic.code &&
          item.diagnostic.message === diagnostic.message &&
          item.diagnostic.range.isEqual(diagnostic.range),
      );
      if (!match) {
        continue;
      }

      const { title, range, text } = match.fix;
      const action = new CodeAction(title, CodeActionKind.QuickFix);
      action.diagnostics = [diagnostic];
      action.isPreferred = true;
      action.edit = new WorkspaceEdit();
      action.edit.replace(
        document.uri,
        new Range(range.line, range.start, range.line, range.end),
        text,
      );
      actions.push(action);
    }

    return actions;
  }
}
