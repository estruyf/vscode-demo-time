import { relative, sep } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import {
  Range,
  TabInputText,
  TextDocument,
  Uri,
  WorkspaceEdit,
  commands,
  window,
  workspace,
} from 'vscode';
import {
  ActConfig,
  Config,
  Demo,
  DemoConfig,
  DemoFiles,
  getDemosFromConfig,
} from '@demotime/common';
import { COMMAND } from '@demotime/common';
import { StateKeys } from '../constants/StateKeys';
import { Extension } from './Extension';
import { Logger } from './Logger';
import { Notifications } from './Notifications';
import { ShadowGit } from '../utils/ShadowGit';
import { getRelPath } from '../utils/getRelPath';
import { sortFiles } from '../utils/sortFiles';

/**
 * Scene checkpoints: snapshots of the workspace files taken when a scene starts. Going back to a
 * scene restores its snapshot, so the scene can be presented again from the same state. Resetting
 * the play restores the files as they were before the first scene ran.
 */
export class CheckpointService {
  private static shadowGit: ShadowGit | null | undefined;
  private static readonly NOTHING_SAVED = 'no checkpoints were saved, because saving them failed';
  private static queue: Promise<unknown> = Promise.resolve();
  private static healthy = true;
  private static saveErrorShown = false;
  private static healthListeners: (() => void)[] = [];
  private static pendingPrompt: Promise<void> | undefined;
  // The question after a failed reset was closed: don't ask again until the next reset
  private static questionClosed = false;

  /**
   * False after a git error, until a checkpoint works again. Going back isn't safe meanwhile.
   */
  public static isHealthy(): boolean {
    return CheckpointService.healthy;
  }

  public static onDidChangeHealth(listener: () => void): void {
    CheckpointService.healthListeners.push(listener);
  }

  /**
   * Whether the scenes of an act get checkpoints: the `sceneCheckpoints` property of the act wins
   * over the `demoTime.sceneCheckpoints` setting. It's all scenes of the act or none, so going back
   * and forward always works the same way.
   */
  public static isEnabled(act?: DemoConfig | ActConfig | null): boolean {
    if (typeof act?.sceneCheckpoints === 'boolean') {
      return act.sceneCheckpoints;
    }
    return !!Extension.getInstance().getSetting<boolean>(Config.demoRunner.sceneCheckpoints);
  }

  /**
   * Gets git ready in the background, before the first scene needs a checkpoint: creates the
   * repository and hashes the files. A missing or failing git shows up here too, so going back
   * turns off before the presentation starts.
   */
  public static prepare(): void {
    void CheckpointService.run(
      'prepare the scene checkpoints',
      async (git) => {
        const started = Date.now();
        await git.prepare();
        Logger.info(`Scene checkpoints are ready (${Date.now() - started} ms)`);
      },
      // Saving the first checkpoint shows the error, when the presenter needs it
      () => undefined,
    );
  }

  /**
   * Snapshots the workspace before the scene runs.
   */
  public static async save(
    filePath: string,
    act: DemoConfig | ActConfig | null | undefined,
    idx: number,
  ): Promise<void> {
    const demo = getDemosFromConfig(act)[idx];
    if (!demo || !CheckpointService.isEnabled(act)) {
      return;
    }

    await CheckpointService.resolvePendingReset();
    await CheckpointService.run(
      `save the checkpoint of "${demo.title}"`,
      async (git) => {
        const started = Date.now();
        await workspace.saveAll(false);
        await git.snapshot(CheckpointService.getRef(filePath, demo, idx));
        Logger.info(`Checkpoint saved for scene "${demo.title}" (${Date.now() - started} ms)`);
      },
      (message) => {
        // Shown once: a presenter shouldn't get the same error at every scene
        if (!CheckpointService.saveErrorShown) {
          CheckpointService.saveErrorShown = true;
          Notifications.errorWithOutput(
            `Couldn't save the checkpoint of "${demo.title}": ${message}. Going back can't restore the files until checkpoints work again.`,
          );
        }
      },
    );
  }

