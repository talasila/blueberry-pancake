import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/data/DynamoDBRepository.js', () => ({
  default: {
    getRateLimit: vi.fn(),
    incrementRateLimit: vi.fn(),
    resetRateLimit: vi.fn()
  }
}));

vi.mock('../../src/logging/Logger.js', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../src/utils/environment.js', () => ({
  isProduction: vi.fn(() => false),
  isDevelopment: vi.fn(() => true),
  isTest: vi.fn(() => true)
}));

import rateLimitService from '../../src/services/RateLimitService.js';
import dataRepository from '../../src/data/DynamoDBRepository.js';

describe('RateLimitService', () => {
  const EMAIL_LIMIT = 1000;
  const IP_LIMIT = 1000;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkEmailLimit', () => {
    it('should allow first request', async () => {
      dataRepository.getRateLimit.mockResolvedValue(null);
      dataRepository.incrementRateLimit.mockResolvedValue({
        count: 1,
        windowStart: new Date().toISOString()
      });

      const result = await rateLimitService.checkEmailLimit('test@example.com');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(EMAIL_LIMIT - 1);
    });

    it('should allow up to EMAIL_LIMIT requests', async () => {
      const windowStart = new Date().toISOString();
      dataRepository.getRateLimit.mockResolvedValue({ count: EMAIL_LIMIT - 1, windowStart });
      dataRepository.incrementRateLimit.mockResolvedValue({ count: EMAIL_LIMIT, windowStart });

      const result = await rateLimitService.checkEmailLimit('test@example.com');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should block request after EMAIL_LIMIT exceeded', async () => {
      const windowStart = new Date().toISOString();
      dataRepository.getRateLimit.mockResolvedValue({ count: EMAIL_LIMIT, windowStart });

      const result = await rateLimitService.checkEmailLimit('test@example.com');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('checkIPLimit', () => {
    it('should allow first request', async () => {
      dataRepository.getRateLimit.mockResolvedValue(null);
      dataRepository.incrementRateLimit.mockResolvedValue({
        count: 1,
        windowStart: new Date().toISOString()
      });

      const result = await rateLimitService.checkIPLimit('192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(IP_LIMIT - 1);
    });

    it('should allow up to IP_LIMIT requests', async () => {
      const windowStart = new Date().toISOString();
      dataRepository.getRateLimit.mockResolvedValue({ count: IP_LIMIT - 1, windowStart });
      dataRepository.incrementRateLimit.mockResolvedValue({ count: IP_LIMIT, windowStart });

      const result = await rateLimitService.checkIPLimit('192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should block request after IP_LIMIT exceeded', async () => {
      const windowStart = new Date().toISOString();
      dataRepository.getRateLimit.mockResolvedValue({ count: IP_LIMIT, windowStart });

      const result = await rateLimitService.checkIPLimit('192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('checkLimits', () => {
    it('should allow when both email and IP are within limits', async () => {
      dataRepository.getRateLimit.mockResolvedValue(null);
      dataRepository.incrementRateLimit.mockResolvedValue({
        count: 1,
        windowStart: new Date().toISOString()
      });

      const result = await rateLimitService.checkLimits('test@example.com', '192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.remaining.email).toBe(EMAIL_LIMIT - 1);
      expect(result.remaining.ip).toBe(IP_LIMIT - 1);
    });

    it('should block when email limit exceeded', async () => {
      const windowStart = new Date().toISOString();

      dataRepository.getRateLimit.mockImplementation((identifier, type) => {
        if (type === 'email') return Promise.resolve({ count: EMAIL_LIMIT, windowStart });
        return Promise.resolve(null);
      });
      dataRepository.incrementRateLimit.mockResolvedValue({ count: 1, windowStart });

      const result = await rateLimitService.checkLimits('test@example.com', '192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.type).toBe('email');
    });

    it('should block when IP limit exceeded', async () => {
      const windowStart = new Date().toISOString();

      dataRepository.getRateLimit.mockImplementation((identifier, type) => {
        if (type === 'ip') return Promise.resolve({ count: IP_LIMIT, windowStart });
        return Promise.resolve(null);
      });
      dataRepository.incrementRateLimit.mockResolvedValue({ count: 1, windowStart });

      const result = await rateLimitService.checkLimits('test@example.com', '192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.type).toBe('ip');
    });
  });
});
