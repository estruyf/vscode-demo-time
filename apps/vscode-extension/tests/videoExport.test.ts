import { Action, Demo } from '@demotime/common';
import { describe, it, expect } from '@jest/globals';
import {
  buildVideoExportArgs,
  countSlideWords,
  DEFAULT_VIDEO_EXPORT_CHOICES,
  describeVideoExportChoices,
  getReadingSeconds,
  getVSCodeExecutableCandidates,
  normalizeVideoExportChoices,
  toVideoFileName,
  toWorkspaceRelativePath,
  formatVideoExportRange,
  getSlideHoldSeconds,
  getVideoExportStepIssue,
  parseVideoExportRange,
  preflightVideoExport,
  selectVideoExportScenes,
  VideoExportAct,
} from '../src/utils/videoExport';

const scene = (title: string, extra: Partial<Demo> = {}): Demo => ({
  title,
  steps: [{ action: Action.Open, path: 'index.ts' }],
  ...extra,
});

const acts: VideoExportAct[] = [
  { filePath: '/w/.demo/1-intro.yaml', title: 'Intro', demos: [scene('A'), scene('B')] },
  {
    filePath: '/w/.demo/2-code.yaml',
    title: 'Code',
    demos: [scene('C'), scene('D', { disabled: true }), scene('E'), scene('F'), scene('G')],
  },
];

const titles = (range: string) =>
  selectVideoExportScenes(acts, parseVideoExportRange(range)).map((s) => s.demo.title);

describe('parseVideoExportRange', () => {
  it('defaults to the whole play', () => {
    expect(parseVideoExportRange()).toEqual({ type: 'all' });
    expect(parseVideoExportRange(' ALL ')).toEqual({ type: 'all' });
  });

  it('parses an act, a single scene, a scene range and an open-ended range', () => {
    expect(parseVideoExportRange('act:2')).toEqual({
      type: 'act',
      act: 2,
      fromScene: undefined,
      toScene: undefined,
    });
    expect(parseVideoExportRange('act:2/scenes:3')).toEqual({
      type: 'act',
      act: 2,
      fromScene: 3,
      toScene: 3,
    });
    expect(parseVideoExportRange('act:2/scenes:3-5')).toEqual({
      type: 'act',
      act: 2,
      fromScene: 3,
      toScene: 5,
    });
    expect(parseVideoExportRange('act:2/scenes:3-')).toEqual({
      type: 'act',
      act: 2,
      fromScene: 3,
      toScene: undefined,
    });
  });

  it('rejects malformed and inverted ranges', () => {
    expect(() => parseVideoExportRange('scenes:1-2')).toThrow('Invalid range');
    expect(() => parseVideoExportRange('act:0')).toThrow('start at 1');
    expect(() => parseVideoExportRange('act:1/scenes:5-3')).toThrow('comes before');
  });

  it('formats back to the same string', () => {
    for (const range of ['all', 'act:2', 'act:2/scenes:3', 'act:2/scenes:3-5', 'act:2/scenes:3-']) {
      expect(formatVideoExportRange(parseVideoExportRange(range))).toBe(range);
    }
  });
});

describe('selectVideoExportScenes', () => {
  it('runs every enabled scene of every act in order', () => {
    expect(titles('all')).toEqual(['A', 'B', 'C', 'E', 'F', 'G']);
  });

  it('limits to one act', () => {
    expect(titles('act:1')).toEqual(['A', 'B']);
  });

  it('counts scene numbers including disabled scenes, as the act file lists them', () => {
    expect(titles('act:2/scenes:2-4')).toEqual(['E', 'F']);
    expect(titles('act:2/scenes:4-')).toEqual(['F', 'G']);
    expect(titles('act:2/scenes:5')).toEqual(['G']);
  });

  it('keeps the act and scene index of each scene', () => {
    const [first] = selectVideoExportScenes(acts, parseVideoExportRange('act:2/scenes:3'));
    expect(first.actIndex).toBe(1);
    expect(first.sceneIndex).toBe(2);
    expect(first.act.title).toBe('Code');
  });

  it('fails on an act or scene that does not exist', () => {
    expect(() => titles('act:3')).toThrow('act 3 does not exist');
    expect(() => titles('act:1/scenes:3')).toThrow('scene 3 does not exist');
  });
});

