import { getInsertionSpeed } from '../src/utils/getInsertionSpeed';
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

describe('getLineInsertionSpeed', () => {
  beforeEach(() => {
    getInstanceMock.mockReturnValue({ getSetting: jest.fn() });
  });

  it('returns setting value when defined', () => {
    const getSetting = jest.fn().mockReturnValue(50);
    getInstanceMock.mockReturnValue({ getSetting });
    expect(getInsertionSpeed()).toBe(50);
  });

  it('overrides with action delay', () => {
    const getSetting = jest.fn().mockReturnValue(30);
    getInstanceMock.mockReturnValue({ getSetting });
    expect(getInsertionSpeed(100)).toBe(100);
  });

  it('defaults to 25 when not set', () => {
    const getSetting = jest.fn().mockReturnValue(undefined);
    getInstanceMock.mockReturnValue({ getSetting });
    expect(getInsertionSpeed()).toBe(25);
  });
});
