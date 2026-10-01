import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  ExtensionContext,
  languages,
  Range,
  TextDocument,
  Uri,
  workspace,
} from 'vscode';
import { getDemosFromConfig } from '@demotime/common';
import { General } from '../constants';
import { getSlideActionTags, parseWinPath } from '../utils';
import { DemoFileProvider } from './DemoFileProvider';

const DIAGNOSTIC_SOURCE = 'demo-time';
const VALIDATION_DELAY = 300;

/**
 * Reports problems in slide (markdown) files, like a `dt-action` component that refers to a scene
 * id that doesn't exist in any act file.
 */
export class SlideValidationService {
  private static diagnosticCollection: DiagnosticCollection;
  private static registered = false;
  private static sceneIds: Promise<Set<string>> | undefined;
  private static timers = new Map<string, NodeJS.Timeout>();

  public static register(ctx: ExtensionContext): void {
    if (SlideValidationService.registered) {
      return;
    }

    SlideValidationService.diagnosticCollection =
      languages.createDiagnosticCollection('demo-time-slides');

    ctx.subscriptions.push(
      SlideValidationService.diagnosticCollection,
      workspace.onDidOpenTextDocument(SlideValidationService.validateDocument),
      workspace.onDidChangeTextDocument((e) =>
        SlideValidationService.scheduleValidation(e.document),
      ),
      workspace.onDidSaveTextDocument((document) => {
        if (SlideValidationService.isActFile(document.uri)) {
          SlideValidationService.refreshSceneIds();
        }
      }),
      workspace.onDidCreateFiles((e) => SlideValidationService.onActFilesChanged(e.files)),
      workspace.onDidDeleteFiles((e) => SlideValidationService.onActFilesChanged(e.files)),
      workspace.onDidRenameFiles((e) =>
        SlideValidationService.onActFilesChanged(e.files.flatMap((f) => [f.oldUri, f.newUri])),
      ),
      workspace.onDidCloseTextDocument((document) => {
        SlideValidationService.diagnosticCollection.delete(document.uri);
      }),
    );

    workspace.textDocuments.forEach(SlideValidationService.validateDocument);

    SlideValidationService.registered = true;
  }

  private static isActFile(uri: Uri): boolean {
    const filePath = parseWinPath(uri.fsPath);
    return (
      filePath.includes(`/${General.demoFolder}/`) &&
      /\.(json|ya?ml)$/i.test(filePath) &&
      !filePath.endsWith(General.variablesFile)
    );
  }

  private static onActFilesChanged(uris: readonly Uri[]) {
    if (uris.some(SlideValidationService.isActFile)) {
      SlideValidationService.refreshSceneIds();
    }
  }

  /**
   * Reloads the scene ids of the act files and validates the open slide files again.
   */
  private static refreshSceneIds() {
    SlideValidationService.sceneIds = undefined;
    workspace.textDocuments.forEach(SlideValidationService.validateDocument);
  }

  private static getSceneIds(): Promise<Set<string>> {
    if (!SlideValidationService.sceneIds) {
      SlideValidationService.sceneIds = DemoFileProvider.getFiles()
        .then((files) => {
          const ids = new Set<string>();
          Object.values(files || {}).forEach((config) => {
            getDemosFromConfig(config).forEach((demo) => {
              if (demo.id) {
                ids.add(demo.id);
              }
            });
          });
          return ids;
        })
        .catch(() => new Set<string>());
    }

    return SlideValidationService.sceneIds;
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
    const tags = content.includes('<dt-action') ? getSlideActionTags(content) : [];
    if (tags.length === 0) {
      SlideValidationService.diagnosticCollection.delete(document.uri);
      return;
    }

    const sceneIds = await SlideValidationService.getSceneIds();
    // The document could have changed or closed while the act files were loading
    if (document.isClosed || document.getText() !== content) {
      return;
    }

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
      } else if (!sceneIds.has(tag.id)) {
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

    SlideValidationService.diagnosticCollection.set(document.uri, diagnostics);
  }
}
