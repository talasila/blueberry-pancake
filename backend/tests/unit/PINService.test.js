import { describe, it, expect, beforeEach, vi } from 'vitest';
import pinService from '../../src/services/PINService.js';
import cacheService from '../../src/cache/CacheService.js';
import rateLimitService from '../../src/services/RateLimitService.js';
import eventService from '../../src/services/EventService.js';
import loggerService from '../../src/logging/Logger.js';

// Mock dependencies
vi.mock('../../src/cache/CacheService.js', () => {
  return {
    default: {
      initialize: vi.fn(),
      set: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(() => [])
    }
  };
});

vi.mock('../../src/services/RateLimitService.js', () => {
  return {
    default: {
      checkIPLimit: vi.fn(() => ({ allowed: true, remaining: 4 }))
    }
  };
});

vi.mock('../../src/services/EventService.js', () => {
  return {
    default: {
      getEvent: vi.fn()
    }
  };
});

vi.mock('../../src/logging/Logger.js', () => {
  return {
    default: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  };
});

describe('PINService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePIN', () => {
    it('should generate a 6-digit PIN', () => {
      const pin = pinService.generatePIN();
      expect(pin).toMatch(/^\d{6}$/);
      expect(pin.length).toBe(6);
    });

    it('should generate different PINs on multiple calls', () => {
      const pin1 = pinService.generatePIN();
      const pin2 = pinService.generatePIN();
      const pin3 = pinService.generatePIN();
      
      // Very unlikely all three are the same (1 in 900,000^2)
      const allSame = pin1 === pin2 && pin2 === pin3;
      expect(allSame).toBe(false);
    });

    it('should generate PINs in valid range (000000-999999)', () => {
      const pins = [];
      for (let i = 0; i < 100; i++) {
        pins.push(pinService.generatePIN());
      }
      
      pins.forEach(pin => {
        const num = parseInt(pin, 10);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThanOrEqual(999999);
      });
    });

    it('should pad PINs to 6 digits', () => {
      // Generate multiple PINs to ensure padding works
      for (let i = 0; i < 50; i++) {
        const pin = pinService.generatePIN();
        expect(pin.length).toBe(6);
        expect(/^\d{6}$/.test(pin)).toBe(true);
      }
    });

    it('should validate PIN format within 500ms (performance test per SC-007)', () => {
      const startTime = Date.now();
      const result = pinService.validatePINFormat('123456');
      const duration = Date.now() - startTime;
      
      expect(result.valid).toBe(true);
      expect(duration).toBeLessThan(500); // Must complete within 500ms
    });
  });

  describe('validatePINFormat', () => {
    it('should validate correct 6-digit PIN', () => {
      const result = pinService.validatePINFormat('123456');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject PIN with less than 6 digits', () => {
      const result = pinService.validatePINFormat('12345');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PIN must be exactly 6 digits');
    });

    it('should reject PIN with more than 6 digits', () => {
      const result = pinService.validatePINFormat('1234567');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PIN must be exactly 6 digits');
    });

    it('should reject PIN with non-numeric characters', () => {
      const result = pinService.validatePINFormat('12345a');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PIN must be exactly 6 digits');
    });

    it('should reject empty PIN', () => {
      const result = pinService.validatePINFormat('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PIN is required');
    });

    it('should reject null PIN', () => {
      const result = pinService.validatePINFormat(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PIN is required');
    });

    it('should reject undefined PIN', () => {
      const result = pinService.validatePINFormat(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PIN is required');
    });
  });

  describe('verifyPIN', () => {
    const eventId = 'aB3xY9mK';
    const validPIN = '123456';
    const invalidPIN = '999999';
    const ipAddress = '192.168.1.1';

    beforeEach(() => {
      cacheService.initialize.mockClear();
      rateLimitService.checkIPLimit.mockReturnValue({ allowed: true, remaining: 4 });
      cacheService.keys.mockReturnValue([]);
    });

    it('should reject invalid PIN format', async () => {
      const result = await pinService.verifyPIN(eventId, '12345', ipAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PIN must be exactly 6 digits');
    });

    it('should reject PIN when rate limit exceeded for IP', async () => {
      // Rate limiting is always enabled (environment-aware limits)
      // Set up event mock first
      eventService.getEvent.mockResolvedValue({
        eventId,
        pin: validPIN,
        name: 'Test Event'
      });
      
      rateLimitService.checkIPLimit.mockReturnValue({ 
        allowed: false, 
        retryAfter: 900,
        remaining: 0 
      });
      
      const result = await pinService.verifyPIN(eventId, validPIN, ipAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Too many attempts');
    });

    it('should reject PIN when rate limit exceeded for event', async () => {
      // Rate limiting is always enabled (environment-aware limits)
      // Set up event mock first
      eventService.getEvent.mockResolvedValue({
        eventId,
        pin: validPIN,
        name: 'Test Event'
      });
      
      // Ensure IP limit passes
      rateLimitService.checkIPLimit.mockReturnValue({ allowed: true, remaining: 4 });
      
      // Mock event limit exceeded by setting cache with count >= 5
      const eventLimitKey = `pin:attempts:event:${eventId}`;
      const now = Date.now();
      cacheService.get.mockImplementation((key) => {
        if (key === eventLimitKey) {
          return {
            count: 5, // At limit
            windowStart: now - 1000 // Recent window
          };
        }
        return undefined;
      });
      
      const result = await pinService.verifyPIN(eventId, validPIN, ipAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Too many attempts');
    });

    it('should reject invalid PIN for existing event', async () => {
      // Ensure rate limits pass
      rateLimitService.checkIPLimit.mockReturnValue({ allowed: true, remaining: 4 });
      cacheService.get.mockReturnValue(undefined); // No event rate limit record
      
      eventService.getEvent.mockResolvedValue({
        eventId,
        pin: validPIN,
        name: 'Test Event'
      });
      
      const result = await pinService.verifyPIN(eventId, invalidPIN, ipAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid PIN');
    });

    it('should return error when event not found', async () => {
      // Ensure rate limits pass
      rateLimitService.checkIPLimit.mockReturnValue({ allowed: true, remaining: 4 });
      cacheService.get.mockReturnValue(undefined); // No event rate limit record
      
      eventService.getEvent.mockRejectedValue(new Error('Event not found: aB3xY9mK'));
      
      const result = await pinService.verifyPIN(eventId, validPIN, ipAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Event not found');
    });

    it('should create session and return sessionId for valid PIN', async () => {
      // Ensure rate limits pass
      rateLimitService.checkIPLimit.mockReturnValue({ allowed: true, remaining: 4 });
      cacheService.get.mockReturnValue(undefined); // No event rate limit record
      
      eventService.getEvent.mockResolvedValue({
        eventId,
        pin: validPIN,
        name: 'Test Event'
      });
      
      cacheService.set.mockImplementation(() => {});
      
      const result = await pinService.verifyPIN(eventId, validPIN, ipAddress);
      expect(result.valid).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(typeof result.sessionId).toBe('string');
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('createPINSession', () => {
    const eventId = 'aB3xY9mK';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0 Test Browser';

    beforeEach(() => {
      cacheService.initialize.mockClear();
      cacheService.set.mockClear();
    });

    it('should create a session and store in cache with client fingerprint', () => {
      cacheService.set.mockImplementation(() => {});
      
      const sessionId = pinService.createPINSession(eventId, ipAddress, userAgent);
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(cacheService.set).toHaveBeenCalled();
      
      const [key, value, ttl] = cacheService.set.mock.calls[0];
      expect(key).toContain(`pin:verified:${eventId}:`);
      expect(value.eventId).toBe(eventId);
      expect(value.verifiedAt).toBeDefined();
      expect(value.clientFingerprint).toBeDefined(); // Should have fingerprint
      expect(value.ipAddress).toBe(ipAddress); // Should store IP
      expect(ttl).toBe(2592000); // 30 days in seconds
    });

    it('should generate unique session IDs', () => {
      cacheService.set.mockImplementation(() => {});
      
      const sessionId1 = pinService.createPINSession(eventId, ipAddress, userAgent);
      const sessionId2 = pinService.createPINSession(eventId, ipAddress, userAgent);
      
      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('checkPINSession', () => {
    const eventId = 'aB3xY9mK';
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';

    beforeEach(() => {
      cacheService.initialize.mockClear();
    });

    it('should return valid:true for valid session', () => {
      cacheService.get.mockReturnValue({
        eventId,
        verifiedAt: Date.now()
      });
      
      const result = pinService.checkPINSession(eventId, sessionId);
      expect(result.valid).toBe(true);
      expect(cacheService.get).toHaveBeenCalledWith(`pin:verified:${eventId}:${sessionId}`);
    });

    it('should return valid:false for non-existent session', () => {
      cacheService.get.mockReturnValue(undefined);
      
      const result = pinService.checkPINSession(eventId, sessionId);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should return valid:false for missing eventId', () => {
      const result = pinService.checkPINSession('', sessionId);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should return valid:false for missing sessionId', () => {
      const result = pinService.checkPINSession(eventId, '');
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('invalidatePINSessions', () => {
    const eventId = 'aB3xY9mK';

    beforeEach(() => {
      cacheService.initialize.mockClear();
      cacheService.del.mockClear();
    });

    it('should invalidate all sessions for an event', () => {
      const sessionKeys = [
        `pin:verified:${eventId}:session1`,
        `pin:verified:${eventId}:session2`,
        `pin:verified:${eventId}:session3`,
        'pin:verified:otherEvent:session4' // Should not be deleted
      ];
      
      cacheService.keys.mockReturnValue(sessionKeys);
      cacheService.del.mockReturnValue(1);
      
      const count = pinService.invalidatePINSessions(eventId);
      
      expect(count).toBe(3);
      expect(cacheService.del).toHaveBeenCalledTimes(3);
      expect(cacheService.del).not.toHaveBeenCalledWith('pin:verified:otherEvent:session4');
    });

    it('should return 0 when no sessions exist', () => {
      cacheService.keys.mockReturnValue([]);
      
      const count = pinService.invalidatePINSessions(eventId);
      expect(count).toBe(0);
    });

    it('should return 0 for invalid eventId', () => {
      const count = pinService.invalidatePINSessions('');
      expect(count).toBe(0);
    });
  });
});
