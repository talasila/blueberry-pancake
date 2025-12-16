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
    // Generate random 6-digit number (0 to 999999), padded to ensure 6 digits
    const pin = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
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
    // Environment-aware limits: strict in production, relaxed in development
    const isProduction = process.env.NODE_ENV === 'production';
    const LIMIT = isProduction ? 5 : 1000;
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
   * @param {string} userAgent - User agent of the requester (for session fingerprinting)
   * @returns {Promise<{valid: boolean, sessionId?: string, error?: string}>} Verification result
   */
  async verifyPIN(eventId, pin, ipAddress, userAgent = 'unknown') {
    const startTime = Date.now();

    // Validate PIN format
    const formatValidation = this.validatePINFormat(pin);
    if (!formatValidation.valid) {
      return { valid: false, error: formatValidation.error };
    }

    // Check rate limits (per IP and per event) - both must pass
    // Rate limiting is ALWAYS enabled but with environment-aware limits
    // (higher limits in development for testing, stricter in production)
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
        // Rate limit was already incremented at the start of verifyPIN (lines 109-110)
        // No need to increment again here - that would double-count the failed attempt
        loggerService.warn(`Invalid PIN attempt for event: ${eventId} from IP: ${ipAddress} (PIN mismatch)`);
        return { 
          valid: false, 
          error: 'Invalid PIN. Please check the PIN and try again.' 
        };
      }

      // PIN is valid - create session with client fingerprinting
      const sessionId = this.createPINSession(eventId, ipAddress, userAgent);
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
   * Create a PIN verification session with client fingerprinting
   * @param {string} eventId - Event identifier
   * @param {string} ipAddress - Client IP address for fingerprinting
   * @param {string} userAgent - Client user agent for additional fingerprinting
   * @returns {string} Session ID (UUID)
   */
  createPINSession(eventId, ipAddress = 'unknown', userAgent = 'unknown') {
    cacheService.initialize();

    // Generate session ID (simple UUID-like string)
    const sessionId = crypto.randomUUID();
    const sessionKey = `pin:verified:${eventId}:${sessionId}`;
    
    // Create a simple client fingerprint from IP and user agent
    // This helps prevent session hijacking
    const clientFingerprint = crypto
      .createHash('sha256')
      .update(`${ipAddress}:${userAgent}`)
      .digest('hex')
      .substring(0, 16);
    
    // Store session in cache with long TTL (30 days)
    // Sessions are invalidated when PIN is regenerated via invalidatePINSessions()
    const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
    cacheService.set(sessionKey, {
      eventId,
      verifiedAt: Date.now(),
      clientFingerprint,
      ipAddress: ipAddress.substring(0, 45), // Truncate for storage (max IPv6 length)
    }, THIRTY_DAYS_SECONDS);

    loggerService.debug(`PIN session created: ${sessionKey} with fingerprint`);
    return sessionId;
  }

  /**
   * Check if a PIN verification session is valid
   * Also validates client fingerprint if available
   * @param {string} eventId - Event identifier
   * @param {string} sessionId - Session ID
   * @param {string} ipAddress - Client IP address for fingerprint validation
   * @param {string} userAgent - Client user agent for fingerprint validation
   * @returns {{valid: boolean, reason?: string}} Validation result
   */
  checkPINSession(eventId, sessionId, ipAddress = null, userAgent = null) {
    if (!eventId || !sessionId) {
      return { valid: false, reason: 'Missing eventId or sessionId' };
    }

    cacheService.initialize();
    const sessionKey = `pin:verified:${eventId}:${sessionId}`;
    const session = cacheService.get(sessionKey);
    
    if (!session) {
      return { valid: false, reason: 'Session not found or expired' };
    }

    // If client fingerprint is available, validate it
    // This adds an extra layer of security against session hijacking
    if (session.clientFingerprint && ipAddress && userAgent) {
      const currentFingerprint = crypto
        .createHash('sha256')
        .update(`${ipAddress}:${userAgent}`)
        .digest('hex')
        .substring(0, 16);
      
      if (currentFingerprint !== session.clientFingerprint) {
        loggerService.warn(`PIN session fingerprint mismatch for event ${eventId}, session ${sessionId}`);
        // In strict mode, you could reject the session here
        // For now, we log but allow (to avoid breaking legitimate users with dynamic IPs)
        // In production, consider returning { valid: false, reason: 'Session fingerprint mismatch' }
      }
    }

    return { valid: true };
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
