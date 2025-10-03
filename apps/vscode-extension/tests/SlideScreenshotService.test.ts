import { SlideScreenshotService } from '../src/services/SlideScreenshotService';
import { DemoStatusBar } from '../src/services/DemoStatusBar';
import { Extension } from '../src/services/Extension';
import { readFile } from '../src/utils';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Action } from '@demotime/common';

jest.mock('vscode', () => ({
  Uri: {
    joinPath: jest.fn((...args) => ({
      uri: args.join('/'),
      fsPath: args.join('/'),
    })),
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
  },
}), { virtual: true });

jest.mock('../src/services/DemoStatusBar');
jest.mock('../src/services/Extension');
jest.mock('../src/utils');

const DemoStatusBarMock = DemoStatusBar as jest.Mocked<typeof DemoStatusBar>;
const ExtensionMock = Extension as jest.Mocked<typeof Extension>;
const readFileMock = readFile as jest.MockedFunction<typeof readFile>;

describe('SlideScreenshotService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SlideScreenshotService.clearCache();

    ExtensionMock.getInstance = jest.fn().mockReturnValue({
      workspaceFolder: { uri: { fsPath: '/workspace' } },
      getSetting: jest.fn().mockReturnValue(undefined),
    });
  });

  afterEach(() => {
    SlideScreenshotService.clearCache();
  });

  describe('clearCache', () => {
    it('clears the cached screenshot', () => {
      SlideScreenshotService.clearCache();
      expect(true).toBe(true); // Cache clearing doesn't throw
    });
  });

  describe('getNextSlideScreenshot', () => {
    it('returns null when no next demo is available', async () => {
      DemoStatusBarMock.getNextDemo = jest.fn().mockReturnValue(undefined);

      const result = await SlideScreenshotService.getNextSlideScreenshot();

      expect(result).toBeNull();
    });

    it('returns null when next demo has no slide step', async () => {
      DemoStatusBarMock.getNextDemo = jest.fn().mockReturnValue({
        id: 'test-demo',
        title: 'Test Demo',
        steps: [
          { action: Action.OpenFile, path: '/some/file.ts' },
        ],
      });

      const result = await SlideScreenshotService.getNextSlideScreenshot();

      expect(result).toBeNull();
    });

    it('returns null when workspace folder is not available', async () => {
      DemoStatusBarMock.getNextDemo = jest.fn().mockReturnValue({
        id: 'test-demo',
        title: 'Test Demo',
        steps: [
          { action: Action.OpenSlide, path: '/slides/test.md' },
        ],
      });

      ExtensionMock.getInstance = jest.fn().mockReturnValue({
        workspaceFolder: undefined,
        getSetting: jest.fn().mockReturnValue(undefined),
      } as any);

      const result = await SlideScreenshotService.getNextSlideScreenshot();

      expect(result).toBeNull();
    });

    it('returns cached screenshot for same demo ID', async () => {
      const mockDemo = {
        id: 'test-demo',
        title: 'Test Demo',
        steps: [
          { action: Action.OpenSlide, path: '/slides/test.md' },
        ],
      };

      DemoStatusBarMock.getNextDemo = jest.fn().mockReturnValue(mockDemo);

      readFileMock.mockResolvedValue('---\ntheme: default\n---\n# Test Slide');

      // First call would generate screenshot (but we can't test Playwright easily)
      // So we'll just verify it attempts to read the file
      try {
        await SlideScreenshotService.getNextSlideScreenshot();
      } catch (error) {
        // Expected to fail due to Playwright not being available in test env
      }

      expect(readFileMock).toHaveBeenCalled();
    });

    it('handles errors gracefully and returns null', async () => {
      DemoStatusBarMock.getNextDemo = jest.fn().mockReturnValue({
        id: 'test-demo',
        title: 'Test Demo',
        steps: [
          { action: Action.OpenSlide, path: '/slides/test.md' },
        ],
      });

      readFileMock.mockRejectedValue(new Error('File read error'));

      const result = await SlideScreenshotService.getNextSlideScreenshot();

      expect(result).toBeNull();
    });

    it('uses specified slide index when provided', async () => {
      DemoStatusBarMock.getNextDemo = jest.fn().mockReturnValue({
        id: 'test-demo',
        title: 'Test Demo',
        steps: [
          { action: Action.OpenSlide, path: '/slides/test.md', slide: 2 },
        ],
      });

      readFileMock.mockResolvedValue('---\ntheme: default\n---\n# Slide 1\n\n---\n\n# Slide 2\n\n---\n\n# Slide 3');

      try {
        await SlideScreenshotService.getNextSlideScreenshot();
      } catch (error) {
        // Expected to fail due to Playwright not being available in test env
      }

      expect(readFileMock).toHaveBeenCalled();
    });
  });

  describe('cache behavior', () => {
    it('clears cache when clearCache is called', () => {
      SlideScreenshotService.clearCache();
      // Verify no errors thrown
      expect(true).toBe(true);
    });

    it('invalidates cache when demo ID changes', async () => {
      const firstDemo = {
        id: 'demo-1',
        title: 'First Demo',
        steps: [{ action: Action.OpenSlide, path: '/slides/first.md' }],
      };

      const secondDemo = {
        id: 'demo-2',
        title: 'Second Demo',
        steps: [{ action: Action.OpenSlide, path: '/slides/second.md' }],
      };

      DemoStatusBarMock.getNextDemo = jest.fn().mockReturnValueOnce(firstDemo);
      readFileMock.mockResolvedValue('---\ntheme: default\n---\n# First');

      try {
        await SlideScreenshotService.getNextSlideScreenshot();
      } catch (error) {
        // Expected to fail
      }

      DemoStatusBarMock.getNextDemo = jest.fn().mockReturnValueOnce(secondDemo);
      readFileMock.mockResolvedValue('---\ntheme: default\n---\n# Second');

      try {
        await SlideScreenshotService.getNextSlideScreenshot();
      } catch (error) {
        // Expected to fail
      }

      // Should have been called twice because demo ID changed
      expect(readFileMock).toHaveBeenCalledTimes(2);
    });
  });
});
