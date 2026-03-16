import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff } from '../../../src/utils/retryWithBackoff.js';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on successful first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable failure and eventually succeeds', async () => {
    const networkError = new Error('Failed to fetch');
    const fn = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce('success');

    const promise = retryWithBackoff(fn, { maxRetries: 3, baseDelay: 100 });

    // First call fails immediately, then waits 100ms before retry
    await vi.advanceTimersByTimeAsync(100);
    // Second call fails, then waits 200ms before retry
    await vi.advanceTimersByTimeAsync(200);
    // Third call succeeds

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after max retries are exceeded', async () => {
    vi.useRealTimers();
    const networkError = new Error('Failed to fetch');
    const fn = vi.fn().mockRejectedValue(networkError);

    await expect(
      retryWithBackoff(fn, { maxRetries: 2, baseDelay: 1 })
    ).rejects.toThrow('Failed to fetch');

    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    vi.useFakeTimers();
  });

  it('throws immediately for non-retryable errors', async () => {
    const validationError = new Error('Invalid input');
    const fn = vi.fn().mockRejectedValue(validationError);

    await expect(
      retryWithBackoff(fn, { maxRetries: 3, baseDelay: 100 })
    ).rejects.toThrow('Invalid input');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses custom isRetryable predicate', async () => {
    const customError = new Error('custom retryable');
    const fn = vi.fn()
      .mockRejectedValueOnce(customError)
      .mockResolvedValueOnce('done');

    const isRetryable = (err) => err.message === 'custom retryable';

    const promise = retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelay: 50,
      isRetryable
    });

    await vi.advanceTimersByTimeAsync(50);

    const result = await promise;
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('applies correct backoff timing (baseDelay * (attempt + 1))', async () => {
    const networkError = new Error('timeout');
    const fn = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce('ok');

    const promise = retryWithBackoff(fn, { maxRetries: 3, baseDelay: 1000 });

    // After attempt 0 fails, delay = 1000 * (0+1) = 1000ms
    expect(fn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(fn).toHaveBeenCalledTimes(1); // Not yet

    await vi.advanceTimersByTimeAsync(1);
    // Now at 1000ms, attempt 1 fires
    expect(fn).toHaveBeenCalledTimes(2);

    // After attempt 1 fails, delay = 1000 * (1+1) = 2000ms
    await vi.advanceTimersByTimeAsync(1999);
    expect(fn).toHaveBeenCalledTimes(2); // Not yet

    await vi.advanceTimersByTimeAsync(1);
    // Now at 2000ms more, attempt 2 fires
    expect(fn).toHaveBeenCalledTimes(3);

    const result = await promise;
    expect(result).toBe('ok');
  });

  it('retries for 5xx status errors by default', async () => {
    const serverError = new Error('Server error');
    serverError.status = 503;
    const fn = vi.fn()
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce('recovered');

    const promise = retryWithBackoff(fn, { maxRetries: 1, baseDelay: 100 });

    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry for 4xx status errors by default', async () => {
    const clientError = new Error('Not found');
    clientError.status = 404;
    const fn = vi.fn().mockRejectedValue(clientError);

    await expect(
      retryWithBackoff(fn, { maxRetries: 3, baseDelay: 100 })
    ).rejects.toThrow('Not found');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses default options when none provided', async () => {
    const networkError = new Error('network');
    const fn = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce('ok');

    const promise = retryWithBackoff(fn);

    // Default baseDelay is 1000
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe('ok');
  });
});
