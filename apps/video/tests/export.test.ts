import type { VideoExportEvent } from '@demotime/common';
import { afterAll, describe, it, expect } from '@jest/globals';
import { parseExportArgs } from '../src/args';
import {
  buildChapters,
  buildCues,
  formatChapterTime,
  formatTimestamp,
  markdownToText,
  splitIntoCueTexts,
  toChapterList,
  toFfmetadata,
  toSrt,
} from '../src/captions';
import { frameAt, holdFrame, planFrames } from '../src/frames';
import { buildTimeline, parseEventLog } from '../src/timeline';
import { getDemoTimeSupport, quoteForCmd } from '../src/vscode';
import { readSettingsFile } from '../src/export';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const T0 = 1_700_000_000_000;
const ref = (actIndex: number, sceneIndex: number, sceneTitle: string, actTitle = 'Build') => ({
  actIndex,
  actTitle,
  actFile: `/w/.demo/${actIndex}.json`,
  sceneIndex,
  sceneTitle,
});

const events: VideoExportEvent[] = [
  { type: 'start', t: T0, version: 1, range: 'all', sceneCount: 3 },
  { type: 'sceneStart', t: T0 + 1000, ...ref(0, 0, 'Welcome', 'Opening') },
  {
    type: 'slide',
    t: T0 + 1500,
    ...ref(0, 0, 'Welcome', 'Opening'),
    slideIndex: 0,
    slideTitle: 'Ship it',
  },
  { type: 'slide', t: T0 + 4000, ...ref(0, 0, 'Welcome', 'Opening'), slideIndex: 1 },
  { type: 'sceneEnd', t: T0 + 7000, ...ref(0, 0, 'Welcome', 'Opening') },
  { type: 'sceneStart', t: T0 + 7000, ...ref(1, 0, 'Tour the server') },
  {
    type: 'issue',
    t: T0 + 7100,
    issue: {
      action: 'pause',
      handling: 'auto-continue',
      reason: 'Waits',
      sceneTitle: 'Tour the server',
    },
  },
  { type: 'sceneEnd', t: T0 + 10_000, ...ref(1, 0, 'Tour the server') },
  { type: 'sceneStart', t: T0 + 10_000, ...ref(1, 1, 'Try it') },
  { type: 'sceneEnd', t: T0 + 20_000, ...ref(1, 1, 'Try it') },
  { type: 'end', t: T0 + 21_000, status: 'completed' },
];

describe('parseExportArgs', () => {
  it('uses defaults relative to the current folder', () => {
    const options = parseExportArgs([], '/work/talk')!;
    expect(options.workspace).toBe('/work/talk');
    expect(options.range).toBe('all');
    expect(options.preset.name).toBe('16:9');
    expect(options.fps).toBe(30);
    expect(options.outDir).toBe('/work/talk/.demo/exports');
    expect(options.name).toBe('demo');
    expect(options.extension).toBe('eliostruyf.vscode-demo-time');
    expect(options.gif || options.srt || options.chapters || options.cards).toBe(false);
  });

  it('reads every option', () => {
    const options = parseExportArgs(
      [
        'talk',
        '--range',
        'act:2/scenes:1-3',
        '--preset',
        '9:16',
        '--fps',
        '60',
        '--out',
        'videos',
        '--name',
        'talk-v2',
        '--gif',
        '--srt',
        '--captions',
        'notes',
        '--chapters',
        '--cards',
        '--extension',
        'build/demo-time.vsix',
        '--extensions',
        'a.theme, b.icons',
        '--vscode-arg=--disable-gpu',
        '--vscode-arg=--no-sandbox',
      ],
      '/work',
    )!;
    expect(options.workspace).toBe('/work/talk');
    expect(options.range).toBe('act:2/scenes:1-3');
    expect(options.preset).toMatchObject({ width: 1080, height: 1920 });
    expect(options.fps).toBe(60);
    expect(options.outDir).toBe('/work/videos');
    expect(options.name).toBe('talk-v2');
    expect([options.gif, options.srt, options.chapters, options.cards]).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(options.captions).toBe('notes');
    expect(options.extension).toBe('/work/build/demo-time.vsix');
    expect(options.extensions).toEqual(['a.theme', 'b.icons']);
    expect(options.vscodeArgs).toEqual(['--disable-gpu', '--no-sandbox']);
  });

  it('writes captions when a caption source is given, even without --srt', () => {
    expect(parseExportArgs(['--captions', 'notes'])).toMatchObject({
      srt: true,
      captions: 'notes',
    });
    expect(parseExportArgs(['--srt'])).toMatchObject({ srt: true, captions: 'titles' });
    expect(parseExportArgs([])).toMatchObject({ srt: false });
  });

  it('keeps a Marketplace id with a version as is', () => {
    expect(parseExportArgs(['--extension', 'eliostruyf.vscode-demo-time@2.4.0'])!.extension).toBe(
      'eliostruyf.vscode-demo-time@2.4.0',
    );
  });

  it('returns undefined for help and rejects bad values', () => {
    expect(parseExportArgs(['--help'])).toBeUndefined();
    expect(() => parseExportArgs(['--preset', '4:3'])).toThrow('Unknown preset');
    expect(() => parseExportArgs(['--fps', '0'])).toThrow('positive number');
    expect(() => parseExportArgs(['--captions', 'lyrics'])).toThrow('--captions');
    expect(() => parseExportArgs(['--name', '../x'])).toThrow('--name');
    expect(() => parseExportArgs(['--unknown'])).toThrow();
  });
});

