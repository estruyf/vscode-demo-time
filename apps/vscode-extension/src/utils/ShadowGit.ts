import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';

const REF_PREFIX = 'refs/demotime';
const BASELINE_REF = `${REF_PREFIX}/baseline`;
const DEFAULT_EXCLUDES = ['node_modules/', '.DS_Store'];

/**
 * Snapshots the files of a folder in a git repository that lives outside of it. The folder's own
 * git repository (if any) is never touched: no commits, branches, refs or index changes.
 * Files ignored by the folder's `.gitignore` are not part of the snapshots.
 */
export class ShadowGit {
  constructor(
    private readonly gitDir: string,
    private readonly workTree: string,
  ) {}

  public static sceneRef(key: string): string {
    // Keep the ref name valid whatever the act path or scene id contains
    return `${REF_PREFIX}/scenes/${Buffer.from(key).toString('base64url')}`;
  }

  public static get baselineRef(): string {
    return BASELINE_REF;
  }

  public exists(): boolean {
    return existsSync(join(this.gitDir, 'HEAD'));
  }

  /**
   * Snapshots the current files under the given ref. The first snapshot is also stored as the
   * baseline, the state to go back to when the play gets reset.
   */
  public async snapshot(ref: string): Promise<void> {
    await this.init();
    const commit = await this.capture(ref);
    if (!(await this.hasRef(BASELINE_REF))) {
      await this.git(['update-ref', BASELINE_REF, commit]);
    }
    await this.git(['update-ref', ref, commit]);
  }

  /**
   * Puts the files back as they were in the snapshot of the ref. Files created after the snapshot
   * are removed.
   * @returns false when there is no snapshot for the ref
   */
  public async restore(ref: string): Promise<boolean> {
    if (!(await this.hasRef(ref))) {
      return false;
    }

    // Track the current files, so read-tree knows which ones the snapshot doesn't have
    await this.git(['add', '--all', '--', '.']);
    await this.git(['read-tree', '--reset', '-u', `${ref}^{commit}`]);
    return true;
  }

  public async hasRef(ref: string): Promise<boolean> {
    if (!this.exists()) {
      return false;
    }

    try {
      await this.git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * The refs of all scene snapshots.
   */
  public async sceneRefs(): Promise<string[]> {
    if (!this.exists()) {
      return [];
    }

    const output = await this.git(['for-each-ref', '--format=%(refname)', `${REF_PREFIX}/scenes`]);
    return output ? output.split('\n') : [];
  }

  /**
   * Removes all snapshots.
   */
  public async clear(): Promise<void> {
    await rm(this.gitDir, { recursive: true, force: true });
  }

  private async init(): Promise<void> {
    if (this.exists()) {
      return;
    }

    await mkdir(this.gitDir, { recursive: true });
    await this.git(['init', '--quiet']);
    await this.git(['config', 'core.autocrlf', 'false']);
    await this.git(['config', 'core.safecrlf', 'false']);
    await this.git(['config', 'gc.auto', '0']);
    await mkdir(join(this.gitDir, 'info'), { recursive: true });
    await writeFile(join(this.gitDir, 'info', 'exclude'), `${DEFAULT_EXCLUDES.join('\n')}\n`);
  }

  private async capture(message: string): Promise<string> {
    await this.git(['add', '--all', '--', '.']);
    const tree = await this.git(['write-tree']);
    return await this.git(['commit-tree', tree, '-m', message]);
  }

  private git(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        GIT_DIR: this.gitDir,
        GIT_WORK_TREE: this.workTree,
        GIT_AUTHOR_NAME: 'Demo Time',
        GIT_AUTHOR_EMAIL: 'checkpoints@demotime.show',
        GIT_COMMITTER_NAME: 'Demo Time',
        GIT_COMMITTER_EMAIL: 'checkpoints@demotime.show',
        GIT_TERMINAL_PROMPT: '0',
      };
      // These would point git to the folder's own repository
      delete env.GIT_INDEX_FILE;
      delete env.GIT_OBJECT_DIRECTORY;
      delete env.GIT_ALTERNATE_OBJECT_DIRECTORIES;

      const child = spawn('git', args, { cwd: this.workTree, env });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (data) => (stdout += data.toString()));
      child.stderr.on('data', (data) => (stderr += data.toString()));
      child.on('error', (error) => reject(error));
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr.trim() || `git ${args[0]} exited with code ${code}`));
          return;
        }
        resolve(stdout.trim());
      });
    });
  }
}
