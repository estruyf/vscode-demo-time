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

    expect(await shadow.restore(ShadowGit.sceneRef('act.json#scene-1'))).toBe(true);
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

  it('removes all snapshots when cleared', async () => {
    await shadow.snapshot(ShadowGit.sceneRef('scene-1'));
    await shadow.clear();
    expect(shadow.exists()).toBe(false);
  });
});