describe('buildTimeline', () => {
  it('waits for the end event', () => {
    expect(buildTimeline(events.slice(0, 4))).toBeUndefined();
  });

  it('places scenes and slides relative to the start', () => {
    const timeline = buildTimeline(parseEventLog(events.map((e) => JSON.stringify(e)).join('\n')))!;
    expect(timeline.startedAt).toBe(T0);
    expect(timeline.duration).toBe(21_000);
    expect(timeline.status).toBe('completed');
    expect(timeline.scenes.map((s) => [s.sceneTitle, s.start, s.end])).toEqual([
      ['Welcome', 1000, 7000],
      ['Tour the server', 7000, 10_000],
      ['Try it', 10_000, 20_000],
    ]);
    expect(timeline.slides.map((s) => [s.slideIndex, s.start, s.end])).toEqual([
      [0, 1500, 4000],
      [1, 4000, 7000],
    ]);
    expect(timeline.issues).toHaveLength(1);
  });

  it('ends an unfinished scene at the end of a stopped run', () => {
    const timeline = buildTimeline([
      events[0],
      events[1],
      { type: 'end', t: T0 + 3000, status: 'cancelled' },
    ])!;
    expect(timeline.status).toBe('cancelled');
    expect(timeline.scenes[0]).toMatchObject({ start: 1000, end: 3000 });
  });
});

describe('frames', () => {
  const times = [0, 100, 250, 1000];

  it('finds the last frame painted at or before a time', () => {
    expect(frameAt(times, -5)).toBe(0);
    expect(frameAt(times, 100)).toBe(1);
    expect(frameAt(times, 999)).toBe(2);
    expect(frameAt(times, 5000)).toBe(3);
  });

  it('resamples onto a fixed frame rate', () => {
    expect(planFrames(times, 0, 1200, 10)).toEqual([0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3]);
    expect(planFrames([], 0, 1000, 30)).toEqual([]);
  });

  it('holds a frame for a card', () => {
    expect(holdFrame(7, 0.5, 10)).toEqual([7, 7, 7, 7, 7]);
  });
});

