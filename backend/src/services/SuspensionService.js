import dataRepository from '../data/DynamoDBRepository.js';

/**
 * Suspension Service
 * Tracks email suspensions and failed authentication attempts
 * Uses DynamoDB with TTL for automatic expiration
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
   * @returns {Promise<{suspended: boolean, endTime?: number, reason?: string}>}
   */
  async isSuspended(email) {
    if (!email) {
      return { suspended: false };
    }

    try {
      const suspension = await dataRepository.getSuspension(email);

      if (!suspension) {
        return { suspended: false };
      }

      // DynamoDB TTL handles expiration, but double-check
      const now = Date.now();
      const endTime = new Date(suspension.expiresAt).getTime();
      if (now >= endTime) {
        return { suspended: false };
      }

      return {
        suspended: true,
        endTime,
        reason: suspension.reason
      };
    } catch (error) {
      console.error(`Error checking suspension for ${email}:`, error);
      return { suspended: false };
    }
  }

  /**
   * Record a failed authentication attempt
   * Suspends email if max attempts reached
   * @param {string} email - Email address
   * @returns {Promise<{suspended: boolean, attempts: number, maxReached: boolean}>}
   */
  async recordFailedAttempt(email) {
    if (!email) {
      return { suspended: false, attempts: 0, maxReached: false };
    }

    try {
      // Increment failed attempts counter
      const attempts = await dataRepository.incrementFailedAttempts(email, this.SUSPENSION_SECONDS);

      // Check if max attempts reached
      if (attempts >= this.MAX_FAILED_ATTEMPTS) {
        await this.suspendEmail(email);
        return {
          suspended: true,
          attempts,
          maxReached: true
        };
      }

      return {
        suspended: false,
        attempts,
        maxReached: false
      };
    } catch (error) {
      console.error(`Error recording failed attempt for ${email}:`, error);
      return { suspended: false, attempts: 0, maxReached: false };
    }
  }

  /**
   * Suspend email address for 5 minutes
   * @param {string} email - Email address
   * @returns {Promise<boolean>} True if suspended
   */
  async suspendEmail(email) {
    if (!email) {
      return false;
    }

    try {
      await dataRepository.suspendUser(email, 'failed_attempts_exceeded', this.SUSPENSION_SECONDS);
      // Reset failed attempt counter
      await dataRepository.resetFailedAttempts(email);
      return true;
    } catch (error) {
      console.error(`Error suspending email ${email}:`, error);
      return false;
    }
  }

  /**
   * Reset failed attempt counter (on successful authentication)
   * @param {string} email - Email address
   * @returns {Promise<boolean>} True if reset
   */
  async resetFailedAttempts(email) {
    if (!email) {
      return false;
    }

    try {
      await dataRepository.resetFailedAttempts(email);
      return true;
    } catch (error) {
      console.error(`Error resetting failed attempts for ${email}:`, error);
      return false;
    }
  }

  /**
   * Get failed attempt count for an email
   * Note: This is async now, returns count from DynamoDB
   * @param {string} email - Email address
   * @returns {Promise<number>} Number of failed attempts
   */
  async getFailedAttempts(email) {
    if (!email) {
      return 0;
    }

    try {
      // Query the failed attempts record
      const result = await dataRepository.getRateLimit(email, 'failed');
      return result?.count || 0;
    } catch (error) {
      console.error(`Error getting failed attempts for ${email}:`, error);
      return 0;
    }
  }

  /**
   * Clear suspension for an email (for testing)
   * @param {string} email - Email address
   * @returns {Promise<boolean>} True if cleared
   */
  async clearSuspension(email) {
    if (!email) {
      return false;
    }

    try {
      await dataRepository.removeSuspension(email);
      return true;
    } catch (error) {
      console.error(`Error clearing suspension for ${email}:`, error);
      return false;
    }
  }
}

export default new SuspensionService();