  /**
   * Restores the workspace before going back to a scene. When the scene has no checkpoint yet, for
   * example because it was skipped, the nearest later checkpoint in the act is used.
   * @returns true when files were restored
   */
  public static async restore(
    filePath: string,
    act: DemoConfig | ActConfig | null | undefined,
    idx: number,
  ): Promise<boolean> {
    if (!CheckpointService.isEnabled(act)) {
      return false;
    }
    await CheckpointService.resolvePendingReset();
    const demos = getDemosFromConfig(act);
    const title = demos[idx]?.title;
    const candidates = demos
      .map((demo, demoIdx) => ({ demo, demoIdx }))
      .filter(({ demoIdx }) => demoIdx >= idx);

    const result = await CheckpointService.run(
      `restore the checkpoint of "${title}"`,
      async (git) => {
        for (const { demo, demoIdx } of candidates) {
          const ref = CheckpointService.getRef(filePath, demo, demoIdx);
          if (await CheckpointService.restoreRef(git, ref)) {
            CheckpointService.notify(`Restored the checkpoint of "${demo.title}"`);
            return true;
          }
        }
        Logger.info(`No checkpoint to restore for "${title}", the files stay as they are`);
        return false;
      },
      CheckpointService.showRestoreError(title),
    );
    return !!result;
  }

  /**
   * Restores the scene's own checkpoint, without falling back to a later one.
   */
  public static async restoreScene(filePath: string, demo: Demo, idx: number): Promise<boolean> {
    await CheckpointService.resolvePendingReset();
    const result = await CheckpointService.run(
      `restore the checkpoint of "${demo.title}"`,
      async (git) => {
        const restored = await CheckpointService.restoreRef(
          git,
          CheckpointService.getRef(filePath, demo, idx),
        );
        if (restored) {
          CheckpointService.notify(`Restored the checkpoint of "${demo.title}"`);
        } else {
          Logger.info(`No checkpoint to restore for "${demo.title}"`);
        }
        return restored;
      },
      CheckpointService.showRestoreError(demo.title),
    );
    return !!result;
  }

  /**
   * The scenes of the act files that have a checkpoint.
   */
  public static async getScenesWithCheckpoint(
    demoFiles: DemoFiles,
  ): Promise<{ filePath: string; idx: number; demo: Demo }[]> {
    const refs = new Set(
      (await CheckpointService.run(
        'list the checkpoints',
        (git) => git.sceneRefs(),
        (message) => Notifications.errorWithOutput(`Couldn't list the checkpoints: ${message}`),
      )) || [],
    );
    if (refs.size === 0) {
      return [];
    }

    return sortFiles(demoFiles).flatMap((filePath) =>
      getDemosFromConfig(demoFiles[filePath])
        .map((demo, idx) => ({ filePath, idx, demo }))
        .filter(({ demo, idx }) => refs.has(CheckpointService.getRef(filePath, demo, idx))),
    );
  }

  /**
   * Restores the files as they were before the first checkpoint and removes all checkpoints.
   * When that fails, the checkpoints are kept and the next scene asks to try again.
   * @returns true when the files were restored or there was nothing to restore
   */
  public static async reset(): Promise<boolean> {
    CheckpointService.questionClosed = false;
    const git = CheckpointService.getShadowGit();
    if (!git?.exists()) {
      await CheckpointService.setResetPending(false);
      if (!CheckpointService.healthy) {
        Logger.error(
          `Couldn't restore the files as they were before the play: ${CheckpointService.NOTHING_SAVED}`,
        );
        Notifications.errorWithOutput(
          `Couldn't restore your files as they were before the play: ${CheckpointService.NOTHING_SAVED}.`,
        );
      } else {
        Logger.info('No scene checkpoints to reset');
      }
      return true;
    }

    const done = await CheckpointService.run(
      'restore the files as they were before the play',
      async (shadow) => {
        if (await CheckpointService.restoreRef(shadow, ShadowGit.baselineRef)) {
          CheckpointService.notify('Restored the files as they were before the play started');
        } else {
          Logger.info('No checkpoint from before the play, the files stay as they are');
        }
        await shadow.clear();
        Logger.info('Removed the scene checkpoints');
        return true;
      },
      (message) => {
        Logger.warning(
          'The scene checkpoints are kept, so the files can still be restored: use Retry, or start the play again to choose.',
        );
        const retry = 'Retry';
        const output = 'Show output';
        Notifications.error(
          `Couldn't restore your files as they were before the play: ${message}`,
          retry,
          output,
        ).then((answer) => {
          if (answer === retry) {
            void CheckpointService.reset();
          } else if (answer === output) {
            void commands.executeCommand(COMMAND.showOutputChannel);
          }
        });
      },
    );
    await CheckpointService.setResetPending(!done);
    return !!done;
  }

