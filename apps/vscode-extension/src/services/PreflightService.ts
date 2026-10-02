import {
  CodeAction,
  CodeActionContext,
  CodeActionKind,
  commands,
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  languages,
  ProgressLocation,
  Range,
  TextDocument,
  Uri,
  workspace,
  WorkspaceEdit,
  WorkspaceFolder,
  window,
} from 'vscode';
import { parse as jsonParse } from 'jsonc-parser';
import { ActProblem, COMMAND, Config } from '@demotime/common';
import { General } from '../constants';
import {
  fileExists,
  getPreflightProblems,
  isPathInWorkspace,
  parseWinPath,
  PreflightAct,
  PreflightActResult,
  PreflightProblem,
  PreflightProblemSeverity,
  readFile,
  sortFiles,
} from '../utils';
import { DemoFileProvider } from './DemoFileProvider';
import { Extension } from './Extension';
import { Logger } from './Logger';
import { Notifications } from './Notifications';
import { ActMoveLocation, ConfigEditorProvider } from '../providers/ConfigEditorProvider';

const DIAGNOSTIC_SOURCE = 'demo-time';
const RERUN_DELAY = 500;

const SEVERITIES: Record<PreflightProblemSeverity, DiagnosticSeverity> = {
  error: DiagnosticSeverity.Error,
  warning: DiagnosticSeverity.Warning,
};

/**
 * Checks all the moves in the play without running them. The act editor always shows the problems
 * of its act, the Problems panel shows them after the `Run preflight check` command.
 */
export class PreflightService {
  private static diagnosticCollection: DiagnosticCollection;
  private static hasRun = false;
  private static rerunTimer: NodeJS.Timeout | undefined;
  /**
   * The missing files of the problems in the Problems panel, for the quick fix that creates them
   */
  private static missingFiles = new Map<string, string>();

  public static register() {
    const { subscriptions } = Extension.getInstance().context;

    PreflightService.diagnosticCollection = languages.createDiagnosticCollection(
      `${DIAGNOSTIC_SOURCE}-preflight`,
    );

    subscriptions.push(
      PreflightService.diagnosticCollection,
      commands.registerCommand(COMMAND.runPreflightCheck, () => PreflightService.run()),
      commands.registerCommand(COMMAND.createMissingFile, PreflightService.createMissingFile),
      languages.registerCodeActionsProvider(
        [{ scheme: 'file', pattern: `**/${General.demoFolder}/*.{json,yaml,yml}` }],
        { provideCodeActions: PreflightService.provideCodeActions },
        { providedCodeActionKinds: [CodeActionKind.QuickFix] },
      ),
      workspace.onDidSaveTextDocument(PreflightService.rerun),
      workspace.onDidCreateFiles(PreflightService.rerun),
      workspace.onDidDeleteFiles(PreflightService.rerun),
      workspace.onDidRenameFiles(PreflightService.rerun),
    );
  }

