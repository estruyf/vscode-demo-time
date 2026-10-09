import { createPatch } from 'diff';
import { Action, Move, Scene } from '@demotime/common';

/**
 * Writes the snapshots and patches the recorded `applyPatch` moves refer to, and
 * returns their workspace-relative paths.
 */
export interface RecordingArtifacts {
  writeSnapshot(name: string, content: string): Promise<string>;
  writePatch(name: string, content: string): Promise<string>;
}

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
   * Whether the file was created during the recording and still needs its `create` move.
   */
  isNew: boolean;
  /**
   * Whether a move has been written for the file.
   */
  recorded: boolean;
}

/**
 * Returns the `highlight` position for a selection, using the 0-based lines of
 * VS Code. A selection that ends at the start of a line (after Shift+Down or a
 * triple-click) does not include that line.
 */
export const getRecordedHighlightPosition = (
  startLine: number,
  endLine: number,
  endCharacter: number,
): string | number => {
  const start = startLine + 1;
  const end = endLine > startLine && endCharacter === 0 ? endLine : endLine + 1;
  return start === end ? start : `${start}:${end}`;
};

/**
 * Turns the editor events of a recording into scenes and moves. It has no
 * dependency on the VS Code API: the `RecordingService` forwards the events.
 *
 * Segmentation is hybrid: file switches and saves act as move boundaries, while
 * edits in between are coalesced into a single `applyPatch` move.
 */
export class RecordingSession {
  private files: Map<string, FileRecordingState> = new Map();
  private pending: Map<string, string> = new Map();

  private scenes: Scene[] = [];
  private currentMoves: Move[] = [];
  private currentSceneTitle = 'Scene 1';
  private sceneCounter = 1;

  private artifactSeq = 0;
  /**
   * The file the replay shows at this point of the recording.
   */
  private openPath: string | undefined;

  constructor(private readonly artifacts: RecordingArtifacts) {}

  /**
   * A file was created. Files created by VS Code always get a `create` move, files
   * that only the file watcher reports (terminal, git, CLIs) only when they are new
   * to the recording.
   */
  public fileCreated(relPath: string, fromWatcher = false) {
    if (fromWatcher && this.files.has(relPath)) {
      return;
    }
    this.register(relPath, true, '');
  }

  /**
   * A file became the active editor.
   */
  public async fileActivated(relPath: string, content: string) {
    // Switching away from a file is a natural move boundary.
    await this.flushAll();

    const state = this.register(relPath, false, content);

    if (state.isNew && !state.recorded) {
      // New files get their `create` + `open` moves with their first content. A file
      // that was created with content (outside VS Code) gets it right away.
      if (content !== state.lastContent) {
        this.pending.set(relPath, content);
        await this.flushFile(relPath);
      }
      return;
    }

    this.ensureOpen(state);
  }

  public fileChanged(relPath: string, content: string) {
    // A file that was never created or activated while recording uses its current
    // content as the baseline, so only the changes from here on are captured.
    this.register(relPath, false, content);
    this.pending.set(relPath, content);
  }

  /**
   * A file was saved manually: ends the move and optionally records a `save` move.
   */
  public async fileSaved(relPath: string, content: string, captureSave: boolean) {
    this.register(relPath, false, content);
    this.pending.set(relPath, content);
    await this.flushFile(relPath);

    if (captureSave) {
      // `save` saves the active editor, so the file has to be open.
      this.ensureOpen(this.files.get(relPath)!);
      this.currentMoves.push({ action: Action.Save });
    }
  }

  public async highlight(relPath: string, content: string, position: string | number) {
    this.register(relPath, false, content);
    // Make sure the edits that produced this code are captured before the highlight.
    await this.flushFile(relPath);
    this.ensureOpen(this.files.get(relPath)!);
    this.currentMoves.push({ action: Action.Highlight, path: relPath, position });
  }

  /**
   * Forces the pending edits into moves without ending the scene.
   */
  public async splitMove() {
    await this.flushAll();
  }

  /**
   * Closes the current scene and starts a new one.
   */
  public async newScene(title?: string) {
    await this.flushAll();
    this.pushScene();
    this.sceneCounter++;
    this.currentSceneTitle = title || `Scene ${this.sceneCounter}`;
    // Every scene opens its file, so it also works when you start the play from it.
    this.openPath = undefined;
  }

  /**
   * Flushes the pending edits and returns the recorded scenes.
   */
  public async finish(): Promise<Scene[]> {
    await this.flushAll();
    this.pushScene();
    return this.scenes;
  }

  private register(relPath: string, isNew: boolean, baseline: string): FileRecordingState {
    let state = this.files.get(relPath);
    if (!state) {
      state = { relPath, lastContent: baseline, isNew, recorded: false };
      this.files.set(relPath, state);
    } else if (isNew && !state.recorded) {
      state.isNew = true;
    }
    return state;
  }

  /**
   * Writes the `create` move of a new file, and an `open` move when the replay
   * shows another file.
   */
  private ensureOpen(state: FileRecordingState) {
    if (state.isNew) {
      this.currentMoves.push({ action: Action.Create, path: state.relPath });
      state.isNew = false;
    }
    if (this.openPath !== state.relPath) {
      this.currentMoves.push({ action: Action.Open, path: state.relPath });
      this.openPath = state.relPath;
    }
    state.recorded = true;
  }

  private pushScene() {
    if (this.currentMoves.length === 0) {
      return;
    }

    this.scenes.push({
      title: this.currentSceneTitle,
      moves: this.currentMoves,
    });
    this.currentMoves = [];
  }

  private async flushAll() {
    for (const relPath of Array.from(this.pending.keys())) {
      await this.flushFile(relPath);
    }
  }

  private async flushFile(relPath: string) {
    const content = this.pending.get(relPath);
    if (typeof content === 'undefined') {
      return;
    }
    this.pending.delete(relPath);

    const state = this.files.get(relPath);
    if (!state || content === state.lastContent) {
      return;
    }

    this.ensureOpen(state);

    const seq = String(++this.artifactSeq).padStart(3, '0');
    const fileName = relPath.split('/').pop() || 'file';
    const baseName = `${seq}-${fileName}`;

    const contentPath = await this.artifacts.writeSnapshot(baseName, state.lastContent);
    const patch = await this.artifacts.writePatch(
      `${baseName}.patch`,
      createPatch(relPath, state.lastContent, content),
    );

    this.currentMoves.push({
      action: Action.ApplyPatch,
      path: relPath,
      contentPath,
      patch,
    });

    state.lastContent = content;
  }
}