describe('getVideoExportStepIssue', () => {
  it('lets ordinary moves run as is', () => {
    expect(getVideoExportStepIssue({ action: Action.Open, path: 'a.ts' })).toBeUndefined();
    expect(
      getVideoExportStepIssue({ action: Action.ExecuteTerminalCommand, command: 'npm test' }),
    ).toBeUndefined();
  });

  it('skips moves that happen outside VS Code', () => {
    expect(getVideoExportStepIssue({ action: Action.OpenPowerPoint })?.handling).toBe('skip');
    expect(getVideoExportStepIssue({ action: Action.HideDock })?.handling).toBe('skip');
    expect(getVideoExportStepIssue({ action: Action.HideDesktopIcons })?.handling).toBe('skip');
    expect(getVideoExportStepIssue({ action: Action.StartEngageTimePoll })?.handling).toBe('skip');
  });

  it('skips websites in an external browser but records them in VS Code', () => {
    expect(
      getVideoExportStepIssue({ action: Action.OpenWebsite, url: 'https://demotime.show' })
        ?.handling,
    ).toBe('skip');
    expect(
      getVideoExportStepIssue({
        action: Action.OpenWebsite,
        url: 'https://demotime.show',
        openInVSCode: true,
      }),
    ).toBeUndefined();
  });

  it('continues automatically after moves that wait for the presenter', () => {
    expect(getVideoExportStepIssue({ action: Action.Pause })?.handling).toBe('auto-continue');
    expect(getVideoExportStepIssue({ action: Action.WaitForInput })?.handling).toBe(
      'auto-continue',
    );
  });

  it('types hacker-typer moves character by character, from the move or the setting', () => {
    expect(
      getVideoExportStepIssue({ action: Action.Insert, insertTypingMode: 'hacker-typer' })
        ?.handling,
    ).toBe('adjust');
    expect(getVideoExportStepIssue({ action: Action.Replace }, 'hacker-typer')?.handling).toBe(
      'adjust',
    );
    expect(
      getVideoExportStepIssue(
        { action: Action.Insert, insertTypingMode: 'line-by-line' },
        'hacker-typer',
      ),
    ).toBeUndefined();
  });

  it('warns about moves whose result differs on every run or is not shown', () => {
    expect(getVideoExportStepIssue({ action: Action.AskChat })?.handling).toBe('warn');
    expect(
      getVideoExportStepIssue({
        action: Action.ExecuteTerminalCommand,
        command: 'npm test',
        autoExecute: false,
      })?.handling,
    ).toBe('warn');
  });

  it('ignores disabled moves', () => {
    expect(getVideoExportStepIssue({ action: Action.Pause, disabled: true })).toBeUndefined();
  });
});

describe('preflightVideoExport', () => {
  it('lists the issues with the act and scene they are in', () => {
    const withIssues: VideoExportAct[] = [
      {
        filePath: '/w/.demo/1.yaml',
        title: 'Intro',
        demos: [
          { title: 'Slides', steps: [{ action: Action.OpenSlide, path: 'a.md' }] },
          {
            title: 'Wrap up',
            steps: [{ action: Action.Pause }, { action: Action.OpenPowerPoint }],
          },
        ],
      },
    ];
    const issues = preflightVideoExport(selectVideoExportScenes(withIssues, { type: 'all' }));
    expect(issues.map((i) => [i.sceneTitle, i.action, i.handling])).toEqual([
      ['Wrap up', Action.Pause, 'auto-continue'],
      ['Wrap up', Action.OpenPowerPoint, 'skip'],
    ]);
    expect(issues[0].actTitle).toBe('Intro');
  });
});

describe('slide timing', () => {
  const limits = { minSlideSeconds: 3, maxSlideSeconds: 12 };

  it('counts only the words a viewer reads', () => {
    expect(
      countSlideWords(
        '# Ship it\n\n- One **bold** [link](https://x.y)\n\n```ts\nconst a = 1;\n```\n<div class="x">Two</div>',
      ),
    ).toBe(6);
  });

  it('prefers the scene timing, then the slide timing', () => {
    expect(
      getSlideHoldSeconds('# Hi', { sceneAutoAdvanceAfter: 7, slideAutoAdvanceAfter: 4 }, limits),
    ).toBe(7);
    expect(getSlideHoldSeconds('# Hi', { slideAutoAdvanceAfter: 4 }, limits)).toBe(4);
  });

  it('otherwise holds for the reading time, within the limits', () => {
    expect(getSlideHoldSeconds('# Hi', {}, limits)).toBe(3);
    expect(getSlideHoldSeconds(Array(30).fill('word').join(' '), {}, limits)).toBe(10.5);
    expect(getSlideHoldSeconds(Array(300).fill('word').join(' '), {}, limits)).toBe(12);
    expect(getSlideHoldSeconds(undefined, {}, limits)).toBe(3);
  });
});