  /**
   * Runs the preflight check and shows the problems in the Problems panel
   * @param silent Only update the Problems panel, without a notification
   */
  public static async run(silent = false): Promise<void> {
    if (!Extension.getInstance().workspaceFolder) {
      if (!silent) {
        Notifications.error('No workspace folder found to run the preflight check.');
      }
      return;
    }

    const results = silent
      ? await PreflightService.check()
      : await window.withProgress(
          { location: ProgressLocation.Window, title: `${Config.title}: Running preflight check` },
          () => PreflightService.check(),
        );

    if (!results) {
      PreflightService.diagnosticCollection.clear();
      if (!silent) {
        Notifications.warning('No act files found to run the preflight check.');
      }
      return;
    }

    PreflightService.diagnosticCollection.clear();
    PreflightService.missingFiles.clear();

    let errors = 0;
    let warnings = 0;
    let moves = 0;
    for (const result of results) {
      moves += result.moves;

      const diagnostics = result.problems.map((problem) => {
        const diagnostic = new Diagnostic(
          new Range(problem.line, problem.character, problem.line, Number.MAX_SAFE_INTEGER),
          problem.message,
          SEVERITIES[problem.severity],
        );
        diagnostic.source = DIAGNOSTIC_SOURCE;
        diagnostic.code = PreflightService.getCode(result.filePath, problem);

        if (problem.missingFile) {
          PreflightService.missingFiles.set(
            PreflightService.getDiagnosticKey(Uri.file(result.filePath), diagnostic),
            problem.missingFile,
          );
        }

        if (problem.severity === 'error') {
          errors++;
        } else {
          warnings++;
        }
        return diagnostic;
      });

      PreflightService.diagnosticCollection.set(Uri.file(result.filePath), diagnostics);
    }

    PreflightService.hasRun = true;

    if (silent) {
      return;
    }

    const checked = `${moves} move${moves === 1 ? '' : 's'} in ${results.length} act${results.length === 1 ? '' : 's'}`;
    if (errors === 0 && warnings === 0) {
      Notifications.info(`Preflight check passed: no problems found in ${checked}.`);
      return;
    }

    const found = [
      errors ? `${errors} error${errors === 1 ? '' : 's'}` : '',
      warnings ? `${warnings} warning${warnings === 1 ? '' : 's'}` : '',
    ]
      .filter(Boolean)
      .join(' and ');
    const showProblems = 'Show problems';
    const notify = errors ? Notifications.error : Notifications.warning;
    const answer = await notify(`Preflight check found ${found} in ${checked}.`, showProblems);
    if (answer === showProblems) {
      await commands.executeCommand('workbench.actions.view.problems');
    }
  }

  /**
   * The problems of an act for the act editor, which always shows them, also when the preflight
   * check didn't run. The act editor sends its config, so unsaved changes are checked as well.
   */
  public static async getActProblems(fileUri: Uri, config?: unknown): Promise<ActProblem[]> {
    const filePath = parseWinPath(fileUri.fsPath);
    const results = await PreflightService.check(
      config ? { filePath, content: JSON.stringify(config) } : undefined,
    );

    const result = results?.find((item) => parseWinPath(item.filePath) === filePath);
    return (result?.problems || []).map(({ line, character, ...problem }) => problem);
  }

  /**
   * Checks the play, with the open documents so unsaved changes are checked as well
   * @param override The content to check for an act file, instead of its document
   */
  private static async check(override?: {
    filePath: string;
    content: string;
  }): Promise<PreflightActResult[] | undefined> {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    const files = await DemoFileProvider.getFiles();
    if (!workspaceFolder || !files || Object.keys(files).length === 0) {
      return;
    }

    const acts: PreflightAct[] = [];
    for (const filePath of sortFiles(files)) {
      if (override && parseWinPath(filePath) === override.filePath) {
        acts.push({ filePath, content: override.content });
        continue;
      }

      try {
        const document = await workspace.openTextDocument(Uri.file(filePath));
        acts.push({ filePath, content: document.getText() });
      } catch (error) {
        Logger.error(`Preflight check: can't read ${filePath}: ${(error as Error).message}`);
      }
    }

    const resolve = (path: string) => Uri.joinPath(workspaceFolder.uri, path);
    return getPreflightProblems(acts, {
      fileExists: (path) => fileExists(resolve(path)),
      readFile: async (path) => {
        try {
          return await readFile(resolve(path));
        } catch {
          return undefined;
        }
      },
      isInWorkspace: (path) => isPathInWorkspace(resolve(path), workspaceFolder),
      variables: await PreflightService.getVariables(workspaceFolder),
    });
  }

