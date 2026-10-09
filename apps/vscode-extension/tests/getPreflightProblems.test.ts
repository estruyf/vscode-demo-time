import { describe, it, expect } from '@jest/globals';
import { createPatch } from 'diff';
import {
  findYamlLocation,
  getPreflightProblems,
  PreflightHost,
} from '../src/utils/getPreflightProblems';

const host = (
  files: Record<string, string> = {},
  variables?: Record<string, unknown>,
): PreflightHost => ({
  fileExists: async (path) => path in files,
  readFile: async (path) => files[path],
  isInWorkspace: (path) => !path.startsWith('..'),
  variables,
});

const act = (moves: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify(
    { version: 3, title: 'Act', scenes: [{ title: 'Scene', moves, ...extra }] },
    null,
    2,
  );

const problems = async (
  acts: string | string[],
  files?: Record<string, string>,
  variables?: Record<string, unknown>,
) => {
  const contents = Array.isArray(acts) ? acts : [acts];
  const results = await getPreflightProblems(
    contents.map((content, idx) => ({ filePath: `.demo/act${idx}.json`, content })),
    host(files, variables),
  );
  return results.flatMap((result) =>
    result.problems.map(({ code, severity, line }) => ({ code, severity, line })),
  );
};

describe('getPreflightProblems', () => {
  it('reports a missing file at the path property', async () => {
    const content = act([{ action: 'open', path: 'src/missing.ts' }]);
    const line = content.split('\n').findIndex((l) => l.includes('"path"'));

    expect(await problems(content)).toEqual([
      { code: 'preflight-missing-file', severity: 'error', line },
    ]);
  });

  it('returns the path of a missing file, so it can be created', async () => {
    const content = JSON.stringify({
      title: 'Act',
      demos: [
        {
          title: 'Demo',
          steps: [{ action: 'create', path: 'a.ts', contentPath: './content/a.ts' }],
        },
      ],
    });
    const result = await getPreflightProblems([{ filePath: '.demo/act.json', content }], host());

    expect(result[0].problems).toEqual([
      expect.objectContaining({
        code: 'preflight-missing-file',
        missingFile: '.demo/content/a.ts',
      }),
    ]);
  });

  it('does not offer to create a file that an earlier move deletes', async () => {
    const content = act([
      { action: 'deleteFile', path: 'a.ts' },
      { action: 'open', path: 'a.ts' },
    ]);
    const result = await getPreflightProblems(
      [{ filePath: 'act.json', content }],
      host({ 'a.ts': '' }),
    );

    expect(result[0].problems).toHaveLength(1);
    expect(result[0].problems[0].code).toBe('preflight-missing-file');
    expect(result[0].problems[0].missingFile).toBeUndefined();
  });

  it('accepts files that exist', async () => {
    const content = act([
      { action: 'open', path: 'src/app.ts' },
      { action: 'insert', path: 'src/app.ts', contentPath: '.demo/content/app.ts', position: 1 },
      {
        action: 'applyPatch',
        path: 'src/app.ts',
        contentPath: '.demo/snapshot',
        patch: '.demo/patch',
      },
    ]);
    const files = {
      'src/app.ts': '',
      '.demo/content/app.ts': '',
      '.demo/snapshot': '',
      '.demo/patch': '',
    };

    expect(await problems(content, files)).toEqual([]);
  });

  it('follows the files that earlier moves create, move and delete', async () => {
    const first = act([
      { action: 'create', path: 'src/new.ts', content: '' },
      { action: 'copy', path: 'src/new.ts', dest: 'src/copy.ts' },
      { action: 'rename', path: 'src/app.ts', dest: 'src/main.ts' },
    ]);
    const second = act([
      { action: 'open', path: 'src/new.ts' },
      { action: 'open', path: 'src/copy.ts' },
      { action: 'open', path: 'src/main.ts' },
      { action: 'open', path: 'src/app.ts' },
    ]);

    expect(await problems([first, second], { 'src/app.ts': '' })).toEqual([
      expect.objectContaining({ code: 'preflight-missing-file', severity: 'error' }),
    ]);
  });

  it('only warns about missing files after a terminal command', async () => {
    const content = act([
      { action: 'executeTerminalCommand', command: 'npm create vite@latest app' },
      { action: 'open', path: 'app/src/main.ts' },
    ]);

    expect(await problems(content)).toEqual([
      expect.objectContaining({ code: 'preflight-missing-file', severity: 'warning' }),
    ]);
  });

  it('resolves content paths of version 1 act files from the .demo folder', async () => {
    const content = JSON.stringify({
      title: 'Act',
      demos: [{ title: 'Demo', steps: [{ action: 'create', path: 'a.ts', contentPath: 'a.ts' }] }],
    });

    expect(await problems(content, { '.demo/a.ts': '' })).toEqual([]);
    expect(await problems(content, { 'a.ts': '' })).toHaveLength(1);
  });

  it('reports content paths outside the workspace', async () => {
    const content = act([{ action: 'create', path: 'a.ts', contentPath: '../secret.ts' }]);

    expect(await problems(content)).toEqual([
      expect.objectContaining({ code: 'preflight-outside-workspace' }),
    ]);
  });

  it('warns when the destination of a copy already exists', async () => {
    const files = { 'a.ts': '', 'b.ts': '' };

    expect(await problems(act([{ action: 'copy', path: 'a.ts', dest: 'b.ts' }]), files)).toEqual([
      expect.objectContaining({ code: 'preflight-destination-exists', severity: 'warning' }),
    ]);
    expect(
      await problems(act([{ action: 'copy', path: 'a.ts', dest: 'b.ts', overwrite: true }]), files),
    ).toEqual([]);
  });

  it('inserts variables and skips paths with runtime variables', async () => {
    const content = act([
      { action: 'setState', state: { key: 'folder', value: 'app' } },
      { action: 'open', path: '{APP_FOLDER}/main.ts' },
      { action: 'open', path: '{STATE_folder}/main.ts' },
      { action: 'open', path: '{DT_INPUT}' },
    ]);

    expect(await problems(content, { 'app/main.ts': '' }, { APP_FOLDER: 'app' })).toEqual([]);
  });

  it('skips disabled scenes, moves and URLs', async () => {
    const content = JSON.stringify({
      version: 3,
      title: 'Act',
      scenes: [
        { title: 'Disabled', disabled: true, moves: [{ action: 'open', path: 'missing.ts' }] },
        {
          title: 'Scene',
          moves: [
            { action: 'open', path: 'missing.ts', disabled: true },
            { action: 'imagePreview', path: 'https://demotime.show/logo.png' },
          ],
        },
      ],
    });

    expect(await problems(content)).toEqual([]);
  });

  it('checks the notes of a scene', async () => {
    const content = act([], { notes: { path: '.demo/notes/scene.md' } });

    expect(await problems(content)).toEqual([
      expect.objectContaining({ code: 'preflight-missing-file' }),
    ]);
  });

  it('checks the moves of a snippet with its arguments', async () => {
    const snippet = JSON.stringify([{ action: 'open', path: '{FILE}' }]);
    const content = act([
      { action: 'snippet', contentPath: '.demo/snippets/open.json', args: { FILE: 'a.ts' } },
      { action: 'snippet', contentPath: '.demo/snippets/open.json', args: { FILE: 'b.ts' } },
    ]);
    const files = { '.demo/snippets/open.json': snippet, 'a.ts': '' };

    const result = await getPreflightProblems([{ filePath: 'act.json', content }], host(files));
    const contentPathLines = content
      .split('\n')
      .flatMap((line, idx) => (line.includes('"contentPath"') ? [idx] : []));
    const secondSnippetLine = contentPathLines[1];

    expect(result[0].problems).toEqual([
      expect.objectContaining({
        code: 'preflight-missing-file',
        line: secondSnippetLine,
        message: expect.stringContaining('Snippet ".demo/snippets/open.json"'),
      }),
    ]);
  });

  it('checks the config of the act editor, which uses demos and steps for every version', async () => {
    const content = JSON.stringify({
      version: 3,
      title: 'Act',
      demos: [
        { title: 'Scene', notes: { path: 'notes.md' }, steps: [{ action: 'open', path: 'a.ts' }] },
      ],
    });

    const result = await getPreflightProblems([{ filePath: '.demo/act.yaml', content }], host());

    expect(
      result[0].problems.map(({ sceneIndex, moveIndex, property }) => ({
        sceneIndex,
        moveIndex,
        property,
      })),
    ).toEqual([
      { sceneIndex: 0, moveIndex: undefined, property: 'notes' },
      { sceneIndex: 0, moveIndex: 0, property: 'path' },
    ]);
  });

  it('reports a missing snippet file', async () => {
    const content = act([{ action: 'snippet', contentPath: '.demo/snippets/missing.json' }]);

    expect(await problems(content)).toEqual([
      expect.objectContaining({ code: 'preflight-missing-file' }),
    ]);
  });

  it('locates problems in YAML act files', async () => {
    const content = [
      'title: Act',
      'version: 3',
      'scenes:',
      '  - title: First',
      '    moves:',
      '      - action: open',
      '        path: src/app.ts',
      '  - title: Second',
      '    moves:',
      '      - action: open',
      '        path: src/missing.ts',
    ].join('\n');

    const result = await getPreflightProblems(
      [{ filePath: '.demo/act.yaml', content }],
      host({ 'src/app.ts': '' }),
    );

    expect(result[0].moves).toBe(2);
    expect(result[0].problems).toEqual([
      expect.objectContaining({ line: 10, character: 8, sceneIndex: 1, moveIndex: 0 }),
    ]);
  });

  it('reports a patch that does not apply to the snapshot', async () => {
    const snapshot = 'one\ntwo\nthree\n';
    const files = {
      'a.ts': '',
      '.demo/snapshot': snapshot,
      '.demo/good.patch': createPatch('a.ts', snapshot, 'one\n2\nthree\n'),
      '.demo/bad.patch': createPatch('a.ts', 'other\ncontent\n', 'other\nchanged\n'),
    };
    const move = (patch: string) => ({
      action: 'applyPatch',
      path: 'a.ts',
      contentPath: '.demo/snapshot',
      patch,
    });

    expect(await problems(act([move('.demo/good.patch')]), files)).toEqual([]);
    expect(await problems(act([move('.demo/bad.patch')]), files)).toEqual([
      expect.objectContaining({ code: 'preflight-patch-conflict', severity: 'error' }),
    ]);
  });

  it('reports moves without the properties they need', async () => {
    const content = act([
      { action: 'copy', path: 'a.ts' },
      { action: 'highlight', path: 'a.ts' },
      { action: 'write', content: 'at the cursor' },
      { action: 'setState', state: { key: 'name' } },
      { action: 'opne', path: 'a.ts' },
      { path: 'a.ts' },
    ]);

    const result = await getPreflightProblems(
      [{ filePath: 'act.json', content }],
      host({ 'a.ts': '' }),
    );

    expect(result[0].problems.map(({ code, message }) => ({ code, message }))).toEqual([
      { code: 'preflight-missing-property', message: expect.stringContaining('`dest`') },
      {
        code: 'preflight-missing-property',
        message: expect.stringContaining('`position` or `startPlaceholder`'),
      },
      { code: 'preflight-missing-property', message: expect.stringContaining('`state.value`') },
      { code: 'preflight-unknown-action', message: expect.stringContaining('`opne`') },
      { code: 'preflight-unknown-action', message: expect.stringContaining('without an `action`') },
    ]);
  });

  it('reports runDemoById moves for scenes that do not exist', async () => {
    const first = act([
      { action: 'runDemoById', id: 'later-scene' },
      { action: 'runDemoById', id: 'missing-scene' },
    ]);
    const second = JSON.stringify({
      version: 3,
      title: 'Second',
      scenes: [{ id: 'later-scene', title: 'Later', moves: [] }],
    });

    expect(await problems([first, second])).toEqual([
      expect.objectContaining({ code: 'preflight-unknown-scene', severity: 'error' }),
    ]);
  });

  it('warns about state and script variables without an earlier move that sets them', async () => {
    const content = act([
      { action: 'showInfoMessage', message: 'Hello {STATE_name}' },
      { action: 'setState', state: { key: 'name', value: 'Elio' } },
      { action: 'showInfoMessage', message: 'Hello {STATE_name}' },
      { action: 'showInfoMessage', message: '{SCRIPT_version}' },
      { action: 'executeScript', id: 'version', path: 'script.js', command: 'node' },
      { action: 'showInfoMessage', message: '{SCRIPT_version}' },
    ]);

    const result = await getPreflightProblems(
      [{ filePath: 'act.json', content }],
      host({ 'script.js': '' }),
    );

    expect(result[0].problems.map(({ code, moveIndex }) => ({ code, moveIndex }))).toEqual([
      { code: 'preflight-unset-variable', moveIndex: 0 },
      { code: 'preflight-unset-variable', moveIndex: 3 },
    ]);
  });

  it('reports snippet arguments that are not set', async () => {
    const snippet = JSON.stringify({
      id: 'insert',
      name: 'Insert',
      fields: [
        { name: 'MAIN_FILE', type: 'string', required: true },
        { name: 'LINE', type: 'number' },
      ],
      steps: [{ action: 'insert', path: '{MAIN_FILE}', content: 'code', position: '{LINE}' }],
    });
    const content = act([{ action: 'snippet', contentPath: '.demo/snippet.json', args: {} }]);

    expect(await problems(content, { '.demo/snippet.json': snippet })).toEqual([
      expect.objectContaining({ code: 'preflight-missing-argument', severity: 'error' }),
      expect.objectContaining({ code: 'preflight-missing-argument', severity: 'warning' }),
    ]);
  });

  it('reports an openSlide move for a slide that does not exist', async () => {
    const files = { 'slides.md': '# One\n\n---\n\n# Two\n' };
    const move = (slide: number) => ({ action: 'openSlide', path: 'slides.md', slide });

    expect(await problems(act([move(2)]), files)).toEqual([]);
    expect(await problems(act([move(3)]), files)).toEqual([
      expect.objectContaining({ code: 'preflight-slide-out-of-range' }),
    ]);
  });
});

describe('findYamlLocation', () => {
  it('finds sequences on the same level as their key', () => {
    const lines = [
      'scenes:',
      '- title: First',
      '  moves:',
      '  - action: open',
      '  - action: highlight',
      '    path: a.ts',
    ];

    expect(findYamlLocation(lines, ['scenes', 0, 'moves', 1, 'path'])).toEqual({
      line: 5,
      character: 4,
    });
  });

  it('returns the closest parent when the property is missing', () => {
    const lines = ['scenes:', '  - title: First', '    moves:', '      - action: snippet'];

    expect(findYamlLocation(lines, ['scenes', 0, 'moves', 0, 'path'])).toEqual({
      line: 3,
      character: 6,
    });
  });
});