describe('export command helpers', () => {
  it('reads saved choices and drops what it does not know', () => {
    expect(normalizeVideoExportChoices(undefined)).toBeUndefined();
    expect(normalizeVideoExportChoices({})).toBeUndefined();
    expect(
      normalizeVideoExportChoices({
        range: 'act:2',
        preset: '9:16',
        gif: true,
        captions: 'notes',
        chapters: false,
        cards: true,
      }),
    ).toEqual({
      range: 'act:2',
      preset: '9:16',
      gif: true,
      captions: 'notes',
      chapters: false,
      cards: true,
    });
    expect(normalizeVideoExportChoices({ range: 'nope', preset: '4:3', captions: 'x' })).toEqual(
      DEFAULT_VIDEO_EXPORT_CHOICES,
    );
  });

  it('describes the choices in one line', () => {
    expect(describeVideoExportChoices(DEFAULT_VIDEO_EXPORT_CHOICES)).toBe(
      'Whole play · 16:9 · chapters',
    );
    expect(
      describeVideoExportChoices(
        {
          ...DEFAULT_VIDEO_EXPORT_CHOICES,
          range: 'act:2/scenes:1-3',
          gif: true,
          captions: 'notes',
        },
        ['Intro', 'Build the API'],
      ),
    ).toBe('Build the API, scenes 1-3 · 16:9 · GIF · captions from notes · chapters');
  });

  it('makes file names from folder and act names', () => {
    expect(toVideoFileName('Ship it!')).toBe('ship-it');
    expect(toVideoFileName('Démo Tíme 2')).toBe('demo-time-2');
    expect(toVideoFileName('!!!')).toBe('demo');
  });

  it('finds the VS Code executable next to the app root on each platform', () => {
    expect(
      getVSCodeExecutableCandidates(
        '/Applications/Visual Studio Code.app/Contents/Resources/app',
        'darwin',
      )[0],
    ).toBe('/Applications/Visual Studio Code.app/Contents/Resources/app/../../MacOS/Code');
    expect(getVSCodeExecutableCandidates('C:\\VS Code\\resources\\app', 'win32')[0]).toBe(
      'C:/VS Code/resources/app/../../Code.exe',
    );
    expect(getVSCodeExecutableCandidates('/usr/share/code/resources/app', 'linux')[0]).toBe(
      '/usr/share/code/resources/app/../../code',
    );
  });

  it('builds the CLI arguments', () => {
    expect(
      buildVideoExportArgs(
        {
          range: 'act:1',
          preset: '1:1',
          gif: true,
          captions: 'titles',
          chapters: true,
          cards: true,
        },
        {
          workspace: '/w',
          outDir: '/w/.demo/exports',
          name: 'talk',
          vscodePath: '/vscode/Code',
          extension: 'eliostruyf.vscode-demo-time@2.4.0',
          extensions: ['a.theme', 'b.icons'],
          settingsFile: '/s.json',
        },
      ),
    ).toEqual([
      'export',
      '/w',
      '--range',
      'act:1',
      '--preset',
      '1:1',
      '--out',
      '/w/.demo/exports',
      '--name',
      'talk',
      '--extension',
      'eliostruyf.vscode-demo-time@2.4.0',
      '--gif',
      '--srt',
      '--captions',
      'titles',
      '--chapters',
      '--cards',
      '--vscode',
      '/vscode/Code',
      '--extensions',
      'a.theme,b.icons',
      '--settings',
      '/s.json',
    ]);
  });
});

describe('getReadingSeconds', () => {
  it('reads at 200 words a minute plus a moment', () => {
    expect(getReadingSeconds('')).toBe(1.5);
    expect(getReadingSeconds(Array(100).fill('word').join(' '))).toBe(31.5);
  });
});

describe('toWorkspaceRelativePath', () => {
  it('resolves version 1 paths from the .demo folder and later versions from the workspace', () => {
    expect(toWorkspaceRelativePath('notes/intro.md', 1)).toBe('.demo/notes/intro.md');
    expect(toWorkspaceRelativePath('./notes/intro.md', 1)).toBe('.demo/notes/intro.md');
    expect(toWorkspaceRelativePath('.demo/notes/intro.md', 2)).toBe('.demo/notes/intro.md');
    expect(toWorkspaceRelativePath('.demo/notes/intro.md', 3)).toBe('.demo/notes/intro.md');
    expect(toWorkspaceRelativePath('.demo/notes/intro.md')).toBe('.demo/notes/intro.md');
  });
});
