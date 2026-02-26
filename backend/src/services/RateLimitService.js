import dataRepository from '../data/DynamoDBRepository.js';

/**
 * Rate Limiting Service
 * Implements sliding window rate limiting for email addresses and IP addresses
 * Uses DynamoDB with TTL for automatic expiration
 * 
 * Production limits: 3 requests per email per 15 minutes, 5 requests per IP per 15 minutes
 * Development limits: 1000 requests per email per 15 minutes, 1000 requests per IP per 15 minutes
 * 
 * Rate limiting is ALWAYS enabled (security best practice), but with higher limits in development
 * to allow for testing without being blocked.
 */
class RateLimitService {
  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    this.EMAIL_LIMIT = isProduction ? 3 : 1000;
    this.IP_LIMIT = isProduction ? 5 : 1000;
    this.WINDOW_MINUTES = 15;
    this.WINDOW_MS = this.WINDOW_MINUTES * 60 * 1000;
    this.WINDOW_SECONDS = this.WINDOW_MINUTES * 60;

    this.GLOBAL_LIMIT = isProduction ? 100 : 10000;
    this.GLOBAL_WINDOW_SECONDS = 60;
    this.GLOBAL_WINDOW_MS = this.GLOBAL_WINDOW_SECONDS * 1000;
  }

  /**
   * Check if request is allowed for email address
   * @param {string} email - Email address
   * @returns {Promise<{allowed: boolean, retryAfter?: number, remaining?: number}>}
   */
  async checkEmailLimit(email) {
    return this._checkLimit(email, 'email', this.EMAIL_LIMIT);
  }

  /**
   * Check if request is allowed for IP address
   * @param {string} ip - IP address
   * @returns {Promise<{allowed: boolean, retryAfter?: number, remaining?: number}>}
   */
  async checkIPLimit(ip) {
    return this._checkLimit(ip, 'ip', this.IP_LIMIT);
  }

  /**
   * Check rate limit for both email and IP
   * Request is blocked if EITHER limit is exceeded (FR-011)
   * @param {string} email - Email address
   * @param {string} ip - IP address
   * @returns {Promise<{allowed: boolean, retryAfter?: number, type?: string, remaining?: {email: number, ip: number}}>}
   */
  async checkLimits(email, ip) {
    const [emailResult, ipResult] = await Promise.all([
      this.checkEmailLimit(email),
      this.checkIPLimit(ip)
    ]);

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
   * @returns {Promise<{allowed: boolean, retryAfter?: number, remaining?: number}>}
   */
  async _checkLimit(identifier, type, limit) {
    if (!identifier) {
      return { allowed: false };
    }

    try {
      // Check current state first
      const current = await dataRepository.getRateLimit(identifier, type);
      const now = Date.now();

      // If we have a current record and it's within the window
      if (current && current.windowStart) {
        const windowStartMs = new Date(current.windowStart).getTime();
        
        // Check if window has expired
        if ((now - windowStartMs) > this.WINDOW_MS) {
          // Window expired, reset
          await dataRepository.resetRateLimit(identifier, type);
        } else if (current.count >= limit) {
          // Limit exceeded
          const retryAfter = Math.ceil((this.WINDOW_MS - (now - windowStartMs)) / 1000);
          return {
            allowed: false,
            retryAfter,
            remaining: 0
          };
        }
      }

      // Increment the counter (creates new record if needed)
      const result = await dataRepository.incrementRateLimit(identifier, type, this.WINDOW_SECONDS);
      
      // Check if we just exceeded the limit
      if (result.count > limit) {
        const windowStartMs = new Date(result.windowStart).getTime();
        const retryAfter = Math.ceil((this.WINDOW_MS - (now - windowStartMs)) / 1000);
        return {
          allowed: false,
          retryAfter,
          remaining: 0
        };
      }

      return {
        allowed: true,
        remaining: limit - result.count
      };
    } catch (error) {
      console.error(`Error checking rate limit for ${type}:${identifier}:`, error);
      // Fail open for availability, but log the error
      return { allowed: true, remaining: limit };
    }
  }

  /**
   * Check global OTP request rate limit across all callers.
   * Uses a fixed identifier so all requests share one counter.
   * @returns {Promise<{allowed: boolean, retryAfter?: number}>}
   */
  async checkGlobalLimit() {
    try {
      const current = await dataRepository.getRateLimit('global', 'otp-request');
      const now = Date.now();

      if (current && current.windowStart) {
        const windowStartMs = new Date(current.windowStart).getTime();

        if ((now - windowStartMs) > this.GLOBAL_WINDOW_MS) {
          await dataRepository.resetRateLimit('global', 'otp-request');
        } else if (current.count >= this.GLOBAL_LIMIT) {
          const retryAfter = Math.ceil((this.GLOBAL_WINDOW_MS - (now - windowStartMs)) / 1000);
          return { allowed: false, retryAfter };
        }
      }

      const result = await dataRepository.incrementRateLimit('global', 'otp-request', this.GLOBAL_WINDOW_SECONDS);

      if (result.count > this.GLOBAL_LIMIT) {
        const windowStartMs = new Date(result.windowStart).getTime();
        const retryAfter = Math.ceil((this.GLOBAL_WINDOW_MS - (now - windowStartMs)) / 1000);
        return { allowed: false, retryAfter };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking global rate limit:', error);
      return { allowed: true };
    }
  }

  /**
   * Reset rate limit for an identifier (for testing)
   * @param {string} identifier - Email or IP address
   * @param {string} type - 'email' or 'ip'
   * @returns {Promise<boolean>} True if reset
   */
  async resetLimit(identifier, type) {
    if (!identifier || !type) {
      return false;
    }

    try {
      await dataRepository.resetRateLimit(identifier, type);
      return true;
    } catch (error) {
      console.error(`Error resetting rate limit for ${type}:${identifier}:`, error);
      return false;
    }
  }
}

export default new RateLimitService();
