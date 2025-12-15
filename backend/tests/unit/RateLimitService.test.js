import { describe, it, expect, beforeEach, vi } from 'vitest';
import rateLimitService from '../../src/services/RateLimitService.js';
import cacheService from '../../src/cache/CacheService.js';

// Mock cache service
const mockCache = new Map();
vi.mock('../../src/cache/CacheService.js', () => {
  return {
    default: {
      initialize: vi.fn(),
      set: vi.fn((key, value, ttl) => {
        mockCache.set(key, value);
        return true;
      }),
      get: vi.fn((key) => {
        return mockCache.get(key);
      }),
      del: vi.fn((key) => {
        return mockCache.delete(key) ? 1 : 0;
      })
    }
  };
});

describe('RateLimitService', () => {
  // Note: Rate limits are environment-aware
  // In test/development: EMAIL_LIMIT=10, IP_LIMIT=20
  // In production: EMAIL_LIMIT=3, IP_LIMIT=5
  const isProduction = process.env.NODE_ENV === 'production';
  const EMAIL_LIMIT = isProduction ? 3 : 10;
  const IP_LIMIT = isProduction ? 5 : 20;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.clear();
  });

  describe('checkEmailLimit', () => {
    it('should allow first request', () => {
      const result = rateLimitService.checkEmailLimit('test@example.com');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(EMAIL_LIMIT - 1);
    });

    it('should allow up to EMAIL_LIMIT requests', () => {
      for (let i = 0; i < EMAIL_LIMIT; i++) {
        const result = rateLimitService.checkEmailLimit('test@example.com');
        expect(result.allowed).toBe(true);
      }
    });

    it('should block request after EMAIL_LIMIT exceeded', () => {
      // Make EMAIL_LIMIT requests
      for (let i = 0; i < EMAIL_LIMIT; i++) {
        rateLimitService.checkEmailLimit('test@example.com');
      }

      const result = rateLimitService.checkEmailLimit('test@example.com');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('checkIPLimit', () => {
    it('should allow first request', () => {
      const result = rateLimitService.checkIPLimit('192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(IP_LIMIT - 1);
    });

    it('should allow up to IP_LIMIT requests', () => {
      for (let i = 0; i < IP_LIMIT; i++) {
        const result = rateLimitService.checkIPLimit('192.168.1.1');
        expect(result.allowed).toBe(true);
      }
    });

    it('should block request after IP_LIMIT exceeded', () => {
      // Make IP_LIMIT requests
      for (let i = 0; i < IP_LIMIT; i++) {
        rateLimitService.checkIPLimit('192.168.1.1');
      }

      const result = rateLimitService.checkIPLimit('192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('checkLimits', () => {
    it('should allow when both email and IP are within limits', () => {
      const result = rateLimitService.checkLimits('test@example.com', '192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.remaining.email).toBe(EMAIL_LIMIT - 1);
      expect(result.remaining.ip).toBe(IP_LIMIT - 1);
    });

    it('should block when email limit exceeded', () => {
      // Exceed email limit
      for (let i = 0; i < EMAIL_LIMIT; i++) {
        rateLimitService.checkEmailLimit('test@example.com');
      }

      const result = rateLimitService.checkLimits('test@example.com', '192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.type).toBe('email');
    });

    it('should block when IP limit exceeded', () => {
      // Exceed IP limit
      for (let i = 0; i < IP_LIMIT; i++) {
        rateLimitService.checkIPLimit('192.168.1.1');
      }

      const result = rateLimitService.checkLimits('test@example.com', '192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.type).toBe('ip');
    });
  });

  describe('resetLimit', () => {
    it('should reset rate limit for identifier', () => {
      rateLimitService.checkEmailLimit('test@example.com');
      const before = rateLimitService.checkEmailLimit('test@example.com');
      expect(before.remaining).toBe(EMAIL_LIMIT - 2);

      rateLimitService.resetLimit('test@example.com', 'email');
      const after = rateLimitService.checkEmailLimit('test@example.com');
      expect(after.remaining).toBe(EMAIL_LIMIT - 1); // Reset, so back to EMAIL_LIMIT - 1 remaining
    });
  });
});
