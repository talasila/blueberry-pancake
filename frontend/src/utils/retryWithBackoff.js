/**
 * Default retryable check — returns true for network errors, 5xx, and timeouts
 * @param {Error} error - The error to check
 * @returns {boolean} Whether the error is retryable
 */
function defaultIsRetryable(error) {
  if (
    error.message?.includes('Failed to fetch') ||
    error.message?.includes('network') ||
    error.message?.includes('timeout')
  ) {
    return true;
  }
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  return false;
}

/**
 * Retry an async function with linear backoff
 *
 * @param {Function} fn - Async function to call
 * @param {object} [options]
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.baseDelay=1000] - Base delay in ms (multiplied by attempt number)
 * @param {Function} [options.isRetryable] - Predicate that receives the error and returns
 *   true if the operation should be retried. Defaults to retrying network errors, 5xx, timeouts.
 * @returns {Promise<*>} Result of fn()
 */
export async function retryWithBackoff(
  fn,
  { maxRetries = 3, baseDelay = 1000, isRetryable = defaultIsRetryable } = {}
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If not retryable, throw immediately
      if (!isRetryable(error)) {
        throw error;
      }

      // If we've exhausted retries, throw
      if (attempt >= maxRetries) {
        throw error;
      }

      // Wait with backoff: baseDelay * (attempt + 1)
      const delay = baseDelay * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but just in case
  throw lastError;
}
