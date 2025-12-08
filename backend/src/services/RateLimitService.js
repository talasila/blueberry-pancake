import cacheService from '../cache/CacheService.js';

/**
 * Rate Limiting Service
 * Implements sliding window rate limiting for email addresses and IP addresses
 * Limits: 3 requests per email per 15 minutes, 5 requests per IP per 15 minutes
 */
class RateLimitService {
  constructor() {
    this.EMAIL_LIMIT = 3;
    this.IP_LIMIT = 5;
    this.WINDOW_MINUTES = 15;
    this.WINDOW_MS = this.WINDOW_MINUTES * 60 * 1000;
    this.WINDOW_SECONDS = this.WINDOW_MINUTES * 60;
  }

  /**
   * Check if request is allowed for email address
   * @param {string} email - Email address
   * @returns {{allowed: boolean, retryAfter?: number, remaining?: number}}
   */
  checkEmailLimit(email) {
    return this._checkLimit(email, 'email', this.EMAIL_LIMIT);
  }

  /**
   * Check if request is allowed for IP address
   * @param {string} ip - IP address
   * @returns {{allowed: boolean, retryAfter?: number, remaining?: number}}
   */
  checkIPLimit(ip) {
    return this._checkLimit(ip, 'ip', this.IP_LIMIT);
  }

  /**
   * Check rate limit for both email and IP
   * Request is blocked if EITHER limit is exceeded (FR-011)
   * @param {string} email - Email address
   * @param {string} ip - IP address
   * @returns {{allowed: boolean, retryAfter?: number, type?: string, remaining?: {email: number, ip: number}}}
   */
  checkLimits(email, ip) {
    const emailResult = this.checkEmailLimit(email);
    const ipResult = this.checkIPLimit(ip);

    // Both must pass
    if (!emailResult.allowed) {
      return {
        allowed: false,
        retryAfter: emailResult.retryAfter,
        type: 'email',
        remaining: {
          email: emailResult.remaining || 0,
          ip: ipResult.remaining || 0
        }
      };
    }

    if (!ipResult.allowed) {
      return {
        allowed: false,
        retryAfter: ipResult.retryAfter,
        type: 'ip',
        remaining: {
          email: emailResult.remaining || 0,
          ip: ipResult.remaining || 0
        }
      };
    }

    return {
      allowed: true,
      remaining: {
        email: emailResult.remaining || 0,
        ip: ipResult.remaining || 0
      }
    };
  }

  /**
   * Internal method to check rate limit using sliding window pattern
   * @param {string} identifier - Email or IP address
   * @param {string} type - 'email' or 'ip'
   * @param {number} limit - Maximum requests allowed
   * @returns {{allowed: boolean, retryAfter?: number, remaining?: number}}
   */
  _checkLimit(identifier, type, limit) {
    if (!identifier) {
      return { allowed: false };
    }

    cacheService.initialize();

    const key = `ratelimit:${type}:${identifier}`;
    const now = Date.now();
    const record = cacheService.get(key);

    // No record or window expired - start new window
    if (!record || (now - record.windowStart) > this.WINDOW_MS) {
      const newRecord = {
        count: 1,
        windowStart: now
      };
      cacheService.set(key, newRecord, this.WINDOW_SECONDS);
      return {
        allowed: true,
        remaining: limit - 1
      };
    }

    // Check if limit exceeded
    if (record.count >= limit) {
      const retryAfter = Math.ceil((this.WINDOW_MS - (now - record.windowStart)) / 1000);
      return {
        allowed: false,
        retryAfter,
        remaining: 0
      };
    }

    // Increment count and update
    record.count++;
    cacheService.set(key, record, this.WINDOW_SECONDS);
    return {
      allowed: true,
      remaining: limit - record.count
    };
  }

  /**
   * Reset rate limit for an identifier (for testing)
   * @param {string} identifier - Email or IP address
   * @param {string} type - 'email' or 'ip'
   * @returns {boolean} True if reset
   */
  resetLimit(identifier, type) {
    if (!identifier || !type) {
      return false;
    }

    cacheService.initialize();
    const key = `ratelimit:${type}:${identifier}`;
    return cacheService.del(key) > 0;
  }
}

export default new RateLimitService();
