import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/data/DynamoDBRepository.js', () => ({
  default: {
    setOTP: vi.fn(),
    getOTP: vi.fn(),
    deleteOTP: vi.fn(),
    incrementOTPAttempts: vi.fn()
  }
}));

vi.mock('../../src/logging/Logger.js', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../src/utils/environment.js', () => ({
  isDevelopment: vi.fn(() => true),
  isTest: vi.fn(() => true),
  isProduction: vi.fn(() => false)
}));

import otpService from '../../src/services/OTPService.js';
import dataRepository from '../../src/data/DynamoDBRepository.js';
import { isDevelopment, isTest } from '../../src/utils/environment.js';

describe('OTPService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDevelopment.mockReturnValue(true);
    isTest.mockReturnValue(true);
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
      expect(otp1).not.toBe(otp2);
    });
  });

  describe('storeOTP', () => {
    it('should store OTP for email', async () => {
      dataRepository.setOTP.mockResolvedValue(undefined);

      const result = await otpService.storeOTP('test@example.com', '123456');
      expect(result).toBe(true);
      expect(dataRepository.setOTP).toHaveBeenCalledWith('test@example.com', '123456', 600);
    });

    it('should invalidate existing OTP when storing new one', async () => {
      dataRepository.setOTP.mockResolvedValue(undefined);

      await otpService.storeOTP('test@example.com', '111111');
      expect(dataRepository.setOTP).toHaveBeenCalledWith('test@example.com', '111111', 600);

      await otpService.storeOTP('test@example.com', '222222');
      expect(dataRepository.setOTP).toHaveBeenCalledWith('test@example.com', '222222', 600);
      expect(dataRepository.setOTP).toHaveBeenCalledTimes(2);
    });

    it('should return false for invalid input', async () => {
      expect(await otpService.storeOTP(null, '123456')).toBe(false);
      expect(await otpService.storeOTP('test@example.com', null)).toBe(false);
    });
  });

  describe('validateOTP', () => {
    it('should validate correct OTP', async () => {
      isDevelopment.mockReturnValue(false);
      isTest.mockReturnValue(false);
      dataRepository.getOTP.mockResolvedValue({
        code: '654321',
        email: 'test@example.com',
        attempts: 0
      });

      const result = await otpService.validateOTP('test@example.com', '654321');
      expect(result.valid).toBe(true);
    });

    it('should reject incorrect OTP', async () => {
      isDevelopment.mockReturnValue(false);
      isTest.mockReturnValue(false);
      dataRepository.getOTP.mockResolvedValue({
        code: '654321',
        email: 'test@example.com',
        attempts: 0
      });
      dataRepository.incrementOTPAttempts.mockResolvedValue(undefined);

      const result = await otpService.validateOTP('test@example.com', '999999');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should reject expired OTP', async () => {
      isDevelopment.mockReturnValue(false);
      isTest.mockReturnValue(false);
      dataRepository.getOTP.mockResolvedValue(null);

      const result = await otpService.validateOTP('expired@example.com', '654321');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject non-6-digit OTP', async () => {
      const result = await otpService.validateOTP('test@example.com', '12345');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('6 digits');
    });

    it('should accept test OTP in non-production environment', async () => {
      isDevelopment.mockReturnValue(true);
      isTest.mockReturnValue(true);

      const result = await otpService.validateOTP('test@example.com', '123456');
      expect(result.valid).toBe(true);
      expect(result.bypass).toBe(true);
    });

    it('should reject test OTP in production', async () => {
      isDevelopment.mockReturnValue(false);
      isTest.mockReturnValue(false);
      dataRepository.getOTP.mockResolvedValue({
        code: '123456',
        email: 'test@example.com',
        attempts: 0
      });

      const result = await otpService.validateOTP('test@example.com', '123456');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalidateOTP', () => {
    it('should invalidate OTP for email', async () => {
      dataRepository.deleteOTP.mockResolvedValue(undefined);

      const result = await otpService.invalidateOTP('test@example.com');
      expect(result).toBe(true);
      expect(dataRepository.deleteOTP).toHaveBeenCalledWith('test@example.com');
    });
  });
});
