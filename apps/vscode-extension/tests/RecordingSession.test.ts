import { describe, it, expect, beforeEach } from '@jest/globals';
import { applyPatch } from 'diff';
import { RecordingSession, getRecordedHighlightPosition } from '../src/services/RecordingSession';

let artifacts: Record<string, string>;
let session: RecordingSession;

const actions = (moves: { action: string; path?: string }[]) =>
  moves.map((move) => (move.path ? `${move.action} ${move.path}` : move.action));

beforeEach(() => {
  artifacts = {};
  session = new RecordingSession({
    writeSnapshot: async (name, content) => {
      artifacts[`/snapshots/${name}`] = content;
      return `/snapshots/${name}`;
    },
    writePatch: async (name, content) => {
      artifacts[`/patches/${name}`] = content;
      return `/patches/${name}`;
    },
  });
});

describe('getRecordedHighlightPosition', () => {
  it('returns a single line for a cursor or a selection on one line', () => {
    expect(getRecordedHighlightPosition(0, 0, 0)).toBe(1);
    expect(getRecordedHighlightPosition(4, 4, 10)).toBe(5);
  });

  it('returns a line range for a multi-line selection', () => {
    expect(getRecordedHighlightPosition(0, 2, 5)).toBe('1:3');
  });

  it('leaves out the line a selection ends at the start of', () => {
    expect(getRecordedHighlightPosition(0, 3, 0)).toBe('1:3');
    expect(getRecordedHighlightPosition(2, 3, 0)).toBe(3);
  });
});

describe('RecordingSession', () => {
  it('records a new file with create, open, applyPatch, save and highlight', async () => {
    session.fileCreated('/src/app.ts');
    await session.fileActivated('/src/app.ts', '');
    session.fileChanged('/src/app.ts', 'const a = 1;\n');
    await session.fileSaved('/src/app.ts', 'const a = 1;\n', true);
    await session.highlight('/src/app.ts', 'const a = 1;\n', 1);

    const scenes = await session.finish();
    expect(scenes).toHaveLength(1);
    expect(actions(scenes[0].moves)).toEqual([
      'create /src/app.ts',
      'open /src/app.ts',
      'applyPatch /src/app.ts',
      'save',
      'highlight /src/app.ts',
    ]);

    const patchMove = scenes[0].moves[2];
    const snapshot = artifacts[patchMove.contentPath!];
    expect(applyPatch(snapshot, artifacts[patchMove.patch!])).toBe('const a = 1;\n');
  });

  it('opens a file again when you return to it', async () => {
    await session.fileActivated('/src/existing.ts', 'old\n');
    session.fileCreated('/src/app.ts');
    await session.fileActivated('/src/app.ts', '');
    session.fileChanged('/src/app.ts', 'app\n');
    await session.fileActivated('/src/existing.ts', 'old\n');
    session.fileChanged('/src/existing.ts', 'new\n');

    const scenes = await session.finish();
    expect(actions(scenes[0].moves)).toEqual([
      'open /src/existing.ts',
      'create /src/app.ts',
      'open /src/app.ts',
      'applyPatch /src/app.ts',
      'open /src/existing.ts',
      'applyPatch /src/existing.ts',
    ]);
  });

  it('opens a file that changes in the background before its patch', async () => {
    await session.fileActivated('/a.ts', 'a\n');
    session.fileChanged('/a.ts', 'a1\n');
    session.fileChanged('/b.ts', 'b\n');
    session.fileChanged('/b.ts', 'b1\n');
    await session.splitMove();
    session.fileChanged('/a.ts', 'a2\n');

    const scenes = await session.finish();
    expect(actions(scenes[0].moves)).toEqual([
      'open /a.ts',
      'applyPatch /a.ts',
      'open /b.ts',
      'applyPatch /b.ts',
      'open /a.ts',
      'applyPatch /a.ts',
    ]);
  });

  it('does not open a file again when nothing else was shown in between', async () => {
    await session.fileActivated('/a.ts', 'a\n');
    session.fileCreated('/b.ts');
    await session.fileActivated('/b.ts', '');
    await session.fileActivated('/a.ts', 'a\n');
    session.fileChanged('/a.ts', 'a1\n');

    const scenes = await session.finish();
    expect(actions(scenes[0].moves)).toEqual(['open /a.ts', 'applyPatch /a.ts']);
  });

  it('records the content of a file that was created with content', async () => {
    session.fileCreated('/cli.json', true);
    await session.fileActivated('/cli.json', '{}\n');

    const scenes = await session.finish();
    expect(actions(scenes[0].moves)).toEqual([
      'create /cli.json',
      'open /cli.json',
      'applyPatch /cli.json',
    ]);
  });

  it('does not mark a known file as new when the file watcher reports it', async () => {
    await session.fileActivated('/a.ts', 'a\n');
    session.fileCreated('/a.ts', true);
    session.fileChanged('/a.ts', 'a1\n');

    const scenes = await session.finish();
    expect(actions(scenes[0].moves)).toEqual(['open /a.ts', 'applyPatch /a.ts']);
  });

  it('only records the save without a save move when saves are not captured', async () => {
    await session.fileActivated('/a.ts', 'a\n');
    session.fileChanged('/a.ts', 'a1\n');
    await session.fileSaved('/a.ts', 'a1\n', false);
    session.fileChanged('/a.ts', 'a2\n');

    const scenes = await session.finish();
    expect(actions(scenes[0].moves)).toEqual([
      'open /a.ts',
      'applyPatch /a.ts',
      'applyPatch /a.ts',
    ]);
  });

  it('starts a new scene with its title and opens the file again', async () => {
    await session.fileActivated('/a.ts', 'a\n');
    session.fileChanged('/a.ts', 'a1\n');
    await session.newScene('Second');
    session.fileChanged('/a.ts', 'a2\n');
    await session.newScene('');
    await session.highlight('/a.ts', 'a2\n', 1);

    const scenes = await session.finish();
    expect(scenes.map((scene) => scene.title)).toEqual(['Scene 1', 'Second', 'Scene 3']);
    expect(actions(scenes[1].moves)).toEqual(['open /a.ts', 'applyPatch /a.ts']);
    expect(actions(scenes[2].moves)).toEqual(['open /a.ts', 'highlight /a.ts']);
  });

  it('skips empty scenes and files without changes', async () => {
    await session.newScene('Empty');
    session.fileChanged('/a.ts', 'a\n');
    await session.splitMove();

    expect(await session.finish()).toEqual([]);
  });
});
