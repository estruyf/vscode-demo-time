import { describe, it, expect } from '@jest/globals';
import {
  getCodeFileBlocks,
  getCodeFileLanguage,
  getCodeFromFile,
  parseCodeFileReference,
  resolveCodeFiles,
} from '@demotime/common';

const SOURCE = `import { foo } from './foo';

export const setup = () => {
  // #region setup
  const app = createApp();
  // #region inner
  app.use(foo);
  // #endregion
  // #endregion
  return app;
};
`;

describe('parseCodeFileReference', () => {
  it('parses a path without a fragment', () => {
    expect(parseCodeFileReference('src/app.ts')).toEqual({ path: 'src/app.ts' });
  });

  it('parses line ranges', () => {
    expect(parseCodeFileReference('src/app.ts#L10-24')).toEqual({
      path: 'src/app.ts',
      lines: { start: 10, end: 24 },
    });
    expect(parseCodeFileReference('src/app.ts#L10-L12').lines).toEqual({ start: 10, end: 12 });
    expect(parseCodeFileReference('src/app.ts#L7').lines).toEqual({ start: 7, end: 7 });
  });

  it('parses regions', () => {
    expect(parseCodeFileReference('src/app.ts#region=setup')).toEqual({
      path: 'src/app.ts',
      region: 'setup',
    });
  });

  it('keeps a # that is part of the file name', () => {
    expect(parseCodeFileReference('src/c#/app.cs')).toEqual({ path: 'src/c#/app.cs' });
  });
});

describe('getCodeFromFile', () => {
  it('returns the whole file', () => {
    expect(getCodeFromFile('a\nb\n', { path: 'x' })).toEqual({ code: 'a\nb' });
  });

  it('returns a line range without the common indentation', () => {
    expect(getCodeFromFile(SOURCE, { path: 'x', lines: { start: 5, end: 7 } })).toEqual({
      code: 'const app = createApp();\n// #region inner\napp.use(foo);',
    });
  });

  it('reports a line range outside of the file', () => {
    expect(getCodeFromFile('a\nb', { path: 'x.ts', lines: { start: 2, end: 5 } }).error).toBe(
      'Lines 2-5 are outside of x.ts, which has 2 lines.',
    );
  });

  it('returns a region without the nested region markers', () => {
    expect(getCodeFromFile(SOURCE, { path: 'x', region: 'setup' })).toEqual({
      code: 'const app = createApp();\napp.use(foo);',
    });
  });

  it('reports a missing region', () => {
    expect(getCodeFromFile(SOURCE, { path: 'x.ts', region: 'nope' }).error).toContain(
      'Region "nope" not found in x.ts',
    );
  });
});

describe('getCodeFileLanguage', () => {
  it('maps the file extension', () => {
    expect(getCodeFileLanguage('src/app.ts')).toBe('ts');
    expect(getCodeFileLanguage('scripts/build.mjs')).toBe('js');
    expect(getCodeFileLanguage('main.py')).toBe('python');
    expect(getCodeFileLanguage('Dockerfile')).toBe('docker');
  });
});

describe('getCodeFileBlocks', () => {
  it('finds the code blocks with a file option', () => {
    const blocks = getCodeFileBlocks(
      [
        '# Slide',
        '',
        '```ts file="src/app.ts#L1-2" {1}',
        '```',
        '',
        '```js',
        'file="x"',
        '```',
      ].join('\n'),
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      value: 'src/app.ts#L1-2',
      lang: 'ts',
      info: 'ts {1}',
      line: 2,
      start: 6,
      end: 28,
      endLine: 3,
    });
  });

  it('ignores a fence inside another code block', () => {
    const markdown = ['````md', '```ts file="src/app.ts"', '```', '````'].join('\n');
    expect(getCodeFileBlocks(markdown)).toHaveLength(0);
  });
});

describe('resolveCodeFiles', () => {
  const files: Record<string, string> = { 'src/app.ts': SOURCE, 'docs/fence.md': '```\nx\n```' };
  const readFile = async (filePath: string) => files[filePath];

  it('replaces the code block content and adds the language', async () => {
    const markdown = ['# Code', '', '```file="src/app.ts#L3" {1}', 'old', '```', '', 'Done'].join(
      '\n',
    );
    const result = await resolveCodeFiles(markdown, readFile);

    expect(result.markdown).toBe(
      ['# Code', '', '```ts {1}', 'export const setup = () => {', '```', '', 'Done'].join('\n'),
    );
    expect(result.files).toEqual(['src/app.ts']);
    expect(result.errors).toHaveLength(0);
  });

  it('uses a longer fence when the code has a fence', async () => {
    const result = await resolveCodeFiles('```md file="docs/fence.md"\n```', readFile);
    expect(result.markdown).toBe('````md\n```\nx\n```\n````');
  });

  it('renders an error for a missing file', async () => {
    const result = await resolveCodeFiles('```ts file="src/missing.ts"\n```', readFile);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe('File not found: src/missing.ts');
    expect(result.markdown).toContain('demotime__code-file-error');
    expect(result.markdown).not.toContain('```');
  });

  it('leaves markdown without file options unchanged', async () => {
    const markdown = '```ts\nconst a = 1;\n```';
    expect((await resolveCodeFiles(markdown, readFile)).markdown).toBe(markdown);
  });
});
