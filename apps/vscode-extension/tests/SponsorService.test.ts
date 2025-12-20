import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { General } from '../src/constants/General';

// Mock vscode
jest.mock(
  'vscode',
  () => ({
    authentication: {
      getSession: jest.fn(),
    },
    commands: {
      registerCommand: jest.fn(),
      executeCommand: jest.fn(),
    },
  }),
  { virtual: true },
);

jest.mock('../src/services/Extension');

describe('SponsorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constants', () => {
    it('should have the correct sponsor API URL', () => {
      expect(General.sponsorApiUrl).toBe('https://demotime.show/api/sponsor');
    });

    it('should have the correct minimum sponsor tier', () => {
      expect(General.minSponsorTier).toBe(10);
    });
  });
});
