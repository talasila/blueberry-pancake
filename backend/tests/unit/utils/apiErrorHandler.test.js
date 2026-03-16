import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../../../src/logging/Logger.js', () => ({
  default: {
    info: vi.fn(() => Promise.resolve()),
    warn: vi.fn(() => Promise.resolve()),
    error: vi.fn(() => Promise.resolve())
  }
}));

vi.mock('../../../src/utils/environment.js', () => ({
  isProduction: vi.fn(() => false)
}));

import { formatRateLimitResponse } from '../../../src/utils/apiErrorHandler.js';

describe('formatRateLimitResponse', () => {
  let mockRes;
  let jsonSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    mockRes = {
      status: vi.fn(() => ({ json: jsonSpy }))
    };
  });

  it('should send 429 response with retry-after information', () => {
    const result = { retryAfter: 120 };

    formatRateLimitResponse(mockRes, result);

    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Too many requests. Please try again in 2 minute(s).',
      retryAfter: 120
    });
  });

  it('should use custom message when provided', () => {
    const result = { retryAfter: 60 };

    formatRateLimitResponse(mockRes, result, 'Rate limit exceeded');

    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Rate limit exceeded. Please try again in 1 minute(s).',
      retryAfter: 60
    });
  });

  it('should ceil retryAfter seconds', () => {
    const result = { retryAfter: 59.3 };

    formatRateLimitResponse(mockRes, result);

    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Too many requests. Please try again in 1 minute(s).',
      retryAfter: 60
    });
  });

  it('should handle zero retryAfter gracefully', () => {
    const result = { retryAfter: 0 };

    formatRateLimitResponse(mockRes, result);

    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Too many requests. Please try again in 1 minute(s).',
      retryAfter: 0
    });
  });

  it('should handle missing retryAfter gracefully', () => {
    const result = {};

    formatRateLimitResponse(mockRes, result);

    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Too many requests. Please try again in 1 minute(s).',
      retryAfter: 0
    });
  });

  it('should compute minutes with minimum of 1', () => {
    const result = { retryAfter: 15 };

    formatRateLimitResponse(mockRes, result);

    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Too many requests. Please try again in 1 minute(s).',
      retryAfter: 15
    });
  });

  it('should round minutes up correctly for larger values', () => {
    const result = { retryAfter: 900 };

    formatRateLimitResponse(mockRes, result);

    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Too many requests. Please try again in 15 minute(s).',
      retryAfter: 900
    });
  });
});
