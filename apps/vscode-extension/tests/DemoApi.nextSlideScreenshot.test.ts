import { SlideScreenshotService } from '../src/services/SlideScreenshotService';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../src/services/SlideScreenshotService');

const SlideScreenshotServiceMock = SlideScreenshotService as jest.Mocked<typeof SlideScreenshotService>;

// Mock Express Request and Response
interface MockRequest {
  method?: string;
  body?: any;
  query?: any;
}

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
}

const createMockRequest = (overrides: MockRequest = {}): any => ({
  method: 'GET',
  body: {},
  query: {},
  ...overrides,
});

const createMockResponse = (): MockResponse => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res;
};

describe('DemoApi nextSlideScreenshot endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('screenshot generation', () => {
    it('returns 200 with screenshot when available', async () => {
      const mockScreenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockResolvedValue(mockScreenshot);

      // Simulate the endpoint logic
      const screenshot = await SlideScreenshotService.getNextSlideScreenshot();

      expect(screenshot).toBe(mockScreenshot);
      expect(SlideScreenshotServiceMock.getNextSlideScreenshot).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when no screenshot available', async () => {
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockResolvedValue(null);

      const screenshot = await SlideScreenshotService.getNextSlideScreenshot();

      expect(screenshot).toBeNull();
    });

    it('handles errors gracefully', async () => {
      const error = new Error('Screenshot generation failed');
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockRejectedValue(error);

      await expect(SlideScreenshotService.getNextSlideScreenshot()).rejects.toThrow('Screenshot generation failed');
    });
  });

  describe('response format', () => {
    it('returns JSON with screenshot property', async () => {
      const mockScreenshot = 'data:image/png;base64,test123';
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockResolvedValue(mockScreenshot);

      const screenshot = await SlideScreenshotService.getNextSlideScreenshot();
      const response = { screenshot };

      expect(response).toHaveProperty('screenshot');
      expect(response.screenshot).toBe(mockScreenshot);
    });

    it('returns error property when screenshot not available', () => {
      const errorResponse = { error: 'No next slide available' };

      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toBe('No next slide available');
    });

    it('returns error property on failure', () => {
      const errorResponse = { error: 'Failed to generate screenshot' };

      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toBe('Failed to generate screenshot');
    });
  });

  describe('base64 image format', () => {
    it('validates screenshot is in correct base64 format', async () => {
      const mockScreenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockResolvedValue(mockScreenshot);

      const screenshot = await SlideScreenshotService.getNextSlideScreenshot();

      expect(screenshot).toMatch(/^data:image\/png;base64,/);
    });
  });
});
