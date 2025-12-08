import { describe, it, expect, beforeEach, vi } from 'vitest';
import suspensionService from '../../src/services/SuspensionService.js';
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

describe('SuspensionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.clear();
  });

  describe('isSuspended', () => {
    it('should return false for non-suspended email', () => {
      const result = suspensionService.isSuspended('test@example.com');
      expect(result.suspended).toBe(false);
    });

    it('should return true for suspended email', () => {
      suspensionService.suspendEmail('test@example.com');
      const result = suspensionService.isSuspended('test@example.com');
      expect(result.suspended).toBe(true);
      expect(result.reason).toBe('failed_attempts_exceeded');
    });
  });

  describe('recordFailedAttempt', () => {
    it('should track failed attempts', () => {
      const result1 = suspensionService.recordFailedAttempt('test@example.com');
      expect(result1.suspended).toBe(false);
      expect(result1.attempts).toBe(1);

      const result2 = suspensionService.recordFailedAttempt('test@example.com');
      expect(result2.suspended).toBe(false);
      expect(result2.attempts).toBe(2);
    });

    it('should suspend after 5 failed attempts', () => {
      // Record 4 attempts
      for (let i = 0; i < 4; i++) {
        suspensionService.recordFailedAttempt('test@example.com');
      }

      const result = suspensionService.recordFailedAttempt('test@example.com');
      expect(result.suspended).toBe(true);
      expect(result.attempts).toBe(5);
      expect(result.maxReached).toBe(true);

      // Verify email is suspended
      const suspended = suspensionService.isSuspended('test@example.com');
      expect(suspended.suspended).toBe(true);
    });
  });

  describe('suspendEmail', () => {
    it('should suspend email for 5 minutes', () => {
      const result = suspensionService.suspendEmail('test@example.com');
      expect(result).toBe(true);

      const suspended = suspensionService.isSuspended('test@example.com');
      expect(suspended.suspended).toBe(true);
      expect(suspended.endTime).toBeGreaterThan(Date.now());
    });
  });

  describe('resetFailedAttempts', () => {
    it('should reset failed attempt counter', () => {
      suspensionService.recordFailedAttempt('test@example.com');
      expect(suspensionService.getFailedAttempts('test@example.com')).toBe(1);

      suspensionService.resetFailedAttempts('test@example.com');
      expect(suspensionService.getFailedAttempts('test@example.com')).toBe(0);
    });
  });

  describe('getFailedAttempts', () => {
    it('should return 0 for email with no attempts', () => {
      expect(suspensionService.getFailedAttempts('test@example.com')).toBe(0);
    });

    it('should return correct count of failed attempts', () => {
      suspensionService.recordFailedAttempt('test@example.com');
      suspensionService.recordFailedAttempt('test@example.com');
      expect(suspensionService.getFailedAttempts('test@example.com')).toBe(2);
    });
  });

  describe('clearSuspension', () => {
    it('should clear suspension for email', () => {
      suspensionService.suspendEmail('test@example.com');
      expect(suspensionService.isSuspended('test@example.com').suspended).toBe(true);

      suspensionService.clearSuspension('test@example.com');
      expect(suspensionService.isSuspended('test@example.com').suspended).toBe(false);
    });
  });
});