  /**
   * After a reset that couldn't restore the files, asks what to do before the play runs again.
   */
  private static async resolvePendingReset(): Promise<void> {
    if (
      CheckpointService.questionClosed ||
      !Extension.getInstance().getState<boolean>(StateKeys.checkpointResetPending)
    ) {
      return;
    }
    // Two scenes started at once (a double press) share the same question
    if (!CheckpointService.pendingPrompt) {
      CheckpointService.pendingPrompt = CheckpointService.askAboutPendingReset().finally(() => {
        CheckpointService.pendingPrompt = undefined;
      });
    }
    await CheckpointService.pendingPrompt;
  }

  private static async askAboutPendingReset(): Promise<void> {
    const restore = 'Restore';
    const keep = 'Keep files';
    const answer = await window.showWarningMessage(
      "The last reset couldn't restore your files. Restore them now?",
      {
        modal: true,
        detail:
          'Restore puts the files back as they were before the play started. Keep files removes the checkpoints of the last run and starts from the files as they are now.',
      },
      restore,
      keep,
    );

    if (answer === restore) {
      Logger.info('Restoring the files of the last run, as asked after the failed reset');
      await CheckpointService.reset();
    } else if (answer === keep) {
      const removed = await CheckpointService.run(
        'remove the checkpoints of the last run',
        async (git) => {
          await git.clear();
          return true;
        },
        (message) =>
          Notifications.errorWithOutput(
            `Couldn't remove the checkpoints of the last run: ${message}`,
          ),
      );
      if (removed) {
        await CheckpointService.setResetPending(false);
        Logger.info('Kept the files and removed the checkpoints of the last run');
      }
    } else {
      CheckpointService.questionClosed = true;
      Logger.info(
        'No answer about the failed reset: the play goes on with the files as they are. The next reset restores them.',
      );
    }
  }

  private static async setResetPending(pending: boolean): Promise<void> {
    const ext = Extension.getInstance();
    if (!!ext.getState<boolean>(StateKeys.checkpointResetPending) !== pending) {
      await ext.setState(StateKeys.checkpointResetPending, pending || undefined);
    }
  }

  private static showRestoreError(title?: string): (message: string) => void {
    return (message) =>
      Notifications.errorWithOutput(
        `Couldn't restore the checkpoint of "${title}": ${message}. The scene runs on the files as they are.`,
      );
  }

  /**
   * Restores the files of a snapshot. Files open in VS Code are updated through their editor, so
   * the moves that run next see the restored content and not the content VS Code still has.
   */
  private static async restoreRef(git: ShadowGit, ref: string): Promise<boolean> {
    // Saving failed, so there is nothing to restore: that is an error, not a missing checkpoint
    if (!git.exists() && !CheckpointService.healthy) {
      throw new Error(CheckpointService.NOTHING_SAVED);
    }
    if (!(await git.hasRef(ref))) {
      return false;
    }
    const started = Date.now();

    await workspace.saveAll(false);
    const folder = Extension.getInstance().workspaceFolder;
    const openDocuments = new Map<string, TextDocument>();
    for (const document of workspace.textDocuments) {
      if (folder && document.uri.scheme === 'file' && !document.isClosed) {
        const path = relative(folder.uri.fsPath, document.uri.fsPath).split(sep).join('/');
        if (!path.startsWith('..')) {
          openDocuments.set(path, document);
        }
      }
    }

    const result = await git.restore(ref, (path) => openDocuments.has(path));
    if (result === false) {
      return false;
    }

    const updated = [
      ...result.written,
      ...result.skipped.filter((f) => f.content !== null).map((f) => f.path),
    ];
    const removed = [
      ...result.removed,
      ...result.skipped.filter((f) => f.content === null).map((f) => f.path),
    ];

    for (const file of result.skipped) {
      const document = openDocuments.get(file.path);
      if (!document) {
        continue;
      }

      if (file.content === null) {
        // Revert first, so closing a dirty editor doesn't ask to save it
        await CheckpointService.revert(document.uri);
        await CheckpointService.closeTabs(document.uri);
        await git.removeFile(file.path);
        continue;
      }

      await CheckpointService.restoreDocument(document, file.content);
      if (document.getText() !== file.content || document.isDirty) {
        Logger.warning(`The editor of ${file.path} doesn't show the restored content`);
      }
    }
    Logger.info(
      updated.length + removed.length === 0
        ? `No files changed since the checkpoint (${Date.now() - started} ms)`
        : `Files restored: ${updated.join(', ') || 'none'}. Files removed: ${removed.join(', ') || 'none'} (${Date.now() - started} ms)`,
    );
    return true;
  }

