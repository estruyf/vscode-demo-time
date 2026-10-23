import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { appendFile, mkdir, readdir, readFile, rm, rmdir, writeFile } from 'fs/promises';
import { devNull } from 'os';
import { dirname, join } from 'path';

type GitError = Error & { exitCode?: number | null };

const REF_PREFIX = 'refs/demotime';
const BASELINE_REF = `${REF_PREFIX}/baseline`;
// The `.demo` folder holds the play itself: acts, slides and notes edited while testing are kept
const DEFAULT_EXCLUDES = ['/.demo/', 'node_modules/', '.DS_Store'];
// Store the bytes as they are: the folder's `.gitattributes` could convert line endings or encodings
const ATTRIBUTES = '* -text -ident -filter -working-tree-encoding\n';

export interface RestoreResult {
  /** Files written from the snapshot */
  written: string[];
  /** Files removed because the snapshot doesn't have them */
  removed: string[];
  /** Files the caller restores itself */
  skipped: RestoredFile[];
}

export interface RestoredFile {
  /** Path relative to the work tree, with forward slashes */
  path: string;
  /** The content of the file in the snapshot, or null when the snapshot doesn't have the file */
  content: string | null;
}

/**
 * Snapshots the files of a folder in a git repository that lives outside of it. The folder's own
 * git repository (if any) is never touched: no commits, branches, refs or index changes. The
 * user's global and system git config are not used either, so commits are never signed and hooks
 * never run. Files ignored by the folder's `.gitignore` are not part of the snapshots.
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
   * Creates the repository and hashes the current files, so the first snapshot only has to store
   * what changed since. Doesn't create a snapshot.
   */
  public async prepare(): Promise<void> {
    await this.init();
    await this.git(['add', '--all', '--', '.']);
  }

  /**
   * Snapshots the current files under the given ref. The first snapshot is also stored as the
   * baseline, the state to go back to when the play gets reset.
   *
   * Every git call starts a process, which is what makes a snapshot slow: the refs point to the
   * tree of the files (no commit needed) and are written in one call.
   */
  public async snapshot(ref: string): Promise<void> {
    await this.init();
    await this.git(['add', '--all', '--', '.']);
    const tree = await this.git(['write-tree']);
    const refs = [ref];
    if (!(await this.hasRef(BASELINE_REF))) {
      refs.push(BASELINE_REF);
    }
    await this.git(
      ['update-ref', '--stdin'],
      refs.map((name) => `update ${name} ${tree}\n`).join(''),
    );
  }

  /**
   * Puts the files back as they were in the snapshot of the ref. Files created after the snapshot
   * are removed, and folders they leave empty too.
   * @param skip - Files that the caller restores itself, like files open in an editor. They are
   *   returned with their content in the snapshot.
   * @returns false when there is no snapshot for the ref
   */
  public async restore(
    ref: string,
    skip: (path: string) => boolean = () => false,
  ): Promise<RestoreResult | false> {
    if (!(await this.hasRef(ref))) {
      return false;
    }

    await this.init();
    // Track the current files, so the diff also lists the ones the snapshot doesn't have
    await this.git(['add', '--all', '--', '.']);
    const changes = await this.changes(ref);

    const toWrite = changes.filter((c) => !c.removed && !skip(c.path)).map((c) => c.path);
    if (toWrite.length > 0) {
      await this.git(
        ['checkout', '--pathspec-from-file=-', '--pathspec-file-nul', ref],
        toWrite.join('\0'),
      );
    }

    // A file that the ignore rules of the snapshot exclude was already there but not part of it, like
    // a `.env` file whose ignore rule got removed since
    const ignored = await this.ignored(changes.filter((c) => c.removed).map((c) => c.path));
    const kept = changes.filter((c) => !(c.removed && ignored.has(c.path)));

    const removed = kept.filter((c) => c.removed && !skip(c.path)).map((c) => c.path);
    for (const path of removed) {
      await this.removeFile(path);
    }

    const skipped: RestoredFile[] = [];
    for (const change of kept.filter((c) => skip(c.path))) {
      skipped.push({
        path: change.path,
        content: change.removed
          ? null
          : await this.git(['show', `${ref}:${change.path}`], '', true),
      });
    }
    return { written: toWrite, removed, skipped };
  }

  /**
   * Removes a file and the folders it leaves empty.
   */
  public async removeFile(path: string): Promise<void> {
    await rm(join(this.workTree, path), { force: true });
    let dir = dirname(path);
    while (dir && dir !== '.' && dir !== '/') {
      const full = join(this.workTree, dir);
      if (!existsSync(full) || (await readdir(full)).length > 0) {
        break;
      }
      await rmdir(full);
      dir = dirname(dir);
    }
  }

  /**
   * Reads the ref file instead of starting git: refs are never packed, as the repository has no
   * garbage collection. A git that fails shows up in the git calls of the restore itself.
   */
  public async hasRef(ref: string): Promise<boolean> {
    if (!this.exists()) {
      return false;
    }
    const file = join(this.gitDir, ...ref.split('/'));
    return existsSync(file) && /^[0-9a-f]{40,64}\s*$/.test(await readFile(file, 'utf8'));
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

  /**
   * The files that differ between the snapshot and the index.
   */
  private async changes(ref: string): Promise<{ path: string; removed: boolean }[]> {
    const output = await this.git(
      ['diff-index', '--cached', '--no-renames', '--name-status', '-z', ref],
      '',
      true,
    );
    const parts = output.split('\0').filter(Boolean);
    const changes: { path: string; removed: boolean }[] = [];
    for (let i = 0; i + 1 < parts.length; i += 2) {
      // Added to the index since the snapshot: the restore removes it
      changes.push({ path: parts[i + 1], removed: parts[i] === 'A' });
    }
    return changes;
  }

  /**
   * The files that the ignore rules in the work tree exclude, also when they are in the index.
   */
  private async ignored(paths: string[]): Promise<Set<string>> {
    if (paths.length === 0) {
      return new Set();
    }

    try {
      const output = await this.git(
        ['check-ignore', '--no-index', '--stdin', '-z'],
        paths.join('\0'),
        true,
        // Takes paths instead of pathspecs, and fails with the literal pathspecs variable
        false,
      );
      return new Set(output.split('\0').filter(Boolean));
    } catch (error) {
      // Exits with 1 when none of the files are ignored
      if ((error as GitError).exitCode === 1) {
        return new Set();
      }
      throw error;
    }
  }

  private async init(): Promise<void> {
    const excludes = `${DEFAULT_EXCLUDES.join('\n')}\n`;
    if (!this.exists()) {
      await mkdir(this.gitDir, { recursive: true });
      await this.git(['init', '--quiet']);
      // Written directly: a `git config` call per setting would start three more processes
      await appendFile(
        join(this.gitDir, 'config'),
        '[core]\n\tautocrlf = false\n\tsafecrlf = false\n[gc]\n\tauto = 0\n',
      );
    }

    // Also update the files of checkpoints made by an earlier version
    await this.writeInfoFile('exclude', excludes);
    await this.writeInfoFile('attributes', ATTRIBUTES);
  }

  private async writeInfoFile(name: string, content: string): Promise<void> {
    const file = join(this.gitDir, 'info', name);
    const current = existsSync(file) ? await readFile(file, 'utf8') : '';
    if (current !== content) {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, content);
    }
  }

  private git(args: string[], input = '', raw = false, literalPathspecs = true): Promise<string> {
    return new Promise((resolve, reject) => {
      // Variables like `GIT_INDEX_FILE` or `GIT_COMMON_DIR`, set when VS Code runs from a git hook,
      // would point git to the folder's own repository
      const env: NodeJS.ProcessEnv = {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
        ),
        GIT_DIR: this.gitDir,
        GIT_WORK_TREE: this.workTree,
        // The user's config can sign commits, run an fsmonitor or point to hooks
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: devNull,
        GIT_LITERAL_PATHSPECS: '1',
        GIT_AUTHOR_NAME: 'Demo Time',
        GIT_AUTHOR_EMAIL: 'checkpoints@demotime.show',
        GIT_COMMITTER_NAME: 'Demo Time',
        GIT_COMMITTER_EMAIL: 'checkpoints@demotime.show',
        GIT_TERMINAL_PROMPT: '0',
      };
      if (!literalPathspecs) {
        delete env.GIT_LITERAL_PATHSPECS;
      }

      const child = spawn('git', args, { cwd: this.workTree, env });
      const stdout: Buffer[] = [];
      let stderr = '';
      child.stdout.on('data', (data: Buffer) => stdout.push(data));
      child.stderr.on('data', (data) => (stderr += data.toString()));
      child.on('error', (error) => reject(error));
      child.on('close', (code) => {
        if (code !== 0) {
          const error: GitError = new Error(
            stderr.trim() || `git ${args[0]} exited with code ${code}`,
          );
          error.exitCode = code;
          reject(error);
          return;
        }
        const output = Buffer.concat(stdout).toString('utf8');
        resolve(raw ? output : output.trim());
      });
      // Without git, writing to stdin fails as well; the spawn error already rejects
      child.stdin.on('error', () => undefined);
      child.stdin.end(input);
    });
  }
}
