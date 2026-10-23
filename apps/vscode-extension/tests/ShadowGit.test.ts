import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ShadowGit } from '../src/utils/ShadowGit';

describe('ShadowGit', () => {
  let root: string;
  let workTree: string;
  let shadow: ShadowGit;

  const write = (file: string, content: string) => writeFileSync(join(workTree, file), content);
  const read = (file: string) => readFileSync(join(workTree, file), 'utf8');

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'demotime-shadowgit-'));
    workTree = join(root, 'workspace');
    mkdirSync(workTree);
    shadow = new ShadowGit(join(root, 'storage', 'checkpoints'), workTree);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('restores changed, deleted and created files', async () => {
    write('index.ts', 'original');
    write('remove-me.ts', 'keep');
    await shadow.snapshot(ShadowGit.sceneRef('act.json#scene-1'));

    write('index.ts', 'changed');
    rmSync(join(workTree, 'remove-me.ts'));
    write('new.ts', 'created during the demo');

    expect(await shadow.restore(ShadowGit.sceneRef('act.json#scene-1'))).toEqual({
      written: ['remove-me.ts', 'index.ts'].sort(),
      removed: ['new.ts'],
      skipped: [],
    });
    expect(read('index.ts')).toBe('original');
    expect(read('remove-me.ts')).toBe('keep');
    expect(existsSync(join(workTree, 'new.ts'))).toBe(false);
  });

  it('keeps the first snapshot as the baseline', async () => {
    write('index.ts', 'start');
    await shadow.snapshot(ShadowGit.sceneRef('scene-1'));
    write('index.ts', 'scene 2');
    await shadow.snapshot(ShadowGit.sceneRef('scene-2'));
    write('index.ts', 'end');

    await shadow.restore(ShadowGit.baselineRef);
    expect(read('index.ts')).toBe('start');
    await shadow.restore(ShadowGit.sceneRef('scene-2'));
    expect(read('index.ts')).toBe('scene 2');
  });

  it('returns false without a snapshot', async () => {
    expect(await shadow.restore(ShadowGit.sceneRef('unknown'))).toBe(false);
    await shadow.snapshot(ShadowGit.sceneRef('scene-1'));
    expect(await shadow.restore(ShadowGit.sceneRef('unknown'))).toBe(false);
  });

  it('leaves ignored files alone', async () => {
    write('.gitignore', 'dist/\n');
    mkdirSync(join(workTree, 'dist'));
    write('dist/out.js', 'build 1');
    await shadow.snapshot(ShadowGit.sceneRef('scene-1'));

    write('dist/out.js', 'build 2');
    await shadow.restore(ShadowGit.sceneRef('scene-1'));
    expect(read('dist/out.js')).toBe('build 2');
  });

  it("never touches the folder's own git repository", async () => {
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: workTree, encoding: 'utf8' }).trim();
    git('init', '--quiet');
    write('index.ts', 'committed');
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@test', 'commit', '--quiet', '-m', 'init');
    const head = git('rev-parse', 'HEAD');

    write('index.ts', 'work in progress');
    await shadow.snapshot(ShadowGit.sceneRef('scene-1'));
    write('index.ts', 'demo change');
    await shadow.restore(ShadowGit.sceneRef('scene-1'));

    expect(read('index.ts')).toBe('work in progress');
    expect(git('rev-parse', 'HEAD')).toBe(head);
    expect(git('for-each-ref', '--format=%(refname)')).toBe(
      'refs/heads/' + git('branch', '--show-current'),
    );
    expect(git('status', '--porcelain')).toBe('M index.ts');
  });

  it('returns the skipped files with their snapshot content', async () => {
    mkdirSync(join(workTree, 'src'));
    write('src/open.ts', 'original');
    write('src/closed.ts', 'original');
    await shadow.snapshot(ShadowGit.sceneRef('scene-1'));

    write('src/open.ts', 'changed');
    write('src/closed.ts', 'changed');
    write('src/new-open.ts', 'created');

    const skipped = await shadow.restore(
      ShadowGit.sceneRef('scene-1'),
      (path) => path !== 'src/closed.ts',
    );
    expect(skipped && skipped.skipped).toEqual([
      { path: 'src/new-open.ts', content: null },
      { path: 'src/open.ts', content: 'original' },
    ]);
    expect(read('src/closed.ts')).toBe('original');
    expect(read('src/open.ts')).toBe('changed');
  });

  it('removes folders that created files leave empty', async () => {
    write('index.ts', 'start');
    await shadow.snapshot(ShadowGit.sceneRef('scene-1'));
    mkdirSync(join(workTree, 'src', 'nested'), { recursive: true });
    write('src/nested/app.ts', 'created');

    await shadow.restore(ShadowGit.sceneRef('scene-1'));
    expect(existsSync(join(workTree, 'src'))).toBe(false);
  });

  it('leaves the .demo folder alone', async () => {
    mkdirSync(join(workTree, '.demo'));
    write('.demo/act.yaml', 'version 1');
    await shadow.snapshot(ShadowGit.sceneRef('scene-1'));

    write('.demo/act.yaml', 'edited while testing');
    write('.demo/new-slide.md', 'new');
    await shadow.restore(ShadowGit.sceneRef('scene-1'));
    expect(read('.demo/act.yaml')).toBe('edited while testing');
    expect(read('.demo/new-slide.md')).toBe('new');
  });

  it("ignores the user's git config, like commit signing", async () => {
    const config = join(root, 'gitconfig');
    writeFileSync(config, '[commit]\n  gpgsign = true\n[gpg]\n  program = false\n');
    const previous = process.env.GIT_CONFIG_GLOBAL;
    process.env.GIT_CONFIG_GLOBAL = config;
    try {
      write('index.ts', 'start');
      await shadow.snapshot(ShadowGit.sceneRef('scene-1'));
      expect(await shadow.hasRef(ShadowGit.sceneRef('scene-1'))).toBe(true);
    } finally {
      if (previous === undefined) {
        delete process.env.GIT_CONFIG_GLOBAL;
      } else {
        process.env.GIT_CONFIG_GLOBAL = previous;
      }
    }
  });

  it("doesn't mistake a failing git for a missing checkpoint", async () => {
    await shadow.snapshot(ShadowGit.sceneRef('scene-1'));
    const previous = process.env.PATH;
    process.env.PATH = '';
    try {
      await expect(shadow.restore(ShadowGit.sceneRef('scene-1'))).rejects.toThrow();
    } finally {
      process.env.PATH = previous;
    }
  });

  it('prepares without creating a snapshot', async () => {
    write('index.ts', 'start');
    await shadow.prepare();
    expect(shadow.exists()).toBe(true);
    expect(await shadow.hasRef(ShadowGit.baselineRef)).toBe(false);
    expect(await shadow.sceneRefs()).toEqual([]);
  });

  it('restores snapshots made by an earlier version, which point to commits', async () => {
    write('index.ts', 'start');
    await shadow.snapshot(ShadowGit.sceneRef('scene-1'));
    const gitDir = join(root, 'storage', 'checkpoints');
    const env = { ...process.env, GIT_DIR: gitDir, GIT_WORK_TREE: workTree };
    const run = (...args: string[]) =>
      execFileSync('git', args, { cwd: workTree, env, encoding: 'utf8' }).trim();
    const commit = run(
      '-c',
      'user.name=t',
      '-c',
      'user.email=t@t',
      '-c',
      'commit.gpgsign=false',
      'commit-tree',
      ShadowGit.sceneRef('scene-1'),
      '-m',
      'old',
    );
    run('update-ref', ShadowGit.sceneRef('old'), commit);

    write('index.ts', 'changed');
    await shadow.restore(ShadowGit.sceneRef('old'));
    expect(read('index.ts')).toBe('start');
  });

  it('removes all snapshots when cleared', async () => {
    await shadow.snapshot(ShadowGit.sceneRef('scene-1'));
    await shadow.clear();
    expect(shadow.exists()).toBe(false);
  });
});
