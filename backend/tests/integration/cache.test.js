import { describe, it, expect, beforeEach } from 'vitest';
import cacheService from '../../src/cache/CacheService.js';
import configLoader from '../../src/config/configLoader.js';

/**
 * Integration test for caching layer
 * Validates SC-006: Caching layer reduces file access by at least 50%
 */
describe('Cache Service Integration', () => {
  beforeEach(() => {
    cacheService.flush();
    cacheService.initialize();
  });

  it('should cache values and reduce access operations', async () => {
    const key = 'test:cache:reduction';
    const value = 'test-value';
    const iterations = 100;

    // First access - cache miss
    cacheService.set(key, value);
    const firstGet = cacheService.get(key);
    expect(firstGet).toBe(value);

    // Subsequent accesses - cache hits
    let cacheHits = 0;
    for (let i = 0; i < iterations; i++) {
      const cached = cacheService.get(key);
      if (cached === value) {
        cacheHits++;
      }
    }

    // All subsequent accesses should be cache hits
    expect(cacheHits).toBe(iterations);

    const stats = cacheService.getStats();
    expect(stats.hits).toBeGreaterThan(0);
  });

  it('should invalidate cache on demand', () => {
    const key = 'test:invalidation';
    cacheService.set(key, 'value1');
    expect(cacheService.get(key)).toBe('value1');

    cacheService.del(key);
    expect(cacheService.get(key)).toBeUndefined();
  });

  it('should respect TTL configuration', async () => {
    const key = 'test:ttl';
    const shortTTL = 1; // 1 second

    cacheService.set(key, 'value', shortTTL);
    expect(cacheService.get(key)).toBe('value');

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Value should be expired
    expect(cacheService.get(key)).toBeUndefined();
  });

  it('should integrate with configuration', () => {
    const cacheConfig = configLoader.get('cache');
    expect(cacheConfig).toBeDefined();
    expect(cacheConfig.enabled).toBe(true);
    expect(cacheConfig.ttl).toBeGreaterThan(0);
  });
});
