import { describe, it, expect } from 'vitest';

/**
 * Example unit test to verify Vitest setup
 */
describe('Vitest Setup', () => {
  it('should run unit tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
