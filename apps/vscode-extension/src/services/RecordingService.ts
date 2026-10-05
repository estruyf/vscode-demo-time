import {
  Disposable,
  FileCreateEvent,
  FileType,
  RelativePattern,
  TextDocument,
  TextDocumentChangeEvent,
  TextDocumentSaveReason,
  TextDocumentWillSaveEvent,
  TextEditor,
  Uri,
  commands,
  window,
  workspace,
} from 'vscode';
import { ActConfig, COMMAND, Config } from '@demotime/common';
import { ContextKeys, General } from '../constants';
import { Subscription } from '../models';
import { Extension } from './Extension';
import { Notifications } from './Notifications';
import { Logger } from './Logger';
import { DemoFileProvider } from './DemoFileProvider';
import { RecordingSession, getRecordedHighlightPosition } from './RecordingSession';
import { DemoPanel } from '../panels/DemoPanel';
import { ConfigEditorProvider } from '../providers/ConfigEditorProvider';
import { isPathInWorkspace, parseWinPath, setContext, writeFile } from '../utils';

/**
 * Records the user's actions (file creation, opening, edits and saves) while
 * building a demo and turns them into a version 3 act file on stop.
 *
 * The VS Code events are forwarded to a `RecordingSession`, which turns them into
 * scenes and moves. The presenter stays in control through the `splitMove`,
 * `newScene` and `markHighlight` commands (available from the editor context menu
 * and the command palette while recording).
 */
export class RecordingService {
  private static recording = false;
  private static disposables: Disposable[] = [];

  private static session: RecordingSession | undefined;
  private static recordingFolder = '';
  /**
   * Documents with a pending manual save. Auto saves are not move boundaries.
   */
  private static manualSaves: Set<string> = new Set();

  /**
   * Serializes all state mutations and artifact writes so events that fire in
   * quick succession can never interleave.
   */
  private static opChain: Promise<void> = Promise.resolve();

  public static registerCommands() {
    const subscriptions: Subscription[] = Extension.getInstance().subscriptions;

    subscriptions.push(commands.registerCommand(COMMAND.recordingStart, RecordingService.start));
    subscriptions.push(commands.registerCommand(COMMAND.recordingStop, RecordingService.stop));
    subscriptions.push(
      commands.registerCommand(COMMAND.recordingSplitMove, RecordingService.splitMove),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.recordingNewScene, RecordingService.newScene),
    );
    subscriptions.push(
      commands.registerCommand(COMMAND.recordingMarkHighlight, RecordingService.markHighlight),
    );

