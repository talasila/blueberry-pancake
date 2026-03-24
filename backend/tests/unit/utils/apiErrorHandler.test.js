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

import {
  badRequestError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  rateLimitError,
  formatRateLimitResponse
} from '../../../src/utils/apiErrorHandler.js';

describe('error code parameter', () => {
  let mockRes;
  let jsonSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    mockRes = {
      status: vi.fn(() => ({ json: jsonSpy }))
    };
  });

  it('badRequestError includes code when provided', () => {
    badRequestError(mockRes, 'Invalid input', 'INVALID_EMAIL');
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'Invalid input', code: 'INVALID_EMAIL' });
  });

  it('badRequestError omits code when not provided', () => {
    badRequestError(mockRes, 'Invalid input');
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'Invalid input' });
  });

  it('unauthorizedError includes code when provided', () => {
    unauthorizedError(mockRes, 'Token expired', 'TOKEN_EXPIRED');
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
  });

  it('unauthorizedError omits code when not provided', () => {
    unauthorizedError(mockRes, 'Token expired');
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'Token expired' });
  });

  it('forbiddenError includes code when provided', () => {
    forbiddenError(mockRes, 'Access denied', 'EVENT_ACCESS_DENIED');
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'Access denied', code: 'EVENT_ACCESS_DENIED' });
  });

  it('forbiddenError omits code when not provided', () => {
    forbiddenError(mockRes, 'Access denied');
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'Access denied' });
  });

  it('notFoundError includes code when provided', () => {
    notFoundError(mockRes, 'Event not found', 'EVENT_NOT_FOUND');
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'Event not found', code: 'EVENT_NOT_FOUND' });
  });

  it('notFoundError omits code when not provided', () => {
    notFoundError(mockRes, 'Event not found');
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'Event not found' });
  });

  it('rateLimitError includes code when provided', () => {
    rateLimitError(mockRes, 'Too many requests', 'RATE_LIMITED');
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'Too many requests', code: 'RATE_LIMITED' });
  });

  it('rateLimitError omits code when not provided', () => {
    rateLimitError(mockRes, 'Too many requests');
    expect(jsonSpy).toHaveBeenCalledWith({ error: 'Too many requests' });
  });

  it('formatRateLimitResponse includes code when provided', () => {
    formatRateLimitResponse(mockRes, { retryAfter: 60 }, 'Too many attempts', 'RATE_LIMITED');
    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Too many attempts. Please try again in 1 minute(s).',
      retryAfter: 60,
      code: 'RATE_LIMITED'
    });
  });

  it('formatRateLimitResponse omits code when not provided', () => {
    formatRateLimitResponse(mockRes, { retryAfter: 60 }, 'Too many attempts');
    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Too many attempts. Please try again in 1 minute(s).',
      retryAfter: 60
    });
  });
});

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
