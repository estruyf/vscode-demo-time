import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InteractionService } from '../src/services/InteractionService';
import { ScriptExecutor } from '../src/services/ScriptExecutor';
import { platform } from 'os';

// Mock dependencies
jest.mock('../src/services/ScriptExecutor');
jest.mock('os');
jest.mock(
  'vscode',
  () => ({
    commands: { executeCommand: jest.fn() },
    env: { clipboard: { writeText: jest.fn() } },
  }),
  { virtual: true },
);

const mockScriptExecutor = ScriptExecutor.executeScriptAsync as jest.Mock;
const mockPlatform = platform as jest.Mock;

describe('InteractionService Keyboard Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pressEnter', () => {
    it('executes correct command on macOS', async () => {
      mockPlatform.mockReturnValue('darwin');

      await InteractionService.pressEnter();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to key code 36'`,
        expect.any(String)
      );
    });

    it('executes correct command on Windows', async () => {
      mockPlatform.mockReturnValue('win32');

      await InteractionService.pressEnter();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')"`,
        expect.any(String)
      );
    });

    it('executes correct command on Linux', async () => {
      mockPlatform.mockReturnValue('linux');

      await InteractionService.pressEnter();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `xdotool key Return`,
        expect.any(String)
      );
    });
  });

  describe('pressTab', () => {
    it('executes correct command on macOS', async () => {
      mockPlatform.mockReturnValue('darwin');

      await InteractionService.pressTab();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to key code 48'`,
        expect.any(String)
      );
    });

    it('executes correct command on Windows', async () => {
      mockPlatform.mockReturnValue('win32');

      await InteractionService.pressTab();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{TAB}')"`,
        expect.any(String)
      );
    });

    it('executes correct command on Linux', async () => {
      mockPlatform.mockReturnValue('linux');

      await InteractionService.pressTab();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `xdotool key Tab`,
        expect.any(String)
      );
    });
  });

  describe('pressArrowLeft', () => {
    it('executes correct command on macOS', async () => {
      mockPlatform.mockReturnValue('darwin');

      await InteractionService.pressArrowLeft();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to key code 123'`,
        expect.any(String)
      );
    });

    it('executes correct command on Windows', async () => {
      mockPlatform.mockReturnValue('win32');

      await InteractionService.pressArrowLeft();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{LEFT}')"`,
        expect.any(String)
      );
    });

    it('executes correct command on Linux', async () => {
      mockPlatform.mockReturnValue('linux');

      await InteractionService.pressArrowLeft();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `xdotool key Left`,
        expect.any(String)
      );
    });
  });

  describe('pressArrowRight', () => {
    it('executes correct command on macOS', async () => {
      mockPlatform.mockReturnValue('darwin');

      await InteractionService.pressArrowRight();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to key code 124'`,
        expect.any(String)
      );
    });

    it('executes correct command on Windows', async () => {
      mockPlatform.mockReturnValue('win32');

      await InteractionService.pressArrowRight();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{RIGHT}')"`,
        expect.any(String)
      );
    });

    it('executes correct command on Linux', async () => {
      mockPlatform.mockReturnValue('linux');

      await InteractionService.pressArrowRight();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `xdotool key Right`,
        expect.any(String)
      );
    });
  });

  describe('pressArrowUp', () => {
    it('executes correct command on macOS', async () => {
      mockPlatform.mockReturnValue('darwin');

      await InteractionService.pressArrowUp();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to key code 126'`,
        expect.any(String)
      );
    });

    it('executes correct command on Windows', async () => {
      mockPlatform.mockReturnValue('win32');

      await InteractionService.pressArrowUp();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{UP}')"`,
        expect.any(String)
      );
    });

    it('executes correct command on Linux', async () => {
      mockPlatform.mockReturnValue('linux');

      await InteractionService.pressArrowUp();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `xdotool key Up`,
        expect.any(String)
      );
    });
  });

  describe('pressArrowDown', () => {
    it('executes correct command on macOS', async () => {
      mockPlatform.mockReturnValue('darwin');

      await InteractionService.pressArrowDown();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to key code 125'`,
        expect.any(String)
      );
    });

    it('executes correct command on Windows', async () => {
      mockPlatform.mockReturnValue('win32');

      await InteractionService.pressArrowDown();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{DOWN}')"`,
        expect.any(String)
      );
    });

    it('executes correct command on Linux', async () => {
      mockPlatform.mockReturnValue('linux');

      await InteractionService.pressArrowDown();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `xdotool key Down`,
        expect.any(String)
      );
    });
  });

  describe('pressEscape', () => {
    it('executes correct command on macOS', async () => {
      mockPlatform.mockReturnValue('darwin');

      await InteractionService.pressEscape();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to key code 53'`,
        expect.any(String)
      );
    });

    it('executes correct command on Windows', async () => {
      mockPlatform.mockReturnValue('win32');

      await InteractionService.pressEscape();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{ESCAPE}')"`,
        expect.any(String)
      );
    });

    it('executes correct command on Linux', async () => {
      mockPlatform.mockReturnValue('linux');

      await InteractionService.pressEscape();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `xdotool key Escape`,
        expect.any(String)
      );
    });
  });

  describe('pressBackspace', () => {
    it('executes correct command on macOS', async () => {
      mockPlatform.mockReturnValue('darwin');

      await InteractionService.pressBackspace();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to key code 51'`,
        expect.any(String)
      );
    });

    it('executes correct command on Windows', async () => {
      mockPlatform.mockReturnValue('win32');

      await InteractionService.pressBackspace();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{BACKSPACE}')"`,
        expect.any(String)
      );
    });

    it('executes correct command on Linux', async () => {
      mockPlatform.mockReturnValue('linux');

      await InteractionService.pressBackspace();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `xdotool key BackSpace`,
        expect.any(String)
      );
    });
  });

  describe('pressDelete', () => {
    it('executes correct command on macOS', async () => {
      mockPlatform.mockReturnValue('darwin');

      await InteractionService.pressDelete();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to key code 117'`,
        expect.any(String)
      );
    });

    it('executes correct command on Windows', async () => {
      mockPlatform.mockReturnValue('win32');

      await InteractionService.pressDelete();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{DELETE}')"`,
        expect.any(String)
      );
    });

    it('executes correct command on Linux', async () => {
      mockPlatform.mockReturnValue('linux');

      await InteractionService.pressDelete();

      expect(mockScriptExecutor).toHaveBeenCalledWith(
        `xdotool key Delete`,
        expect.any(String)
      );
    });
  });
});