  /**
   * Creates a missing file in the workspace folder and opens it. The preflight check runs again
   * when the file is created, so its problem disappears.
   * @param path The path of the file, relative to the workspace folder
   */
  public static async createMissingFile(path: string) {
    const workspaceFolder = Extension.getInstance().workspaceFolder;
    if (!workspaceFolder || typeof path !== 'string' || !path) {
      return;
    }

    const fileUri = Uri.joinPath(workspaceFolder.uri, path);
    if (!isPathInWorkspace(fileUri, workspaceFolder)) {
      Notifications.error(`Can't create "${path}", as it is outside the workspace folder.`);
      return;
    }

    if (!(await fileExists(fileUri))) {
      // A workspace edit creates the parent folders, and lets the check run again
      const edit = new WorkspaceEdit();
      edit.createFile(fileUri, { ignoreIfExists: true, contents: new Uint8Array() });
      if (!(await workspace.applyEdit(edit))) {
        Notifications.error(`Can't create "${path}".`);
        return;
      }
    }

    PreflightService.rerun();
    await commands.executeCommand('vscode.open', fileUri);
  }

  /**
   * The quick fix to create the missing file of a problem in the Problems panel
   */
  private static provideCodeActions(
    document: TextDocument,
    _range: Range,
    context: CodeActionContext,
  ) {
    const actions: CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      const missingFile = PreflightService.missingFiles.get(
        PreflightService.getDiagnosticKey(document.uri, diagnostic),
      );
      if (!missingFile) {
        continue;
      }

      const action = new CodeAction(`Create "${missingFile}"`, CodeActionKind.QuickFix);
      action.diagnostics = [diagnostic];
      action.command = {
        title: action.title,
        command: COMMAND.createMissingFile,
        arguments: [missingFile],
      };
      actions.push(action);
    }

    return actions;
  }

  private static getDiagnosticKey(fileUri: Uri, diagnostic: Diagnostic) {
    return `${parseWinPath(fileUri.fsPath)}|${diagnostic.range.start.line}|${diagnostic.message}`;
  }

  /**
   * The code of a problem is a link that shows the scene and move in the act editor. Clicking the
   * problem itself opens the act file, but a custom editor can't reveal the line of the problem.
   */
  private static getCode(filePath: string, problem: PreflightProblem): Diagnostic['code'] {
    if (problem.sceneIndex === undefined) {
      return problem.code;
    }

    const location: ActMoveLocation = {
      filePath,
      sceneIndex: problem.sceneIndex,
      moveIndex: problem.moveIndex,
      line: problem.line,
      character: problem.character,
    };

    return {
      value: `Scene ${problem.sceneIndex + 1} · ${problem.moveIndex === undefined ? 'Notes' : `Move ${problem.moveIndex + 1}`}`,
      target: Uri.parse(
        `command:${COMMAND.openActMove}?${encodeURIComponent(JSON.stringify([location]))}`,
      ),
    };
  }

  /**
   * Runs the check again when files change, so fixed problems disappear from the Problems panel
   * and the act editors
   */
  private static rerun() {
    clearTimeout(PreflightService.rerunTimer);
    PreflightService.rerunTimer = setTimeout(() => {
      ConfigEditorProvider.notifyPreflightChanged();
      if (PreflightService.hasRun) {
        PreflightService.run(true);
      }
    }, RERUN_DELAY);
  }

  /**
   * The variables from `variables.json`, other variables only get their value while the play runs
   */
  private static async getVariables(
    workspaceFolder: WorkspaceFolder,
  ): Promise<Record<string, unknown>> {
    const variables: Record<string, unknown> = {
      DT_WORKSPACE_PATH: workspaceFolder.uri.fsPath,
    };

    const variablesUri = Uri.joinPath(
      workspaceFolder.uri,
      General.demoFolder,
      General.variablesFile,
    );
    if (!(await fileExists(variablesUri))) {
      return variables;
    }

    try {
      const content = jsonParse(await readFile(variablesUri));
      return { ...content, ...variables };
    } catch (error) {
      Logger.error(`Preflight check: can't read the variables: ${(error as Error).message}`);
      return variables;
    }
  }
}
