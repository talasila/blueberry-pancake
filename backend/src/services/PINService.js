import crypto from 'crypto';
import cacheService from '../cache/CacheService.js';
import rateLimitService from './RateLimitService.js';
import eventService from './EventService.js';
import loggerService from '../logging/Logger.js';

/**
 * PINService
 * Handles PIN generation, validation, and verification for event access
 */
class PINService {
  /**
   * Generate a 6-digit random PIN
   * @returns {string} 6-digit PIN (000000-999999)
   */
  generatePIN() {
    // Generate random 6-digit number (100000 to 999999)
    const pin = crypto.randomInt(100000, 1000000).toString().padStart(6, '0');
    loggerService.debug(`Generated PIN: ${pin}`);
    return pin;
  }

  /**
   * Validate PIN format
   * @param {string} pin - PIN to validate
   * @returns {{valid: boolean, error?: string}} Validation result
   */
  validatePINFormat(pin) {
    if (!pin || typeof pin !== 'string') {
      return { valid: false, error: 'PIN is required' };
    }

    // PIN must be exactly 6 digits
    if (!/^\d{6}$/.test(pin)) {
      return { valid: false, error: 'PIN must be exactly 6 digits' };
    }

    return { valid: true };
  }

  /**
   * Check rate limit for event-scoped PIN attempts
   * @param {string} eventId - Event identifier
   * @returns {{allowed: boolean, retryAfter?: number, remaining?: number}}
   */
  _checkEventLimit(eventId) {
    const LIMIT = 5;
    const WINDOW_MINUTES = 15;
    const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;
    const WINDOW_SECONDS = WINDOW_MINUTES * 60;

    cacheService.initialize();
    const key = `pin:attempts:event:${eventId}`;
    const now = Date.now();
    const record = cacheService.get(key);

    // No record or window expired - start new window
    if (!record || (now - record.windowStart) > WINDOW_MS) {
      const newRecord = {
        count: 1,
        windowStart: now
      };
      cacheService.set(key, newRecord, WINDOW_SECONDS);
      return {
        allowed: true,
        remaining: LIMIT - 1
      };
    }

    // Check if limit exceeded
    if (record.count >= LIMIT) {
      const retryAfter = Math.ceil((WINDOW_MS - (now - record.windowStart)) / 1000);
      return {
        allowed: false,
        retryAfter,
        remaining: 0
      };
    }

    // Increment count and update
    record.count++;
    cacheService.set(key, record, WINDOW_SECONDS);
    return {
      allowed: true,
      remaining: LIMIT - record.count
    };
  }

  /**
   * Verify PIN for an event
   * @param {string} eventId - Event identifier
   * @param {string} pin - PIN to verify
   * @param {string} ipAddress - IP address of the requester
   * @returns {Promise<{valid: boolean, sessionId?: string, error?: string}>} Verification result
   */
  async verifyPIN(eventId, pin, ipAddress) {
    const startTime = Date.now();

    // Validate PIN format
    const formatValidation = this.validatePINFormat(pin);
    if (!formatValidation.valid) {
      return { valid: false, error: formatValidation.error };
    }

    // Check rate limits (per IP and per event) - both must pass
    // Skip rate limiting in development mode (same as OTP auth)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (!isDevelopment) {
      const ipLimit = rateLimitService.checkIPLimit(ipAddress);
      const eventLimit = this._checkEventLimit(eventId);

      if (!ipLimit.allowed) {
        const retryMinutes = Math.ceil((ipLimit.retryAfter || 900) / 60);
        loggerService.warn(`PIN verification rate limit exceeded for IP: ${ipAddress} (retry in ${retryMinutes} minutes)`);
        return {
          valid: false,
          error: `Too many attempts from this IP address. Please try again in ${retryMinutes} minute(s).`
        };
      }

      if (!eventLimit.allowed) {
        const retryMinutes = Math.ceil((eventLimit.retryAfter || 900) / 60);
        loggerService.warn(`PIN verification rate limit exceeded for event: ${eventId} (retry in ${retryMinutes} minutes)`);
        return {
          valid: false,
          error: `Too many attempts for this event. Please try again in ${retryMinutes} minute(s).`
        };
      }
    }

    // Validate event exists
    try {
      const event = await eventService.getEvent(eventId);
      
      // Check if event has a PIN (for events created before PIN feature)
      if (!event.pin) {
        loggerService.warn(`PIN verification attempted for event ${eventId} without PIN - event may need PIN generation`);
        return { 
          valid: false, 
          error: 'This event does not have a PIN configured. Please contact the event administrator to set up PIN access.' 
        };
      }
      
      // Compare PIN
      if (event.pin !== pin) {
        // Record failed attempt (increment rate limit counters) - only in production
        if (!isDevelopment) {
          rateLimitService.checkIPLimit(ipAddress);
          this._checkEventLimit(eventId);
        }
        loggerService.warn(`Invalid PIN attempt for event: ${eventId} from IP: ${ipAddress} (PIN mismatch)`);
        return { 
          valid: false, 
          error: 'Invalid PIN. Please check the PIN and try again. PINs are case-sensitive and must be exactly 6 digits.' 
        };
      }

      // PIN is valid - create session
      const sessionId = this.createPINSession(eventId);
      const duration = Date.now() - startTime;
      loggerService.info(`PIN verified successfully for event: ${eventId}, session created: ${sessionId} (${duration}ms)`);
      
      return {
        valid: true,
        sessionId
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        return { valid: false, error: 'Event not found' };
      }
      loggerService.error(`Error verifying PIN for event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Create a PIN verification session
   * @param {string} eventId - Event identifier
   * @returns {string} Session ID (UUID)
   */
  createPINSession(eventId) {
    cacheService.initialize();

    // Generate session ID (simple UUID-like string)
    const sessionId = crypto.randomUUID();
    const sessionKey = `pin:verified:${eventId}:${sessionId}`;
    
    // Store session in cache (no expiration - valid until PIN regenerated or event finished)
    cacheService.set(sessionKey, {
      eventId,
      verifiedAt: Date.now()
    }, 0); // 0 = never expires automatically

    loggerService.debug(`PIN session created: ${sessionKey}`);
    return sessionId;
  }

  /**
   * Check if a PIN verification session is valid
   * @param {string} eventId - Event identifier
   * @param {string} sessionId - Session ID
   * @returns {boolean} True if session is valid
   */
  checkPINSession(eventId, sessionId) {
    if (!eventId || !sessionId) {
      return false;
    }

    cacheService.initialize();
    const sessionKey = `pin:verified:${eventId}:${sessionId}`;
    const session = cacheService.get(sessionKey);
    
    return !!session;
  }

  /**
   * Invalidate all PIN verification sessions for an event
   * Called when PIN is regenerated
   * @param {string} eventId - Event identifier
   * @returns {number} Number of sessions invalidated
   */
  invalidatePINSessions(eventId) {
    if (!eventId) {
      loggerService.warn('Attempted to invalidate PIN sessions without eventId');
      return 0;
    }

    cacheService.initialize();
    const pattern = `pin:verified:${eventId}:`;
    const keys = cacheService.keys();
    let invalidated = 0;

    keys.forEach(key => {
      if (key.startsWith(pattern)) {
        cacheService.del(key);
        invalidated++;
      }
    });

    if (invalidated > 0) {
      loggerService.info(`Invalidated ${invalidated} PIN session(s) for event: ${eventId} (PIN regenerated)`);
    } else {
      loggerService.debug(`No PIN sessions found to invalidate for event: ${eventId}`);
    }

    return invalidated;
  }
}

export default new PINService();
