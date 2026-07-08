import {
  Disposable,
  FileCreateEvent,
  FileType,
  TextDocument,
  TextDocumentChangeEvent,
  TextEditor,
  Uri,
  commands,
  window,
  workspace,
} from 'vscode';
import { createPatch as createUnifiedPatch } from 'diff';
import { Action, ActConfig, COMMAND, Config, Move, Scene } from '@demotime/common';
import { ContextKeys, General } from '../constants';
import { Subscription } from '../models';
import { Extension } from './Extension';
import { Notifications } from './Notifications';
import { Logger } from './Logger';
import { DemoFileProvider } from './DemoFileProvider';
import { DemoPanel } from '../panels/DemoPanel';
import { ConfigEditorProvider } from '../providers/ConfigEditorProvider';
import { isPathInWorkspace, parseWinPath, setContext, writeFile } from '../utils';

interface FileRecordingState {
  /**
   * Workspace-relative path (starting with `/`) used for the move `path` and artifacts.
   */
  relPath: string;
  /**
   * The content that the last emitted move left the file in. Acts as the baseline
   * for the next patch.
   */
  lastContent: string;
  /**
   * Whether the file was created during the recording (gets a `create` move).
   */
  isNew: boolean;
  /**
   * Whether the lead-in moves (`create` + `open`, or just `open`) have been written.
   */
  headerEmitted: boolean;
}

/**
 * Records the user's actions (file creation, opening, edits and saves) while
 * building a demo and turns them into a version 3 act file on stop.
 *
 * Segmentation is hybrid: file switches and saves act as move boundaries, while
 * edits in between are coalesced into a single `applyPatch` move. The presenter
 * stays in control through the `splitMove`, `newScene` and `markHighlight`
 * commands (available from the editor context menu while recording).
 */
export class RecordingService {
  private static recording = false;
  private static disposables: Disposable[] = [];

  private static files: Map<string, FileRecordingState> = new Map();
  private static pending: Map<string, string> = new Map();

  private static scenes: Scene[] = [];
  private static currentMoves: Move[] = [];
  private static currentSceneTitle = 'Scene 1';
  private static sceneCounter = 1;

  private static recordingFolder = '';
  private static artifactSeq = 0;
  private static lastActivePath: string | undefined;

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
    RecordingService.files = new Map();
    RecordingService.pending = new Map();
    RecordingService.scenes = [];
    RecordingService.currentMoves = [];
    RecordingService.currentSceneTitle = 'Scene 1';
    RecordingService.sceneCounter = 1;
    RecordingService.artifactSeq = 0;
    RecordingService.lastActivePath = undefined;
    RecordingService.opChain = Promise.resolve();
    RecordingService.recordingFolder = `recording-${RecordingService.timestamp()}`;

    // The file that is open when recording starts becomes the first thing the demo opens.
    const active = window.activeTextEditor;
    if (active && RecordingService.isRecordableDoc(active.document)) {
      const state = RecordingService.register(
        RecordingService.relPath(active.document.uri),
        false,
        active.document.getText(),
      );
      RecordingService.emitHeader(state);
      RecordingService.lastActivePath = state.relPath;
    }

    RecordingService.disposables.push(
      workspace.onDidCreateFiles(RecordingService.onDidCreateFiles),
      workspace.onDidChangeTextDocument(RecordingService.onDidChangeTextDocument),
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
    if (!RecordingService.recording) {
      return;
    }

    RecordingService.recording = false;
    RecordingService.disposables.forEach((d) => d.dispose());
    RecordingService.disposables = [];

    // Drain any queued work and flush the final pending edits.
    await RecordingService.opChain;
    await RecordingService.flushAll();
    RecordingService.pushScene();

    await setContext(ContextKeys.isRecording, false);

    if (RecordingService.scenes.length === 0) {
      await RecordingService.cleanupArtifacts();
      Notifications.warning('Nothing was recorded.');
      return;
    }

    const title = await window.showInputBox({
      title: Config.title,
      prompt: 'Enter a title for the recorded act',
      value: `Recorded demo ${RecordingService.timestamp()}`,
      ignoreFocusOut: true,
    });

    if (!title) {
      await RecordingService.cleanupArtifacts();
      Notifications.warning('Recording discarded — no title provided.');
      return;
    }

    const act: ActConfig = {
      $schema: 'https://demotime.show/demo-time.schema.json',
      title,
      description: 'Recorded with Demo Time',
      version: 3,
      scenes: RecordingService.scenes,
    };

    const moveCount = RecordingService.scenes.reduce((total, scene) => total + scene.moves.length, 0);
    const fileUri = await DemoFileProvider.createFile(title, act);

    DemoPanel.update();

    if (fileUri) {
      ConfigEditorProvider.openInConfigEditor(fileUri);
      Notifications.infoWithProgress(
        `Recorded act "${title}" created with ${RecordingService.scenes.length} scene(s) and ${moveCount} move(s).`,
      );
    } else {
      Notifications.warning(
        `Could not create the act file for "${title}" — a file with that name may already exist.`,
      );
    }
  }

