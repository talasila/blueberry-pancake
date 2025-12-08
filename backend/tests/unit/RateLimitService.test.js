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
  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.clear();
  });

  describe('checkEmailLimit', () => {
    it('should allow first request', () => {
      const result = rateLimitService.checkEmailLimit('test@example.com');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // 3 - 1
    });

    it('should allow up to 3 requests', () => {
      for (let i = 0; i < 3; i++) {
        const result = rateLimitService.checkEmailLimit('test@example.com');
        expect(result.allowed).toBe(true);
      }
    });

    it('should block 4th request', () => {
      // Make 3 requests
      for (let i = 0; i < 3; i++) {
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
      expect(result.remaining).toBe(4); // 5 - 1
    });

    it('should allow up to 5 requests', () => {
      for (let i = 0; i < 5; i++) {
        const result = rateLimitService.checkIPLimit('192.168.1.1');
        expect(result.allowed).toBe(true);
      }
    });

    it('should block 6th request', () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
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
      expect(result.remaining.email).toBe(2);
      expect(result.remaining.ip).toBe(4);
    });

    it('should block when email limit exceeded', () => {
      // Exceed email limit
      for (let i = 0; i < 3; i++) {
        rateLimitService.checkEmailLimit('test@example.com');
      }

      const result = rateLimitService.checkLimits('test@example.com', '192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.type).toBe('email');
    });

    it('should block when IP limit exceeded', () => {
      // Exceed IP limit
      for (let i = 0; i < 5; i++) {
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
      expect(before.remaining).toBe(1);

      rateLimitService.resetLimit('test@example.com', 'email');
      const after = rateLimitService.checkEmailLimit('test@example.com');
      expect(after.remaining).toBe(2); // Reset, so back to 2 remaining
    });
  });
});
