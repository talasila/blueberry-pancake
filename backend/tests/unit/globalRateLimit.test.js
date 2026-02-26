import { describe, it, expect, beforeEach, vi } from 'vitest';

const { dataRepository } = vi.hoisted(() => ({
  dataRepository: {
    getRateLimit: vi.fn(),
    incrementRateLimit: vi.fn(),
    resetRateLimit: vi.fn(),
  },
}));

vi.mock('../../src/data/DynamoDBRepository.js', () => ({
  default: dataRepository,
}));

import rateLimitService from '../../src/services/RateLimitService.js';

describe('RateLimitService.checkGlobalLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns allowed:true when no existing counter (getRateLimit returns null)', async () => {
    dataRepository.getRateLimit.mockResolvedValue(null);
    dataRepository.incrementRateLimit.mockResolvedValue({
      count: 1,
      windowStart: new Date().toISOString(),
    });

    const result = await rateLimitService.checkGlobalLimit();

    expect(result).toEqual({ allowed: true });
    expect(dataRepository.getRateLimit).toHaveBeenCalledWith('global', 'otp-request');
    expect(dataRepository.incrementRateLimit).toHaveBeenCalledWith('global', 'otp-request', 60);
  });

  it('returns allowed:true when counter is under the limit', async () => {
    const windowStart = new Date(Date.now() - 10000).toISOString();
    dataRepository.getRateLimit.mockResolvedValue({
      count: 50,
      windowStart,
    });
    dataRepository.incrementRateLimit.mockResolvedValue({
      count: 51,
      windowStart,
    });

    const result = await rateLimitService.checkGlobalLimit();

    expect(result).toEqual({ allowed: true });
  });

  it('returns allowed:false with retryAfter when counter exceeds limit', async () => {
    const windowStart = new Date(Date.now() - 10000).toISOString();
    dataRepository.getRateLimit.mockResolvedValue({
      count: 10000,
      windowStart,
    });
    dataRepository.incrementRateLimit.mockResolvedValue({
      count: 10001,
      windowStart,
    });

    const result = await rateLimitService.checkGlobalLimit();

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(60);
  });

  it('returns allowed:true after window expires (getRateLimit returns expired record)', async () => {
    dataRepository.getRateLimit.mockResolvedValue(null);

    dataRepository.incrementRateLimit.mockResolvedValue({
      count: 1,
      windowStart: new Date().toISOString(),
    });

    const result = await rateLimitService.checkGlobalLimit();

    expect(result).toEqual({ allowed: true });
  });

  it('returns allowed:true (fail-open) when DynamoDB getRateLimit throws', async () => {
    dataRepository.getRateLimit.mockRejectedValue(new Error('DynamoDB error'));

    const result = await rateLimitService.checkGlobalLimit();

    expect(result).toEqual({ allowed: true });
  });

  it('returns allowed:true (fail-open) when DynamoDB incrementRateLimit throws', async () => {
    dataRepository.getRateLimit.mockResolvedValue(null);
    dataRepository.incrementRateLimit.mockRejectedValue(new Error('DynamoDB error'));

    const result = await rateLimitService.checkGlobalLimit();

    expect(result).toEqual({ allowed: true });
  });

  it('uses limit of 100 when NODE_ENV=production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();

    const { default: prodRateLimitService } = await import('../../src/services/RateLimitService.js');

    const windowStart = new Date(Date.now() - 10000).toISOString();
    dataRepository.getRateLimit.mockResolvedValue({
      count: 100,
      windowStart,
    });
    dataRepository.incrementRateLimit.mockResolvedValue({
      count: 101,
      windowStart,
    });

    const result = await prodRateLimitService.checkGlobalLimit();

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
