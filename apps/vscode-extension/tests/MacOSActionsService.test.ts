import { MacOSActionsService } from '../src/services/MacOSActionsService';
import { ScriptExecutor } from '../src/services/ScriptExecutor';
import { Notifications } from '../src/services/Notifications';
import { Logger } from '../src/services/Logger';
import { Extension } from '../src/services/Extension';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as os from 'os';

jest.mock('os');
jest.mock('../src/services/ScriptExecutor');
jest.mock('../src/services/Notifications');
jest.mock('../src/services/Logger');
jest.mock('../src/services/Extension');

describe('MacOSActionsService', () => {
  const originalPlatform = process.platform;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  describe('Volume Control', () => {
    it('should mute volume on macOS', async () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      (ScriptExecutor.executeScriptAsync as jest.Mock).mockResolvedValue('');

      await MacOSActionsService.muteVolume();

      expect(ScriptExecutor.executeScriptAsync).toHaveBeenCalledWith(
        expect.stringContaining('osascript -e'),
        expect.any(String),
      );
      expect(Logger.info).toHaveBeenCalledWith('Volume muted');
    });

    it('should unmute volume on macOS', async () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      (ScriptExecutor.executeScriptAsync as jest.Mock).mockResolvedValue('');

      await MacOSActionsService.unmuteVolume();

      expect(ScriptExecutor.executeScriptAsync).toHaveBeenCalledWith(
        expect.stringContaining('osascript -e'),
        expect.any(String),
      );
      expect(Logger.info).toHaveBeenCalledWith('Volume unmuted');
    });

    it('should show warning when trying to mute volume on non-macOS', async () => {
      (os.platform as jest.Mock).mockReturnValue('linux');

      await MacOSActionsService.muteVolume();

      expect(Notifications.warning).toHaveBeenCalledWith(
        'Volume control is only available on macOS.',
      );
      expect(ScriptExecutor.executeScriptAsync).not.toHaveBeenCalled();
    });

    it('should show error when muting volume fails', async () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      const error = new Error('Script execution failed');
      (ScriptExecutor.executeScriptAsync as jest.Mock).mockRejectedValue(error);

      await MacOSActionsService.muteVolume();

      expect(Notifications.error).toHaveBeenCalledWith(
        'Failed to mute volume: Script execution failed',
      );
    });
  });

  describe('Screen Resolution', () => {
    beforeEach(() => {
      (Extension.getInstance as jest.Mock).mockReturnValue({
        workspaceFolder: { uri: { fsPath: '/test/workspace' } },
      });
    });

    it('should set screen resolution on macOS', async () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      (ScriptExecutor.executeScriptAsync as jest.Mock).mockResolvedValue('');

      await MacOSActionsService.setScreenResolution(1920, 1080, false);

      expect(ScriptExecutor.executeScriptAsync).toHaveBeenCalledWith(
        'displayplacer "id:main res:1920x1080"',
        '/test/workspace',
      );
      expect(Logger.info).toHaveBeenCalledWith('Screen resolution set to 1920x1080');
    });

    it('should set screen resolution with HiDPI on macOS', async () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      (ScriptExecutor.executeScriptAsync as jest.Mock).mockResolvedValue('');

      await MacOSActionsService.setScreenResolution(1920, 1080, true);

      expect(ScriptExecutor.executeScriptAsync).toHaveBeenCalledWith(
        'displayplacer "id:main scaled:1920x1080"',
        '/test/workspace',
      );
      expect(Logger.info).toHaveBeenCalledWith('Screen resolution set to 1920x1080 (HiDPI)');
    });

    it('should show warning when displayplacer is not available', async () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      const error = new Error('displayplacer: command not found');
      (ScriptExecutor.executeScriptAsync as jest.Mock).mockRejectedValue(error);

      await MacOSActionsService.setScreenResolution(1920, 1080, false);

      expect(Notifications.warning).toHaveBeenCalledWith(
        expect.stringContaining('displayplacer'),
      );
    });

    it('should show warning when trying to set resolution on non-macOS', async () => {
      (os.platform as jest.Mock).mockReturnValue('linux');

      await MacOSActionsService.setScreenResolution(1920, 1080, false);

      expect(Notifications.warning).toHaveBeenCalledWith(
        'Screen resolution control is only available on macOS.',
      );
      expect(ScriptExecutor.executeScriptAsync).not.toHaveBeenCalled();
    });
  });

  describe('Caffeine (Sleep Prevention)', () => {
    beforeEach(() => {
      (Extension.getInstance as jest.Mock).mockReturnValue({
        workspaceFolder: { uri: { fsPath: '/test/workspace' } },
      });
    });

    it('should enable caffeine indefinitely on macOS', async () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      (ScriptExecutor.executeScriptAsync as jest.Mock).mockResolvedValue('12345\n');

      await MacOSActionsService.enableCaffeine();

      expect(ScriptExecutor.executeScriptAsync).toHaveBeenCalledWith(
        expect.stringContaining('caffeinate -d -i'),
        '/test/workspace',
      );
      expect(Logger.info).toHaveBeenCalledWith(expect.stringContaining('indefinitely'));
      expect(Notifications.info).toHaveBeenCalledWith(
        'System sleep prevention enabled indefinitely',
      );
    });

    it('should enable caffeine for specified duration on macOS', async () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      (ScriptExecutor.executeScriptAsync as jest.Mock).mockResolvedValue('12345\n');

      await MacOSActionsService.enableCaffeine(30);

      expect(ScriptExecutor.executeScriptAsync).toHaveBeenCalledWith(
        expect.stringContaining('caffeinate -d -i -t 1800'),
        '/test/workspace',
      );
      expect(Logger.info).toHaveBeenCalledWith(expect.stringContaining('30 minutes'));
      expect(Notifications.info).toHaveBeenCalledWith(
        'System sleep prevention enabled for 30 minutes',
      );
    });

    it('should disable caffeine on macOS', async () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      (ScriptExecutor.executeScriptAsync as jest.Mock)
        .mockResolvedValueOnce('12345\n12346\n') // pgrep returns PIDs
        .mockResolvedValueOnce(''); // pkill succeeds

      await MacOSActionsService.disableCaffeine();

      expect(ScriptExecutor.executeScriptAsync).toHaveBeenCalledWith(
        'pgrep -f "^caffeinate -d -i"',
        '/test/workspace',
      );
      expect(ScriptExecutor.executeScriptAsync).toHaveBeenCalledWith(
        'pkill -f "^caffeinate -d -i"',
        '/test/workspace',
      );
      expect(Logger.info).toHaveBeenCalledWith('Caffeine disabled');
      expect(Notifications.info).toHaveBeenCalledWith('System sleep prevention disabled');
    });

    it('should handle disabling caffeine when no process is running', async () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      const error = new Error('No matching processes');
      (ScriptExecutor.executeScriptAsync as jest.Mock).mockRejectedValueOnce(error);

      await MacOSActionsService.disableCaffeine();

      expect(Logger.info).toHaveBeenCalledWith('Caffeine disabled (no processes found)');
    });

    it('should show warning when trying to enable caffeine on non-macOS', async () => {
      (os.platform as jest.Mock).mockReturnValue('linux');

      await MacOSActionsService.enableCaffeine();

      expect(Notifications.warning).toHaveBeenCalledWith('Caffeine is only available on macOS.');
      expect(ScriptExecutor.executeScriptAsync).not.toHaveBeenCalled();
    });

    it('should show error when enabling caffeine fails', async () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      const error = new Error('Failed to start caffeinate');
      (ScriptExecutor.executeScriptAsync as jest.Mock).mockRejectedValue(error);

      await MacOSActionsService.enableCaffeine();

      expect(Notifications.error).toHaveBeenCalledWith(
        'Failed to enable Caffeine: Failed to start caffeinate',
      );
    });
  });
});