  /**
   * Puts the content in an open document and on disk, before the moves of the scene use it.
   */
  private static async restoreDocument(document: TextDocument, content: string): Promise<void> {
    const onDisk = existsSync(document.uri.fsPath)
      ? await readFile(document.uri.fsPath, 'utf8')
      : null;

    // The editor matches the file: edit and save it, which updates both right away
    if (!document.isDirty && onDisk === document.getText()) {
      if (document.getText() !== content) {
        const edit = new WorkspaceEdit();
        edit.replace(document.uri, CheckpointService.fullRange(document), content);
        await workspace.applyEdit(edit);
        await document.save();
      }
      return;
    }

    // The file changed on disk and VS Code didn't reload it yet, or the editor has changes it
    // couldn't save: saving fails, so write the file and wait for the editor to reload it
    await workspace.fs.writeFile(document.uri, Buffer.from(content, 'utf8'));
    if (document.isDirty) {
      await CheckpointService.revert(document.uri);
    }
    await CheckpointService.waitFor(() => !document.isDirty && document.getText() === content);
  }

  private static fullRange(document: TextDocument): Range {
    return new Range(document.positionAt(0), document.positionAt(document.getText().length));
  }

  private static async waitFor(condition: () => boolean, timeout = 3000): Promise<void> {
    const end = Date.now() + timeout;
    while (!condition() && Date.now() < end) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  private static async revert(uri: Uri): Promise<void> {
    await commands.executeCommand('workbench.action.files.revert', uri);
  }

  private static async closeTabs(uri: Uri): Promise<void> {
    const tabs = window.tabGroups.all
      .flatMap((group) => group.tabs)
      .filter((tab) => tab.input instanceof TabInputText && tab.input.uri.fsPath === uri.fsPath);
    if (tabs.length > 0) {
      await window.tabGroups.close(tabs, true);
    }
  }

  private static getRef(filePath: string, demo: Demo, idx: number): string {
    return ShadowGit.sceneRef(`${getRelPath(filePath)}#${demo.id ?? idx}`);
  }

  private static getShadowGit(): ShadowGit | null {
    if (CheckpointService.shadowGit === undefined) {
      const ext = Extension.getInstance();
      const folder = ext.workspaceFolder;
      const storage = ext.context.storageUri;
      CheckpointService.shadowGit =
        folder && storage
          ? new ShadowGit(Uri.joinPath(storage, 'checkpoints').fsPath, folder.uri.fsPath)
          : null;
    }
    return CheckpointService.shadowGit;
  }

  /**
   * Runs the git work one at a time. A failure is logged and reported with `onError`; the scene
   * still runs.
   */
  private static run<T>(
    description: string,
    task: (git: ShadowGit) => Promise<T>,
    onError: (message: string) => void,
  ): Promise<T | undefined> {
    const git = CheckpointService.getShadowGit();
    if (!git) {
      return Promise.resolve(undefined);
    }

    const next = CheckpointService.queue.then(async () => {
      try {
        const result = await task(git);
        CheckpointService.setHealthy(true);
        return result;
      } catch (error) {
        const message = ((error as Error)?.message || String(error)).split('\n')[0];
        Logger.error(`Couldn't ${description}: ${message}`);
        CheckpointService.setHealthy(false);
        onError(message);
        return undefined;
      }
    });
    CheckpointService.queue = next;
    return next;
  }

  private static setHealthy(healthy: boolean) {
    if (CheckpointService.healthy !== healthy) {
      CheckpointService.healthy = healthy;
      if (!healthy) {
        Logger.warning('Scene checkpoints fail: going back no longer turns on by itself');
      }
      CheckpointService.healthListeners.forEach((listener) => listener());
    }
  }

  /**
   * Logs the full message, and keeps the status bar message short.
   */
  private static notify(message: string) {
    Logger.info(message);
    window.setStatusBarMessage('$(history) Restored', 3000);
  }
}
