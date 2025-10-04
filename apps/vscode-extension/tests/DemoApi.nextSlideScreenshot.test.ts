import { DemoApi } from '../src/services/DemoApi';
import { SlideScreenshotService } from '../src/services/SlideScreenshotService';
import { Logger } from '../src/services/Logger';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';

// Mock dependencies
jest.mock('../src/services/SlideScreenshotService');
jest.mock('../src/services/Logger');
jest.mock('vscode', () => ({}), { virtual: true });

const SlideScreenshotServiceMock = SlideScreenshotService as jest.Mocked<typeof SlideScreenshotService>;
const LoggerMock = Logger as jest.Mocked<typeof Logger>;

// Helper to create mock Express Request
const createMockRequest = (): Partial<Request> => ({
  method: 'GET',
  body: {},
  query: {},
});

// Helper to create mock Express Response
const createMockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

// Access the private static method via reflection
const callNextSlideScreenshot = async (req: Request, res: Response) => {
  // @ts-ignore - accessing private method for testing
  return await DemoApi['nextSlideScreenshot'](req, res);
};

describe('DemoApi /api/next-slide-screenshot endpoint', () => {
  let mockReq: Request;
  let mockRes: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = createMockRequest() as Request;
    mockRes = createMockResponse();

    LoggerMock.info = jest.fn();
    LoggerMock.error = jest.fn();
  });

  describe('HTTP 200 - Success', () => {
    it('returns 200 status with screenshot in JSON when available', async () => {
      const mockScreenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockResolvedValue(mockScreenshot);

      await callNextSlideScreenshot(mockReq, mockRes);

      expect(LoggerMock.info).toHaveBeenCalledWith('Received request for next slide screenshot');
      expect(SlideScreenshotServiceMock.getNextSlideScreenshot).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ screenshot: mockScreenshot });
    });

    it('returns valid base64 PNG data URI format', async () => {
      const mockScreenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockResolvedValue(mockScreenshot);

      await callNextSlideScreenshot(mockReq, mockRes);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.screenshot).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('HTTP 404 - Not Found', () => {
    it('returns 404 status with error message when no screenshot available', async () => {
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockResolvedValue(null);

      await callNextSlideScreenshot(mockReq, mockRes);

      expect(LoggerMock.info).toHaveBeenCalledWith('Received request for next slide screenshot');
      expect(SlideScreenshotServiceMock.getNextSlideScreenshot).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No next slide available' });
    });

    it('does not call Logger.error for 404 responses', async () => {
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockResolvedValue(null);

      await callNextSlideScreenshot(mockReq, mockRes);

      expect(LoggerMock.error).not.toHaveBeenCalled();
    });
  });

  describe('HTTP 500 - Server Error', () => {
    it('returns 500 status with error message when screenshot generation fails', async () => {
      const error = new Error('Playwright initialization failed');
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockRejectedValue(error);

      await callNextSlideScreenshot(mockReq, mockRes);

      expect(LoggerMock.info).toHaveBeenCalledWith('Received request for next slide screenshot');
      expect(LoggerMock.error).toHaveBeenCalledWith('Failed to generate next slide screenshot - Playwright initialization failed');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to generate screenshot' });
    });

    it('handles generic errors without exposing internal details', async () => {
      const error = new Error('Internal service error with sensitive data');
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockRejectedValue(error);

      await callNextSlideScreenshot(mockReq, mockRes);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.error).toBe('Failed to generate screenshot');
      expect(jsonCall.error).not.toContain('sensitive data');
    });
  });

  describe('Response body contract', () => {
    it('success response contains only screenshot property', async () => {
      const mockScreenshot = 'data:image/png;base64,test123';
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockResolvedValue(mockScreenshot);

      await callNextSlideScreenshot(mockReq, mockRes);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(Object.keys(jsonCall)).toEqual(['screenshot']);
    });

    it('error responses contain only error property', async () => {
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockResolvedValue(null);

      await callNextSlideScreenshot(mockReq, mockRes);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(Object.keys(jsonCall)).toEqual(['error']);
    });
  });

  describe('Logging behavior', () => {
    it('logs info on each request', async () => {
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockResolvedValue('data:image/png;base64,test');

      await callNextSlideScreenshot(mockReq, mockRes);

      expect(LoggerMock.info).toHaveBeenCalledWith('Received request for next slide screenshot');
    });

    it('logs error details when screenshot generation fails', async () => {
      const error = new Error('Test error message');
      SlideScreenshotServiceMock.getNextSlideScreenshot = jest.fn().mockRejectedValue(error);

      await callNextSlideScreenshot(mockReq, mockRes);

      expect(LoggerMock.error).toHaveBeenCalledWith('Failed to generate next slide screenshot - Test error message');
    });
  });
});
