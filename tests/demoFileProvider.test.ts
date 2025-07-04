import { Uri } from 'vscode';
import { describe, it, expect, jest } from '@jest/globals';

jest.mock('vscode', () => ({
  Uri: { file: (p: string) => ({ fsPath: p, path: p }) },
  window: {},
  workspace: {},
}), { virtual: true });

jest.mock('../src/utils', () => ({
  readFile: jest.fn(),
}), { virtual: true });

jest.mock('../src/preview/Preview', () => ({ Preview: { triggerUpdate: jest.fn() } }), { virtual: true });
jest.mock('../src/services/Extension', () => ({ Extension: { getInstance: jest.fn(() => ({ workspaceFolder: null, subscriptions: [] })) } }), { virtual: true });

const { DemoFileProvider } = require('../src/services/DemoFileProvider');
const { readFile } = require('../src/utils');
const readFileMock = readFile as jest.MockedFunction<typeof readFile>;

describe('DemoFileProvider.getFile', () => {
  it('parses JSON files', async () => {
    readFileMock.mockResolvedValue('{"title":"demo","demos":[]}');
    const demo = await DemoFileProvider.getFile(Uri.file('demo.json'));
    expect(demo).toEqual({ title: 'demo', demos: [] });
  });

  it('parses YAML files', async () => {
    readFileMock.mockResolvedValue('title: demo\ndemos: []');
    const demo = await DemoFileProvider.getFile(Uri.file('demo.yaml'));
    expect(demo).toEqual({ title: 'demo', demos: [] });
  });
});