    setContext(ContextKeys.isRecording, false);
  }

  /**
   * Starts a new recording session.
   */
  public static async start() {
    if (RecordingService.recording) {
      return;
    }

    const wsFolder = Extension.getInstance().workspaceFolder;
    if (!wsFolder) {
      Notifications.error('Open a workspace folder before recording a demo.');
      return;
    }

    RecordingService.recording = true;
    RecordingService.session = new RecordingSession({
      writeSnapshot: (name, content) =>
        RecordingService.writeArtifact(General.snapshotsFolder, name, content),
      writePatch: (name, content) =>
        RecordingService.writeArtifact(General.patchesFolder, name, content),
    });
    RecordingService.manualSaves = new Set();
    RecordingService.opChain = Promise.resolve();
    RecordingService.recordingFolder = `recording-${RecordingService.timestamp()}`;

    // The file that is open when recording starts becomes the first thing the demo opens.
    const active = window.activeTextEditor;
    if (active && RecordingService.isRecordableDoc(active.document)) {
      const relPath = RecordingService.relPath(active.document.uri);
      const content = active.document.getText();
      RecordingService.enqueue((session) => session.fileActivated(relPath, content));
    }

    // Catches files that are created outside VS Code (terminal, git, CLIs).
    const watcher = workspace.createFileSystemWatcher(
      new RelativePattern(wsFolder, '**/*'),
      false,
      true,
      true,
    );

    RecordingService.disposables.push(
      watcher,
      watcher.onDidCreate((uri) => RecordingService.onFilesCreated([uri], true)),
      workspace.onDidCreateFiles(RecordingService.onDidCreateFiles),
      workspace.onDidChangeTextDocument(RecordingService.onDidChangeTextDocument),
      workspace.onWillSaveTextDocument(RecordingService.onWillSaveTextDocument),
      workspace.onDidSaveTextDocument(RecordingService.onDidSaveTextDocument),
      window.onDidChangeActiveTextEditor(RecordingService.onDidChangeActiveTextEditor),
    );

    await setContext(ContextKeys.isRecording, true);
    Notifications.infoWithProgress(
      'Recording started — right-click in the editor for highlight, split move and new scene.',
    );
  }

  /**
   * Stops the recording and writes the captured scenes/moves to a new act file.
   */
  public static async stop() {
    const session = RecordingService.session;
    if (!RecordingService.recording || !session) {
      return;
    }

    RecordingService.recording = false;
    RecordingService.disposables.forEach((d) => d.dispose());
    RecordingService.disposables = [];

    // Drain any queued work and flush the final pending edits.
    await RecordingService.opChain;
    const scenes = await session.finish();
    RecordingService.session = undefined;

    await setContext(ContextKeys.isRecording, false);

    if (scenes.length === 0) {
      await RecordingService.cleanupArtifacts();
      Notifications.warning('Nothing was recorded.');
      return;
    }

    const defaultTitle = `Recorded demo ${RecordingService.timestamp()}`;
    let title = await window.showInputBox({
      title: Config.title,
      prompt: 'Enter a title for the recorded act',
      value: defaultTitle,
      ignoreFocusOut: true,
    });

    if (typeof title === 'undefined') {
      const answer = await window.showWarningMessage(
        'Discard the recording?',
        {
          modal: true,
          detail: `Keep creates the act with the title "${defaultTitle}".`,
        },
        'Keep',
        'Discard',
      );

      if (answer === 'Discard') {
        await RecordingService.cleanupArtifacts();
        Notifications.warning('Recording discarded.');
        return;
      }
    }

    title = title?.trim() || defaultTitle;

    const act: ActConfig = {
      $schema: 'https://demotime.show/demo-time.schema.json',
      title,
      description: 'Recorded with Demo Time',
      version: 3,
      scenes,
    };

    const moveCount = scenes.reduce((total, scene) => total + scene.moves.length, 0);
    const fileUri = await RecordingService.createActFile(title, act);

    DemoPanel.update();

    if (fileUri) {
      ConfigEditorProvider.openInConfigEditor(fileUri);
      Notifications.infoWithProgress(
        `Recorded act "${title}" created with ${scenes.length} scene(s) and ${moveCount} move(s).`,
      );
    } else {
      await RecordingService.cleanupArtifacts();
      Notifications.error(`Could not create the act file for "${title}".`);
    }
  }

  /**
   * Forces the current pending edits into moves without ending the scene.
   */
  public static splitMove() {
    if (!RecordingService.recording) {
      return;
    }

    RecordingService.enqueue((session) => session.splitMove());
    Notifications.infoWithProgress('Move boundary set.', 1500);
  }

  /**
   * Closes the current scene and starts a new one.
   */
  public static async newScene() {
    if (!RecordingService.recording) {
      return;
    }

    const title = await window.showInputBox({
      title: Config.title,
      prompt: 'Enter a title for the next scene',
      ignoreFocusOut: true,
    });

    // Escape cancels the new scene.
    if (typeof title === 'undefined' || !RecordingService.recording) {
      return;
    }

    RecordingService.enqueue((session) => session.newScene(title.trim()));
  }

  /**
   * Captures the current editor selection as a highlight move.
   */
  public static markHighlight() {
    if (!RecordingService.recording) {
      return;
    }

    const editor = window.activeTextEditor;
    if (!editor || !RecordingService.isRecordableDoc(editor.document)) {
      Notifications.warning('No active file to highlight.');
      return;
    }

    const relPath = RecordingService.relPath(editor.document.uri);
    const content = editor.document.getText();
    const { start, end } = editor.selection;
    const position = getRecordedHighlightPosition(start.line, end.line, end.character);

    RecordingService.enqueue((session) => session.highlight(relPath, content, position));

    Notifications.infoWithProgress('Highlight captured.', 1500);
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  private static onDidCreateFiles = (e: FileCreateEvent) => {
    RecordingService.onFilesCreated(e.files, false);
  };

  private static onFilesCreated = (uris: readonly Uri[], fromWatcher: boolean) => {
    RecordingService.enqueue(async (session) => {
      for (const uri of uris) {
        if (!RecordingService.isRecordablePath(uri)) {
          continue;
        }

        try {
          const stat = await workspace.fs.stat(uri);
          if (stat.type !== FileType.File) {
            continue;
          }
        } catch {
          continue;
        }

        session.fileCreated(RecordingService.relPath(uri), fromWatcher);
      }
    });
  };

  private static onDidChangeTextDocument = (e: TextDocumentChangeEvent) => {
    if (!e.contentChanges.length || !RecordingService.isRecordableDoc(e.document)) {
      return;
    }

    const relPath = RecordingService.relPath(e.document.uri);
    const content = e.document.getText();

    RecordingService.enqueue((session) => session.fileChanged(relPath, content));
  };

  private static onWillSaveTextDocument = (e: TextDocumentWillSaveEvent) => {
    if (e.reason === TextDocumentSaveReason.Manual) {
      RecordingService.manualSaves.add(e.document.uri.toString());
    }
  };

  private static onDidSaveTextDocument = (doc: TextDocument) => {
    // Only manual saves are move boundaries, so auto save does not split the edits.
    if (
      !RecordingService.manualSaves.delete(doc.uri.toString()) ||
      !RecordingService.isRecordableDoc(doc)
    ) {
      return;
    }

    const relPath = RecordingService.relPath(doc.uri);
    const content = doc.getText();
    const captureSaves =
      Extension.getInstance().getSetting<boolean>(Config.recording.captureSaves) ?? true;

    RecordingService.enqueue((session) => session.fileSaved(relPath, content, captureSaves));
  };

  private static onDidChangeActiveTextEditor = (editor?: TextEditor) => {
    if (!editor || !RecordingService.isRecordableDoc(editor.document)) {
      // Switching away from a file is a natural move boundary.
      RecordingService.enqueue((session) => session.splitMove());
      return;
    }

    const relPath = RecordingService.relPath(editor.document.uri);
    const content = editor.document.getText();

    RecordingService.enqueue((session) => session.fileActivated(relPath, content));
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Creates the act file, adding a number to the file name when an act with the
   * same name already exists (`my-demo-2.json`).
   */
  private static async createActFile(title: string, act: ActConfig): Promise<Uri | undefined> {
    for (let attempt = 1; attempt <= 100; attempt++) {
      const fileName = attempt === 1 ? title : `${title}-${attempt}`;
      const fileUri = await DemoFileProvider.createFile(fileName, act);
      if (fileUri) {
        return fileUri;
      }
    }
    return undefined;
  }

  /**
   * Writes a snapshot/patch artifact under `.demo/<folder>/<recording>/` and returns
   * its workspace-relative path (matching the format used by `createPatch`).
   */
  private static async writeArtifact(
    folder: string,
    name: string,
    content: string,
  ): Promise<string> {
    const wsFolder = Extension.getInstance().workspaceFolder!;
    const uri = Uri.joinPath(
      wsFolder.uri,
      General.demoFolder,
      folder,
      RecordingService.recordingFolder,
      name,
    );
    await writeFile(uri, content, false);
    return uri.path.replace(wsFolder.uri.path, '');
  }

  private static async cleanupArtifacts() {
    const wsFolder = Extension.getInstance().workspaceFolder;
    if (!wsFolder || !RecordingService.recordingFolder) {
      return;
    }

    for (const folder of [General.snapshotsFolder, General.patchesFolder]) {
      const uri = Uri.joinPath(
        wsFolder.uri,
        General.demoFolder,
        folder,
        RecordingService.recordingFolder,
      );
      try {
        await workspace.fs.delete(uri, { recursive: true, useTrash: false });
      } catch {
        // Folder may not exist when nothing was written; ignore.
      }
    }
  }

  private static enqueue(fn: (session: RecordingSession) => Promise<void> | void): Promise<void> {
    const session = RecordingService.session;
    if (!session) {
      return RecordingService.opChain;
    }

    RecordingService.opChain = RecordingService.opChain
      .then(() => fn(session))
      .catch((error) => {
        Logger.error(`${Config.title}: recording error - ${(error as Error).message}`);
      });
    return RecordingService.opChain;
  }

  private static relPath(uri: Uri): string {
    const wsFolder = Extension.getInstance().workspaceFolder;
    if (!wsFolder) {
      return uri.path;
    }
    return uri.path.replace(wsFolder.uri.path, '');
  }

  private static isRecordableDoc(doc: TextDocument): boolean {
    return !doc.isUntitled && RecordingService.isRecordablePath(doc.uri);
  }

  private static isRecordablePath(uri: Uri): boolean {
    if (uri.scheme !== 'file') {
      return false;
    }
    if (!isPathInWorkspace(uri, Extension.getInstance().workspaceFolder)) {
      return false;
    }
    // Never record the act files or the snapshots/patches we generate.
    return !parseWinPath(uri.fsPath).includes(`/${General.demoFolder}/`);
  }

  private static timestamp(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return (
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    );
  }
}