  /**
   * Forces the current pending edits into moves without ending the scene.
   */
  public static splitMove() {
    if (!RecordingService.recording) {
      return;
    }

    RecordingService.enqueue(() => RecordingService.flushAll());
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

    RecordingService.enqueue(async () => {
      await RecordingService.flushAll();
      RecordingService.pushScene();
      RecordingService.sceneCounter++;
      RecordingService.currentSceneTitle = title || `Scene ${RecordingService.sceneCounter}`;
    });
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
    const start = editor.selection.start.line + 1;
    const end = editor.selection.end.line + 1;
    const position: string | number = start === end ? start : `${start}:${end}`;

    RecordingService.enqueue(async () => {
      // Make sure the edits that produced this code are captured before the highlight.
      await RecordingService.flushFile(relPath);
      const state = RecordingService.files.get(relPath);
      if (state) {
        RecordingService.emitHeader(state);
      }
      RecordingService.currentMoves.push({ action: Action.Highlight, path: relPath, position });
    });

    Notifications.infoWithProgress('Highlight captured.', 1500);
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  private static onDidCreateFiles = (e: FileCreateEvent) => {
    RecordingService.enqueue(async () => {
      for (const uri of e.files) {
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

        RecordingService.register(RecordingService.relPath(uri), true, '');
      }
    });
  };

  private static onDidChangeTextDocument = (e: TextDocumentChangeEvent) => {
    if (!e.contentChanges.length || !RecordingService.isRecordableDoc(e.document)) {
      return;
    }

    const relPath = RecordingService.relPath(e.document.uri);
    const content = e.document.getText();

    RecordingService.enqueue(() => {
      if (!RecordingService.files.has(relPath)) {
        // The file was never created or activated while recording; treat its current
        // content as the baseline so we only capture changes from here on.
        RecordingService.register(relPath, false, content);
      }
      RecordingService.pending.set(relPath, content);
    });
  };

  private static onDidSaveTextDocument = (doc: TextDocument) => {
    if (!RecordingService.isRecordableDoc(doc)) {
      return;
    }

    const relPath = RecordingService.relPath(doc.uri);
    const captureSaves =
      Extension.getInstance().getSetting<boolean>(Config.recording.captureSaves) ?? true;

    RecordingService.enqueue(async () => {
      RecordingService.pending.set(relPath, doc.getText());
      await RecordingService.flushFile(relPath);

      if (captureSaves) {
        const state = RecordingService.files.get(relPath);
        if (state) {
          RecordingService.emitHeader(state);
        }
        RecordingService.currentMoves.push({ action: Action.Save });
      }
    });
  };

  private static onDidChangeActiveTextEditor = (editor?: TextEditor) => {
    RecordingService.enqueue(async () => {
      // Switching away from a file is a natural move boundary.
      await RecordingService.flushAll();

      if (!editor || !RecordingService.isRecordableDoc(editor.document)) {
        return;
      }

      const relPath = RecordingService.relPath(editor.document.uri);
      if (relPath === RecordingService.lastActivePath) {
        return;
      }
      RecordingService.lastActivePath = relPath;

      let state = RecordingService.files.get(relPath);
      if (!state) {
        state = RecordingService.register(relPath, false, editor.document.getText());
      }

      // New files get their `create` + `open` header when their first content is
      // flushed; existing files are opened as soon as they become active.
      if (!state.isNew) {
        RecordingService.emitHeader(state);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private static register(relPath: string, isNew: boolean, baseline: string): FileRecordingState {
    let state = RecordingService.files.get(relPath);
    if (!state) {
      state = { relPath, lastContent: baseline, isNew, headerEmitted: false };
      RecordingService.files.set(relPath, state);
    } else if (isNew) {
      state.isNew = true;
    }
    return state;
  }

  private static emitHeader(state: FileRecordingState) {
    if (state.headerEmitted) {
      return;
    }

    if (state.isNew) {
      RecordingService.currentMoves.push({ action: Action.Create, path: state.relPath });
    }
    RecordingService.currentMoves.push({ action: Action.Open, path: state.relPath });
    state.headerEmitted = true;
  }

  private static pushScene() {
    if (RecordingService.currentMoves.length === 0) {
      return;
    }

    RecordingService.scenes.push({
      title: RecordingService.currentSceneTitle,
      moves: RecordingService.currentMoves,
    });
    RecordingService.currentMoves = [];
  }

  private static async flushAll() {
    for (const relPath of Array.from(RecordingService.pending.keys())) {
      await RecordingService.flushFile(relPath);
    }
  }

  private static async flushFile(relPath: string) {
    const content = RecordingService.pending.get(relPath);
    if (typeof content === 'undefined') {
      return;
    }
    RecordingService.pending.delete(relPath);

    const state = RecordingService.files.get(relPath);
    if (!state || content === state.lastContent) {
      return;
    }

    RecordingService.emitHeader(state);

    const seq = String(++RecordingService.artifactSeq).padStart(3, '0');
    const fileName = relPath.split('/').pop() || 'file';
    const baseName = `${seq}-${fileName}`;

    const contentPath = await RecordingService.writeArtifact(
      General.snapshotsFolder,
      baseName,
      state.lastContent,
    );
    const patch = await RecordingService.writeArtifact(
      General.patchesFolder,
      `${baseName}.patch`,
      createUnifiedPatch(relPath, state.lastContent, content),
    );

    RecordingService.currentMoves.push({
      action: Action.ApplyPatch,
      path: relPath,
      contentPath,
      patch,
    });

    state.lastContent = content;
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

  private static enqueue(fn: () => Promise<void> | void): Promise<void> {
    RecordingService.opChain = RecordingService.opChain.then(fn).catch((error) => {
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
