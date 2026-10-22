let settingValue: boolean | undefined;
jest.mock('../src/services/Extension', () => ({
  Extension: { getInstance: () => ({ getSetting: () => settingValue }) },
}));

import { CheckpointService } from '../src/services/CheckpointService';

const act = (sceneCheckpoints?: boolean) => ({ title: 'Act', demos: [], sceneCheckpoints });

describe('CheckpointService.isEnabled', () => {
  beforeEach(() => {
    settingValue = undefined;
  });

  it('is off by default', () => {
    expect(CheckpointService.isEnabled(act())).toBe(false);
    expect(CheckpointService.isEnabled(undefined)).toBe(false);
  });

  it('follows the setting', () => {
    settingValue = true;
    expect(CheckpointService.isEnabled(act())).toBe(true);
  });

  it('lets the act override the setting', () => {
    settingValue = true;
    expect(CheckpointService.isEnabled(act(false))).toBe(false);
    settingValue = false;
    expect(CheckpointService.isEnabled(act(true))).toBe(true);
  });

  it('keeps the act property when normalizing a version 3 act', () => {
    const { normalizeDemoConfig } = jest.requireActual('@demotime/common');
    const normalized = normalizeDemoConfig({
      title: 'Act',
      version: 3,
      sceneCheckpoints: true,
      scenes: [{ title: 'Scene', moves: [] }],
    });
    expect(normalized.sceneCheckpoints).toBe(true);
  });
});