describe('captions and chapters', () => {
  const timeline = buildTimeline(events)!;

  it('formats times for SRT and for chapter lists', () => {
    expect(formatTimestamp(3_723_456)).toBe('01:02:03,456');
    expect(formatChapterTime(65_000)).toBe('1:05');
    expect(formatChapterTime(3_723_000)).toBe('1:02:03');
  });

  it('shows each scene title at the start of the scene', () => {
    const cues = buildCues(timeline, 'titles', 0, () => undefined);
    expect(cues.map((c) => [c.text, c.start, c.end])).toEqual([
      ['Welcome', 1000, 5000],
      ['Tour the server', 7000, 10_000],
      ['Try it', 10_000, 14_000],
    ]);
    expect(toSrt(cues.slice(0, 1))).toBe('1\n00:00:01,000 --> 00:00:05,000\nWelcome\n');
  });

  it('spreads notes over their scene and shifts for a title card', () => {
    const cues = buildCues(timeline, 'notes', 3000, (scene) =>
      scene.sceneTitle === 'Try it'
        ? 'a'.repeat(40) + ' ' + 'b'.repeat(40) + ' ' + 'c'.repeat(40)
        : undefined,
    );
    const tryIt = cues.filter((c) => c.start >= 13_000);
    expect(tryIt).toHaveLength(2);
    expect(tryIt[0].start).toBe(13_000);
    expect(tryIt[tryIt.length - 1].end).toBe(23_000);
    expect(cues[0]).toMatchObject({ text: 'Welcome', start: 4000 });
  });

  it('turns markdown notes into caption text', () => {
    expect(
      markdownToText(
        '---\ntitle: x\n---\n# Intro\n\n- Say **hi** to [the room](https://x.y)\n```js\nx()\n```\nRun `npm test`.',
      ),
    ).toBe('Intro. Say hi to the room. Run npm test.');
    expect(
      markdownToText('- First point\n- Second point!\n\nA paragraph that\nwraps over lines'),
    ).toBe('First point. Second point! A paragraph that wraps over lines.');
    expect(splitIntoCueTexts('one two three')).toEqual(['one two three']);
    expect(splitIntoCueTexts(Array(20).fill('word').join(' '))).toEqual([
      'word word word word word word word word\nword word word word word word word word',
      'word word word word',
    ]);
  });

  it('ends cues with sentences where they fit', () => {
    expect(
      splitIntoCueTexts(
        'Short one. Another short one. ' + 'x'.repeat(40) + ' ' + 'y'.repeat(40) + '.',
      ),
    ).toEqual(['Short one. Another short one.', 'x'.repeat(40) + '\n' + 'y'.repeat(40) + '.']);
  });

  it('makes one chapter per scene, the first from 0, named by act when there are several', () => {
    const chapters = buildChapters(timeline, 3000, 27_000);
    expect(chapters).toEqual([
      { start: 0, end: 10_000, title: 'Opening: Welcome' },
      { start: 10_000, end: 13_000, title: 'Build: Tour the server' },
      { start: 13_000, end: 27_000, title: 'Build: Try it' },
    ]);
    expect(toChapterList(chapters)).toBe(
      '0:00 Opening: Welcome\n0:10 Build: Tour the server\n0:13 Build: Try it\n',
    );
    expect(toFfmetadata(chapters.slice(0, 1), 'A=B')).toBe(
      ';FFMETADATA1\ntitle=A\\=B\n\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=0\nEND=10000\ntitle=Opening: Welcome\n',
    );
  });
});

describe('getDemoTimeSupport', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dtv-test-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const install = (folder: string, manifest: object) => {
    mkdirSync(join(dir, folder), { recursive: true });
    writeFileSync(join(dir, folder, 'package.json'), JSON.stringify(manifest));
  };

  it('is undefined when Demo Time is not installed', () => {
    expect(getDemoTimeSupport(join(dir, 'missing'))).toBeUndefined();
    install('someone.theme-1.0.0', { publisher: 'someone', name: 'theme', version: '1.0.0' });
    expect(getDemoTimeSupport(dir)).toBeUndefined();
  });

  it('tells whether the installed version can export videos', () => {
    install('eliostruyf.vscode-demo-time-2.3.1', {
      publisher: 'eliostruyf',
      name: 'vscode-demo-time',
      version: '2.3.1',
      contributes: { commands: [{ command: 'demo-time.start' }] },
    });
    expect(getDemoTimeSupport(dir)).toEqual({ version: '2.3.1', supported: false });

    rmSync(join(dir, 'eliostruyf.vscode-demo-time-2.3.1'), { recursive: true });
    install('eliostruyf.vscode-demo-time-2.4.0', {
      publisher: 'eliostruyf',
      name: 'vscode-demo-time',
      version: '2.4.0',
      contributes: { commands: [{ command: 'demo-time.runForVideoExport' }] },
    });
    expect(getDemoTimeSupport(dir)).toEqual({ version: '2.4.0', supported: true });
  });
});

describe('review fixes', () => {
  it('reads timing flags and leaves unset ones to Demo Time', () => {
    expect(parseExportArgs(['--terminal-timeout', '90', '--scene-hold', '3'])!.timing).toEqual({
      terminalTimeoutSeconds: 90,
      sceneHoldSeconds: 3,
      minSlideSeconds: undefined,
      maxSlideSeconds: undefined,
    });
    expect(() => parseExportArgs(['--slide-min=0'])).toThrow('positive number');
  });

  it('quotes Windows arguments that cmd would split or read', () => {
    expect(quoteForCmd('--force')).toBe('--force');
    expect(quoteForCmd('C:\\Users\\Jane Doe\\AppData')).toBe('"C:\\Users\\Jane Doe\\AppData"');
    expect(quoteForCmd('a&b')).toBe('"a&b"');
  });

  it('reads settings files with comments and trailing commas', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dtv-settings-'));
    try {
      const good = join(dir, 'good.json');
      writeFileSync(good, '{\n  // the talk theme\n  "workbench.colorTheme": "Demo Time Dark",\n}');
      expect(readSettingsFile(good)).toEqual({ 'workbench.colorTheme': 'Demo Time Dark' });
      const bad = join(dir, 'bad.json');
      writeFileSync(bad, '["not", "settings"]');
      expect(() => readSettingsFile(bad)).toThrow('not a JSON object');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
