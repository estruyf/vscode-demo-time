import { Uri, window, workspace } from 'vscode';
import {
  ActConfig,
  Config,
  Demo,
  DemoConfig,
  DemoFiles,
  getDemosFromConfig,
} from '@demotime/common';
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
  private static queue: Promise<unknown> = Promise.resolve();
  private static failed = false;

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

    await CheckpointService.run(`save the checkpoint of "${demo.title}"`, async (git) => {
      await workspace.saveAll(false);
      await git.snapshot(CheckpointService.getRef(filePath, demo, idx));
      Logger.info(`Checkpoint saved for scene "${demo.title}"`);
    });
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
    const demos = getDemosFromConfig(act);
    const candidates = demos
      .map((demo, demoIdx) => ({ demo, demoIdx }))
      .filter(({ demoIdx }) => demoIdx >= idx);

    const result = await CheckpointService.run(
      `restore the checkpoint of "${demos[idx]?.title}"`,
      async (git) => {
        for (const { demo, demoIdx } of candidates) {
          const ref = CheckpointService.getRef(filePath, demo, demoIdx);
          if (await git.hasRef(ref)) {
            await workspace.saveAll(false);
            await git.restore(ref);
            CheckpointService.notify(`Restored the checkpoint of "${demo.title}"`);
            return true;
          }
        }
        return false;
      },
    );
    return !!result;
  }

  /**
   * Restores the scene's own checkpoint, without falling back to a later one.
   */
  public static async restoreScene(filePath: string, demo: Demo, idx: number): Promise<boolean> {
    const result = await CheckpointService.run(
      `restore the checkpoint of "${demo.title}"`,
      async (git) => {
        await workspace.saveAll(false);
        const restored = await git.restore(CheckpointService.getRef(filePath, demo, idx));
        if (restored) {
          CheckpointService.notify(`Restored the checkpoint of "${demo.title}"`);
        }
        return restored;
      },
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
      (await CheckpointService.run('list the checkpoints', (git) => git.sceneRefs())) || [],
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
   */
  public static async reset(): Promise<void> {
    const git = CheckpointService.getShadowGit();
    if (!git?.exists()) {
      return;
    }

    await CheckpointService.run('reset the checkpoints', async (shadow) => {
      await workspace.saveAll(false);
      if (await shadow.restore(ShadowGit.baselineRef)) {
        CheckpointService.notify('Restored the files as they were before the play started');
      }
      await shadow.clear();
    });
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
   * Runs the git work one at a time. A failure is shown once; the scene still runs.
   */
  private static run<T>(
    description: string,
    task: (git: ShadowGit) => Promise<T>,
  ): Promise<T | undefined> {
    const git = CheckpointService.getShadowGit();
    if (!git) {
      return Promise.resolve(undefined);
    }

    const next = CheckpointService.queue.then(async () => {
      try {
        return await task(git);
      } catch (error) {
        const message = (error as Error)?.message || String(error);
        Logger.error(`Couldn't ${description}: ${message}`);
        if (!CheckpointService.failed) {
          CheckpointService.failed = true;
          Notifications.errorWithOutput(
            `Couldn't ${description}. Scene checkpoints need git to be installed.`,
          );
        }
        return undefined;
      }
    });
    CheckpointService.queue = next;
    return next;
  }

  private static notify(message: string) {
    Logger.info(message);
    window.setStatusBarMessage(`$(history) ${message}`, 3000);
  }
}
