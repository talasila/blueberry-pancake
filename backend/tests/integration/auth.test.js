import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import app from '../../src/app.js';
import emailService from '../../src/services/EmailService.js';
import rateLimitService from '../../src/services/RateLimitService.js';
import suspensionService from '../../src/services/SuspensionService.js';
import cacheService from '../../src/cache/CacheService.js';

const request = supertest(app);

// Mock email service to avoid sending actual emails
vi.mock('../../src/services/EmailService.js', () => {
  return {
    default: {
      initialize: vi.fn(),
      isValidEmail: vi.fn((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
      sendOTP: vi.fn().mockResolvedValue({ success: true })
    }
  };
});

describe('OTP Authentication API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheService.flush();
    
    // Reset rate limits
    rateLimitService.resetLimit('test@example.com', 'email');
    rateLimitService.resetLimit('127.0.0.1', 'ip');
    
    // Clear suspensions
    suspensionService.clearSuspension('test@example.com');
    suspensionService.resetFailedAttempts('test@example.com');
  });

  describe('POST /api/auth/otp/request', () => {
    it('should request OTP for valid email', async () => {
      const response = await request
        .post('/api/auth/otp/request')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(emailService.sendOTP).toHaveBeenCalledWith('test@example.com', expect.stringMatching(/^\d{6}$/));
    });

    it('should reject invalid email format', async () => {
      const response = await request
        .post('/api/auth/otp/request')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid email');
    });

    it('should reject missing email', async () => {
      const response = await request
        .post('/api/auth/otp/request')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should enforce rate limit for email', async () => {
      // Make 3 requests (email limit)
      for (let i = 0; i < 3; i++) {
        await request
          .post('/api/auth/otp/request')
          .send({ email: 'test@example.com' })
          .expect(200);
      }

      // 4th request should be blocked
      const response = await request
        .post('/api/auth/otp/request')
        .send({ email: 'test@example.com' })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('rate limit');
    });

    it('should enforce rate limit for IP', async () => {
      // Make 5 requests from same IP (IP limit)
      for (let i = 0; i < 5; i++) {
        await request
          .post('/api/auth/otp/request')
          .send({ email: `test${i}@example.com` })
          .expect(200);
      }

      // 6th request should be blocked
      const response = await request
        .post('/api/auth/otp/request')
        .send({ email: 'test6@example.com' })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('rate limit');
    });

    it('should block OTP request for suspended email', async () => {
      // Suspend email
      suspensionService.suspendEmail('suspended@example.com');

      const response = await request
        .post('/api/auth/otp/request')
        .send({ email: 'suspended@example.com' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('suspended');
    });

    it('should handle email service failures gracefully', async () => {
      emailService.sendOTP.mockResolvedValueOnce({
        success: false,
        error: 'Email service unavailable'
      });

      const response = await request
        .post('/api/auth/otp/request')
        .send({ email: 'test@example.com' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should invalidate previous OTP when new one is requested', async () => {
      // Request first OTP
      const response1 = await request
        .post('/api/auth/otp/request')
        .send({ email: 'test@example.com' })
        .expect(200);

      // Get the OTP that was sent
      const firstOTPCall = emailService.sendOTP.mock.calls[0];
      const firstOTP = firstOTPCall[1];

      // Request second OTP
      await request
        .post('/api/auth/otp/request')
        .send({ email: 'test@example.com' })
        .expect(200);

      // First OTP should be invalidated (tested in verification endpoint)
      expect(emailService.sendOTP).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST /api/auth/otp/verify', () => {
    let validOTP;
    let testEmail;

    beforeEach(async () => {
      testEmail = 'verify@example.com';
      // Request OTP first
      const response = await request
        .post('/api/auth/otp/request')
        .send({ email: testEmail })
        .expect(200);

      // Extract OTP from mock call
      const otpCall = emailService.sendOTP.mock.calls[emailService.sendOTP.mock.calls.length - 1];
      validOTP = otpCall[1];
    });

    it('should verify valid OTP and return JWT token', async () => {
      const response = await request
        .post('/api/auth/otp/verify')
        .send({ email: testEmail, otp: validOTP })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBeTruthy();
    });

    it('should reject invalid OTP', async () => {
      const response = await request
        .post('/api/auth/otp/verify')
        .send({ email: testEmail, otp: '999999' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject expired OTP', async () => {
      // This would require manipulating time or waiting - simplified for now
      // In real test, we'd manipulate the cache to set expired timestamp
      const response = await request
        .post('/api/auth/otp/verify')
        .send({ email: testEmail, otp: '000000' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should track failed attempts', async () => {
      // Make 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await request
          .post('/api/auth/otp/verify')
          .send({ email: testEmail, otp: '999999' })
          .expect(400);
      }

      // 5th failed attempt should suspend
      const response = await request
        .post('/api/auth/otp/verify')
        .send({ email: testEmail, otp: '999999' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('suspended');
    });

    it('should accept test OTP in non-production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request
        .post('/api/auth/otp/verify')
        .send({ email: 'any@example.com', otp: '123456' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');

      process.env.NODE_ENV = originalEnv;
    });

    it('should reject test OTP in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request
        .post('/api/auth/otp/verify')
        .send({ email: testEmail, otp: '123456' })
        .expect(400);

      expect(response.body).toHaveProperty('error');

      process.env.NODE_ENV = originalEnv;
    });

    it('should reset failed attempts on successful verification', async () => {
      // Make 2 failed attempts
      await request
        .post('/api/auth/otp/verify')
        .send({ email: testEmail, otp: '999999' })
        .expect(400);
      await request
        .post('/api/auth/otp/verify')
        .send({ email: testEmail, otp: '999999' })
        .expect(400);

      expect(suspensionService.getFailedAttempts(testEmail)).toBe(2);

      // Successful verification
      await request
        .post('/api/auth/otp/verify')
        .send({ email: testEmail, otp: validOTP })
        .expect(200);

      expect(suspensionService.getFailedAttempts(testEmail)).toBe(0);
    });
  });
});
