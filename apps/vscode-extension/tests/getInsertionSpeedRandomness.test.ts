import { getInsertionSpeedRandomness } from '../src/utils/getInsertionSpeedRandomness';
import { Extension } from '../src/services/Extension';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock(
  'vscode',
  () => ({
    workspace: { getConfiguration: jest.fn() },
  }),
  { virtual: true },
);

jest.mock('../src/services/Extension');

const getInstanceMock = Extension.getInstance as jest.Mock;

describe('getInsertionSpeedRandomness', () => {
  beforeEach(() => {
    getInstanceMock.mockReturnValue({ getSetting: jest.fn() });
  });

  it('returns the setting value when defined', () => {
    const getSetting = jest.fn().mockReturnValue(25);
    getInstanceMock.mockReturnValue({ getSetting });
    expect(getInsertionSpeedRandomness()).toBe(25);
  });

  it('overrides the setting with the action value', () => {
    const getSetting = jest.fn().mockReturnValue(25);
    getInstanceMock.mockReturnValue({ getSetting });
    expect(getInsertionSpeedRandomness(10)).toBe(10);
  });

  it('defaults to 0 when not set', () => {
    const getSetting = jest.fn().mockReturnValue(undefined);
    getInstanceMock.mockReturnValue({ getSetting });
    expect(getInsertionSpeedRandomness()).toBe(0);
  });

  it('clamps negative values to 0', () => {
    const getSetting = jest.fn().mockReturnValue(undefined);
    getInstanceMock.mockReturnValue({ getSetting });
    expect(getInsertionSpeedRandomness(-20)).toBe(0);
  });

  it('clamps values above 100 to 100', () => {
    const getSetting = jest.fn().mockReturnValue(undefined);
    getInstanceMock.mockReturnValue({ getSetting });
    expect(getInsertionSpeedRandomness(150)).toBe(100);
  });
});
