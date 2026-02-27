import crypto from 'crypto';
import dataRepository from '../data/DynamoDBRepository.js';
import rateLimitService from './RateLimitService.js';
import eventService from './EventService.js';
import loggerService from '../logging/Logger.js';
import { isProduction } from '../utils/environment.js';

/**
 * PINService
 * Handles PIN generation, validation, and verification for event access
 * Uses DynamoDB for session storage with TTL for automatic expiration
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
   * @returns {Promise<{allowed: boolean, retryAfter?: number, remaining?: number}>}
   */
  async _checkEventLimit(eventId) {
    const LIMIT = isProduction() ? 5 : 1000;
    const WINDOW_MINUTES = 15;
    const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;
    const WINDOW_SECONDS = WINDOW_MINUTES * 60;

    try {
      // Check current state
      const current = await dataRepository.getRateLimit(eventId, 'pin');
      const now = Date.now();

      if (current && current.windowStart) {
        const windowStartMs = new Date(current.windowStart).getTime();
        
        // Check if window has expired
        if ((now - windowStartMs) > WINDOW_MS) {
          // Window expired, will be reset on increment
        } else if (current.count >= LIMIT) {
          // Limit exceeded
          const retryAfter = Math.ceil((WINDOW_MS - (now - windowStartMs)) / 1000);
          return {
            allowed: false,
            retryAfter,
            remaining: 0
          };
        }
      }

      // Increment counter
      const result = await dataRepository.incrementRateLimit(eventId, 'pin', WINDOW_SECONDS);
      
      if (result.count > LIMIT) {
        const windowStartMs = new Date(result.windowStart).getTime();
        const retryAfter = Math.ceil((WINDOW_MS - (now - windowStartMs)) / 1000);
        return {
          allowed: false,
          retryAfter,
          remaining: 0
        };
      }

      return {
        allowed: true,
        remaining: LIMIT - result.count
      };
    } catch (error) {
      loggerService.error(`Error checking PIN rate limit for event ${eventId}:`, error);
      // Fail open for availability
      return { allowed: true, remaining: LIMIT };
    }
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
    const [ipLimit, eventLimit] = await Promise.all([
      rateLimitService.checkIPLimit(ipAddress),
      this._checkEventLimit(eventId)
    ]);

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
      
      const pinBuffer = Buffer.from(pin.padEnd(6));
      const storedBuffer = Buffer.from(String(event.pin).padEnd(6));
      if (!crypto.timingSafeEqual(pinBuffer, storedBuffer)) {
        loggerService.warn(`Invalid PIN attempt for event: ${eventId} from IP: ${ipAddress} (PIN mismatch)`);
        return { 
          valid: false, 
          error: 'Invalid PIN. Please check the PIN and try again.' 
        };
      }

      // PIN is valid - create session with client fingerprinting
      const sessionId = await this.createPINSession(eventId, ipAddress, userAgent);
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
   * @returns {Promise<string>} Session ID (UUID)
   */
  async createPINSession(eventId, ipAddress = 'unknown', userAgent = 'unknown') {
    // Generate session ID (simple UUID-like string)
    const sessionId = crypto.randomUUID();
    
    // Create a simple client fingerprint from IP and user agent
    // This helps prevent session hijacking
    const clientFingerprint = crypto
      .createHash('sha256')
      .update(`${ipAddress}:${userAgent}`)
      .digest('hex')
      .substring(0, 16);
    
    // Store session with 30 day TTL
    // Sessions are invalidated when PIN is regenerated via invalidatePINSessions()
    const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;
    
    await dataRepository.createPINSession(sessionId, {
      eventId,
      verifiedAt: Date.now(),
      clientFingerprint,
      ipAddress: ipAddress.substring(0, 45), // Truncate for storage (max IPv6 length)
    }, THIRTY_DAYS_SECONDS);

    loggerService.debug(`PIN session created: ${sessionId} for event ${eventId} with fingerprint`);
    return sessionId;
  }

  /**
   * Check if a PIN verification session is valid
   * Also validates client fingerprint if available
   * @param {string} eventId - Event identifier
   * @param {string} sessionId - Session ID
   * @param {string} ipAddress - Client IP address for fingerprint validation
   * @param {string} userAgent - Client user agent for fingerprint validation
   * @returns {Promise<{valid: boolean, reason?: string}>} Validation result
   */
  async checkPINSession(eventId, sessionId, ipAddress = null, userAgent = null) {
    if (!eventId || !sessionId) {
      return { valid: false, reason: 'Missing eventId or sessionId' };
    }

    try {
      const session = await dataRepository.getPINSession(sessionId);
      
      if (!session) {
        return { valid: false, reason: 'Session not found or expired' };
      }

      // Verify session belongs to this event
      if (session.eventId !== eventId) {
        return { valid: false, reason: 'Session does not belong to this event' };
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
        }
      }

      return { valid: true };
    } catch (error) {
      loggerService.error(`Error checking PIN session for event ${eventId}: ${error.message}`, error);
      return { valid: false, reason: 'Error checking session' };
    }
  }

  /**
   * Invalidate all PIN verification sessions for an event
   * Called when PIN is regenerated
   * @param {string} eventId - Event identifier
   * @returns {Promise<number>} Number of sessions invalidated
   */
  async invalidatePINSessions(eventId) {
    if (!eventId) {
      loggerService.warn('Attempted to invalidate PIN sessions without eventId');
      return 0;
    }

    try {
      await dataRepository.deleteEventPINSessions(eventId);
      loggerService.info(`Invalidated PIN sessions for event: ${eventId} (PIN regenerated)`);
      return 1; // Can't know exact count without extra query
    } catch (error) {
      loggerService.error(`Error invalidating PIN sessions for event ${eventId}: ${error.message}`, error);
      return 0;
    }
  }
}

export default new PINService();
