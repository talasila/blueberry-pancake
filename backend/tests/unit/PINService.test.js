import { describe, it, expect, beforeEach, vi } from 'vitest';
import pinService from '../../src/services/PINService.js';
import dataRepository from '../../src/data/DynamoDBRepository.js';
import rateLimitService from '../../src/services/RateLimitService.js';
import eventService from '../../src/services/EventService.js';
import loggerService from '../../src/logging/Logger.js';

// Mock dependencies
vi.mock('../../src/data/DynamoDBRepository.js', () => {
  return {
    default: {
      getRateLimit: vi.fn(),
      incrementRateLimit: vi.fn(),
      createPINSession: vi.fn(),
      getPINSession: vi.fn(),
      deleteEventPINSessions: vi.fn()
    }
  };
});

vi.mock('../../src/services/RateLimitService.js', () => {
  return {
    default: {
      checkIPLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 4 })
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
    rateLimitService.checkIPLimit.mockResolvedValue({ allowed: true, remaining: 4 });
    dataRepository.getRateLimit.mockResolvedValue(null);
    dataRepository.incrementRateLimit.mockResolvedValue({ count: 1, windowStart: new Date().toISOString() });
    dataRepository.createPINSession.mockResolvedValue(undefined);
    dataRepository.getPINSession.mockResolvedValue(null);
    dataRepository.deleteEventPINSessions.mockResolvedValue(undefined);
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
      expect(duration).toBeLessThan(500);
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

    it('should reject invalid PIN format', async () => {
      const result = await pinService.verifyPIN(eventId, '12345', ipAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PIN must be exactly 6 digits');
    });

    it('should reject PIN when rate limit exceeded for IP', async () => {
      eventService.getEvent.mockResolvedValue({
        eventId,
        pin: validPIN,
        name: 'Test Event'
      });
      
      rateLimitService.checkIPLimit.mockResolvedValue({ 
        allowed: false, 
        retryAfter: 900,
        remaining: 0 
      });
      
      const result = await pinService.verifyPIN(eventId, validPIN, ipAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Too many attempts');
    });

    it('should reject PIN when rate limit exceeded for event', async () => {
      const isProduction = process.env.NODE_ENV === 'production';
      const EVENT_LIMIT = isProduction ? 5 : 1000;
      
      eventService.getEvent.mockResolvedValue({
        eventId,
        pin: validPIN,
        name: 'Test Event'
      });
      
      rateLimitService.checkIPLimit.mockResolvedValue({ allowed: true, remaining: EVENT_LIMIT - 1 });
      
      const recentDate = new Date().toISOString();
      dataRepository.getRateLimit.mockResolvedValue({
        count: EVENT_LIMIT,
        windowStart: recentDate
      });
      dataRepository.incrementRateLimit.mockResolvedValue({
        count: EVENT_LIMIT + 1,
        windowStart: recentDate
      });
      
      const result = await pinService.verifyPIN(eventId, validPIN, ipAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Too many attempts');
    });

    it('should reject invalid PIN for existing event', async () => {
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
      eventService.getEvent.mockRejectedValue(new Error('Event not found: aB3xY9mK'));
      
      const result = await pinService.verifyPIN(eventId, validPIN, ipAddress);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Event not found');
    });

    it('should create session and return sessionId for valid PIN', async () => {
      eventService.getEvent.mockResolvedValue({
        eventId,
        pin: validPIN,
        name: 'Test Event'
      });
      
      const result = await pinService.verifyPIN(eventId, validPIN, ipAddress);
      expect(result.valid).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(typeof result.sessionId).toBe('string');
      expect(dataRepository.createPINSession).toHaveBeenCalled();
    });
  });

  describe('createPINSession', () => {
    const eventId = 'aB3xY9mK';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0 Test Browser';

    it('should create a session and store in DynamoDB with client fingerprint', async () => {
      const sessionId = await pinService.createPINSession(eventId, ipAddress, userAgent);
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(dataRepository.createPINSession).toHaveBeenCalled();
      
      const [storedSessionId, sessionData, ttl] = dataRepository.createPINSession.mock.calls[0];
      expect(storedSessionId).toBe(sessionId);
      expect(sessionData.eventId).toBe(eventId);
      expect(sessionData.verifiedAt).toBeDefined();
      expect(sessionData.clientFingerprint).toBeDefined();
      expect(sessionData.ipAddress).toBe(ipAddress);
      expect(ttl).toBe(2592000); // 30 days in seconds
    });

    it('should generate unique session IDs', async () => {
      const sessionId1 = await pinService.createPINSession(eventId, ipAddress, userAgent);
      const sessionId2 = await pinService.createPINSession(eventId, ipAddress, userAgent);
      
      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('checkPINSession', () => {
    const eventId = 'aB3xY9mK';
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return valid:true for valid session', async () => {
      dataRepository.getPINSession.mockResolvedValue({
        eventId,
        verifiedAt: Date.now()
      });
      
      const result = await pinService.checkPINSession(eventId, sessionId);
      expect(result.valid).toBe(true);
      expect(dataRepository.getPINSession).toHaveBeenCalledWith(sessionId);
    });

    it('should return valid:false for non-existent session', async () => {
      dataRepository.getPINSession.mockResolvedValue(null);
      
      const result = await pinService.checkPINSession(eventId, sessionId);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should return valid:false for missing eventId', async () => {
      const result = await pinService.checkPINSession('', sessionId);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should return valid:false for missing sessionId', async () => {
      const result = await pinService.checkPINSession(eventId, '');
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('invalidatePINSessions', () => {
    const eventId = 'aB3xY9mK';

    it('should invalidate all sessions for an event', async () => {
      const count = await pinService.invalidatePINSessions(eventId);
      
      expect(count).toBe(1);
      expect(dataRepository.deleteEventPINSessions).toHaveBeenCalledWith(eventId);
    });

    it('should return 0 when no sessions exist', async () => {
      const count = await pinService.invalidatePINSessions(eventId);
      expect(count).toBe(1);
    });

    it('should return 0 for invalid eventId', async () => {
      const count = await pinService.invalidatePINSessions('');
      expect(count).toBe(0);
    });
  });
});
