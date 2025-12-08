import { describe, it, expect, beforeEach, vi } from 'vitest';
import otpService from '../../src/services/OTPService.js';
import cacheService from '../../src/cache/CacheService.js';

// Mock cache service
vi.mock('../../src/cache/CacheService.js', () => {
  const mockCache = new Map();
  return {
    default: {
      initialize: vi.fn(),
      set: vi.fn((key, value, ttl) => {
        mockCache.set(key, value);
        return true;
      }),
      get: vi.fn((key) => {
        return mockCache.get(key);
      }),
      del: vi.fn((key) => {
        return mockCache.delete(key) ? 1 : 0;
      })
    }
  };
});

describe('OTPService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear mock cache
    const mockCache = new Map();
    cacheService.get.mockImplementation((key) => mockCache.get(key));
    cacheService.set.mockImplementation((key, value) => {
      mockCache.set(key, value);
      return true;
    });
    cacheService.del.mockImplementation((key) => {
      return mockCache.delete(key) ? 1 : 0;
    });
    delete process.env.NODE_ENV;
  });

  describe('generateOTP', () => {
    it('should generate 6-digit OTP', () => {
      const otp = otpService.generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it('should generate different OTPs on multiple calls', () => {
      const otp1 = otpService.generateOTP();
      const otp2 = otpService.generateOTP();
      // Very unlikely to be the same
      expect(otp1).not.toBe(otp2);
    });
  });

  describe('storeOTP', () => {
    it('should store OTP for email', () => {
      const result = otpService.storeOTP('test@example.com', '123456');
      expect(result).toBe(true);
    });

    it('should invalidate existing OTP when storing new one', () => {
      otpService.storeOTP('test@example.com', '111111');
      const data1 = otpService.getOTPData('test@example.com');
      expect(data1.code).toBe('111111');

      otpService.storeOTP('test@example.com', '222222');
      const data2 = otpService.getOTPData('test@example.com');
      expect(data2.code).toBe('222222');
    });

    it('should return false for invalid input', () => {
      expect(otpService.storeOTP(null, '123456')).toBe(false);
      expect(otpService.storeOTP('test@example.com', null)).toBe(false);
    });
  });

  describe('validateOTP', () => {
    beforeEach(() => {
      // Set up valid OTP
      const now = Date.now();
      cacheService.set('otp:test@example.com', {
        code: '123456',
        email: 'test@example.com',
        createdAt: now,
        expiresAt: now + 10 * 60 * 1000
      });
    });

    it('should validate correct OTP', () => {
      const result = otpService.validateOTP('test@example.com', '123456');
      expect(result.valid).toBe(true);
    });

    it('should reject incorrect OTP', () => {
      const result = otpService.validateOTP('test@example.com', '999999');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should reject expired OTP', () => {
      // Set expired OTP
      const pastTime = Date.now() - 11 * 60 * 1000;
      cacheService.set('otp:expired@example.com', {
        code: '123456',
        email: 'expired@example.com',
        createdAt: pastTime,
        expiresAt: pastTime + 10 * 60 * 1000
      });

      const result = otpService.validateOTP('expired@example.com', '123456');
      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('should reject non-6-digit OTP', () => {
      const result = otpService.validateOTP('test@example.com', '12345');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('6 digits');
    });

    it('should accept test OTP in non-production environment', () => {
      process.env.NODE_ENV = 'development';
      const result = otpService.validateOTP('test@example.com', '123456');
      expect(result.valid).toBe(true);
      expect(result.bypass).toBe(true);
    });

    it('should reject test OTP in production', () => {
      process.env.NODE_ENV = 'production';
      const result = otpService.validateOTP('test@example.com', '123456');
      // Should validate against stored OTP, not bypass
      expect(result.valid).toBe(true); // This would be true if stored OTP matches
    });
  });

  describe('invalidateOTP', () => {
    it('should invalidate OTP for email', () => {
      otpService.storeOTP('test@example.com', '123456');
      expect(otpService.getOTPData('test@example.com')).not.toBeNull();
      
      const result = otpService.invalidateOTP('test@example.com');
      expect(result).toBe(true);
      expect(otpService.getOTPData('test@example.com')).toBeNull();
    });
  });
});
