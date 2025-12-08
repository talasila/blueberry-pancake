import cacheService from '../cache/CacheService.js';

/**
 * Suspension Service
 * Tracks email suspensions and failed authentication attempts
 * Suspends email for 5 minutes after 5 failed attempts
 */
class SuspensionService {
  constructor() {
    this.MAX_FAILED_ATTEMPTS = 5;
    this.SUSPENSION_MINUTES = 5;
    this.SUSPENSION_SECONDS = this.SUSPENSION_MINUTES * 60;
  }

  /**
   * Check if email is currently suspended
   * @param {string} email - Email address
   * @returns {{suspended: boolean, endTime?: number, reason?: string}}
   */
  isSuspended(email) {
    if (!email) {
      return { suspended: false };
    }

    cacheService.initialize();
    const key = `suspension:${email}`;
    const suspension = cacheService.get(key);

    if (!suspension) {
      return { suspended: false };
    }

    // Check if suspension has expired (should be handled by TTL, but double-check)
    const now = Date.now();
    if (now >= suspension.endTime) {
      // Suspension expired, clean up
      cacheService.del(key);
      this.resetFailedAttempts(email);
      return { suspended: false };
    }

    return {
      suspended: true,
      endTime: suspension.endTime,
      reason: suspension.reason
    };
  }

  /**
   * Record a failed authentication attempt
   * Suspends email if max attempts reached
   * @param {string} email - Email address
   * @returns {{suspended: boolean, attempts: number, maxReached: boolean}}
   */
  recordFailedAttempt(email) {
    if (!email) {
      return { suspended: false, attempts: 0, maxReached: false };
    }

    cacheService.initialize();

    const attemptsKey = `failed_attempts:${email}`;
    const attemptsRecord = cacheService.get(attemptsKey) || { count: 0, firstAttempt: Date.now() };

    attemptsRecord.count++;
    attemptsRecord.lastAttempt = Date.now();

    // Store with TTL matching suspension duration
    cacheService.set(attemptsKey, attemptsRecord, this.SUSPENSION_SECONDS);

    // Check if max attempts reached
    if (attemptsRecord.count >= this.MAX_FAILED_ATTEMPTS) {
      this.suspendEmail(email);
      return {
        suspended: true,
        attempts: attemptsRecord.count,
        maxReached: true
      };
    }

    return {
      suspended: false,
      attempts: attemptsRecord.count,
      maxReached: false
    };
  }

  /**
   * Suspend email address for 5 minutes
   * @param {string} email - Email address
   * @returns {boolean} True if suspended
   */
  suspendEmail(email) {
    if (!email) {
      return false;
    }

    cacheService.initialize();

    const now = Date.now();
    const endTime = now + (this.SUSPENSION_MINUTES * 60 * 1000);

    const suspension = {
      email,
      startTime: now,
      endTime,
      reason: 'failed_attempts_exceeded'
    };

    const key = `suspension:${email}`;
    cacheService.set(key, suspension, this.SUSPENSION_SECONDS);

    // Reset failed attempt counter (will be cleared when suspension expires)
    this.resetFailedAttempts(email);

    return true;
  }

  /**
   * Reset failed attempt counter (on successful authentication)
   * @param {string} email - Email address
   * @returns {boolean} True if reset
   */
  resetFailedAttempts(email) {
    if (!email) {
      return false;
    }

    cacheService.initialize();
    const key = `failed_attempts:${email}`;
    return cacheService.del(key) > 0;
  }

  /**
   * Get failed attempt count for an email
   * @param {string} email - Email address
   * @returns {number} Number of failed attempts
   */
  getFailedAttempts(email) {
    if (!email) {
      return 0;
    }

    cacheService.initialize();
    const key = `failed_attempts:${email}`;
    const record = cacheService.get(key);
    return record ? record.count : 0;
  }

  /**
   * Clear suspension for an email (for testing)
   * @param {string} email - Email address
   * @returns {boolean} True if cleared
   */
  clearSuspension(email) {
    if (!email) {
      return false;
    }

    cacheService.initialize();
    const key = `suspension:${email}`;
    return cacheService.del(key) > 0;
  }
}

export default new SuspensionService();
