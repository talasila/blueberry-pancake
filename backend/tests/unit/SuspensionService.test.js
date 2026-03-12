import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/data/DynamoDBRepository.js', () => ({
  default: {
    getSuspension: vi.fn(),
    incrementFailedAttempts: vi.fn(),
    suspendUser: vi.fn(),
    resetFailedAttempts: vi.fn(),
    removeSuspension: vi.fn(),
    getRateLimit: vi.fn()
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

import suspensionService from '../../src/services/SuspensionService.js';
import dataRepository from '../../src/data/DynamoDBRepository.js';

describe('SuspensionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isSuspended', () => {
    it('should return false for non-suspended email', async () => {
      dataRepository.getSuspension.mockResolvedValue(null);

      const result = await suspensionService.isSuspended('test@example.com');
      expect(result.suspended).toBe(false);
    });

    it('should return true for suspended email', async () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      dataRepository.getSuspension.mockResolvedValue({
        expiresAt: futureDate,
        reason: 'failed_attempts_exceeded'
      });

      const result = await suspensionService.isSuspended('test@example.com');
      expect(result.suspended).toBe(true);
      expect(result.reason).toBe('failed_attempts_exceeded');
    });
  });

  describe('recordFailedAttempt', () => {
    it('should track failed attempts', async () => {
      dataRepository.incrementFailedAttempts.mockResolvedValueOnce(1);
      const result1 = await suspensionService.recordFailedAttempt('test@example.com');
      expect(result1.suspended).toBe(false);
      expect(result1.attempts).toBe(1);

      dataRepository.incrementFailedAttempts.mockResolvedValueOnce(2);
      const result2 = await suspensionService.recordFailedAttempt('test@example.com');
      expect(result2.suspended).toBe(false);
      expect(result2.attempts).toBe(2);
    });

    it('should suspend after 5 failed attempts', async () => {
      dataRepository.incrementFailedAttempts
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(5);
      dataRepository.suspendUser.mockResolvedValue(undefined);
      dataRepository.resetFailedAttempts.mockResolvedValue(undefined);

      for (let i = 0; i < 4; i++) {
        await suspensionService.recordFailedAttempt('test@example.com');
      }

      const result = await suspensionService.recordFailedAttempt('test@example.com');
      expect(result.suspended).toBe(true);
      expect(result.attempts).toBe(5);
      expect(result.maxReached).toBe(true);

      expect(dataRepository.suspendUser).toHaveBeenCalledWith(
        'test@example.com', 'failed_attempts_exceeded', 300
      );

      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      dataRepository.getSuspension.mockResolvedValue({
        expiresAt: futureDate,
        reason: 'failed_attempts_exceeded'
      });
      const suspended = await suspensionService.isSuspended('test@example.com');
      expect(suspended.suspended).toBe(true);
    });
  });

  describe('suspendEmail', () => {
    it('should suspend email for 5 minutes', async () => {
      dataRepository.suspendUser.mockResolvedValue(undefined);
      dataRepository.resetFailedAttempts.mockResolvedValue(undefined);

      const result = await suspensionService.suspendEmail('test@example.com');
      expect(result).toBe(true);
      expect(dataRepository.suspendUser).toHaveBeenCalledWith(
        'test@example.com', 'failed_attempts_exceeded', 300
      );

      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      dataRepository.getSuspension.mockResolvedValue({
        expiresAt: futureDate,
        reason: 'failed_attempts_exceeded'
      });
      const suspended = await suspensionService.isSuspended('test@example.com');
      expect(suspended.suspended).toBe(true);
      expect(suspended.endTime).toBeGreaterThan(Date.now());
    });
  });

  describe('resetFailedAttempts', () => {
    it('should reset failed attempt counter', async () => {
      dataRepository.resetFailedAttempts.mockResolvedValue(undefined);
      dataRepository.getRateLimit.mockResolvedValue(null);

      const result = await suspensionService.resetFailedAttempts('test@example.com');
      expect(result).toBe(true);
      expect(dataRepository.resetFailedAttempts).toHaveBeenCalledWith('test@example.com');

      const attempts = await suspensionService.getFailedAttempts('test@example.com');
      expect(attempts).toBe(0);
    });
  });

  describe('getFailedAttempts', () => {
    it('should return 0 for email with no attempts', async () => {
      dataRepository.getRateLimit.mockResolvedValue(null);

      const result = await suspensionService.getFailedAttempts('test@example.com');
      expect(result).toBe(0);
    });

    it('should return correct count of failed attempts', async () => {
      dataRepository.getRateLimit.mockResolvedValue({ count: 2 });

      const result = await suspensionService.getFailedAttempts('test@example.com');
      expect(result).toBe(2);
    });
  });

  describe('clearSuspension', () => {
    it('should clear suspension for email', async () => {
      dataRepository.removeSuspension.mockResolvedValue(undefined);
      dataRepository.getSuspension.mockResolvedValue(null);

      const result = await suspensionService.clearSuspension('test@example.com');
      expect(result).toBe(true);
      expect(dataRepository.removeSuspension).toHaveBeenCalledWith('test@example.com');

      const suspended = await suspensionService.isSuspended('test@example.com');
      expect(suspended.suspended).toBe(false);
    });
  });
});
