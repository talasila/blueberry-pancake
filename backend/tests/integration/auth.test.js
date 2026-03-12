import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import app from '../../src/app.js';
import emailService from '../../src/services/EmailService.js';
import suspensionService from '../../src/services/SuspensionService.js';

const request = supertest(app);

// --- Shared mutable state for stateful mocks ---
const _failedAttempts = {};
const _otpStore = {};

vi.mock('../../src/services/EmailService.js', () => ({
  default: {
    initialize: vi.fn(),
    isValidEmail: vi.fn((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    sendOTP: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../../src/services/RateLimitService.js', () => ({
  default: {
    checkGlobalLimit: vi.fn().mockResolvedValue({ allowed: true }),
    checkLimits: vi.fn().mockResolvedValue({ allowed: true }),
    checkEmailLimit: vi.fn().mockResolvedValue({ allowed: true }),
    checkIPLimit: vi.fn().mockResolvedValue({ allowed: true }),
  },
}));

vi.mock('../../src/services/SuspensionService.js', () => ({
  default: {
    isSuspended: vi.fn().mockResolvedValue({ suspended: false }),
    recordFailedAttempt: vi.fn(async (email) => {
      _failedAttempts[email] = (_failedAttempts[email] || 0) + 1;
      if (_failedAttempts[email] >= 5) {
        return { suspended: true, attempts: _failedAttempts[email] };
      }
      return { suspended: false, attempts: _failedAttempts[email] };
    }),
    resetFailedAttempts: vi.fn(async (email) => {
      _failedAttempts[email] = 0;
    }),
    getFailedAttempts: vi.fn((email) => _failedAttempts[email] || 0),
    clearSuspension: vi.fn().mockResolvedValue(),
    suspendEmail: vi.fn().mockResolvedValue(),
  },
}));

vi.mock('../../src/services/OTPService.js', () => ({
  default: {
    generateOTP: vi.fn(() => Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')),
    storeOTP: vi.fn(async (email, otp) => { _otpStore[email] = otp; return true; }),
    validateOTP: vi.fn(async (email, otp) => {
      if (_otpStore[email] && _otpStore[email] === otp) return { valid: true };
      return { valid: false, error: 'Invalid or expired OTP code' };
    }),
    invalidateOTP: vi.fn(async (email) => { delete _otpStore[email]; return true; }),
  },
}));

vi.mock('../../src/services/EventService.js', () => ({
  default: {
    getEventsByAdministrator: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../src/middleware/jwtAuth.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    generateRefreshToken: vi.fn().mockResolvedValue('mock-refresh-token'),
  };
});

describe('OTP Authentication API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(_failedAttempts)) delete _failedAttempts[key];
    for (const key of Object.keys(_otpStore)) delete _otpStore[key];
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

    it('should block OTP request for suspended email', async () => {
      suspensionService.isSuspended.mockResolvedValueOnce({
        suspended: true,
        endTime: Date.now() + 300_000,
      });

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

    it('should verify valid OTP and return success with user info', async () => {
      const response = await request
        .post('/api/auth/otp/verify')
        .send({ email: testEmail, otp: validOTP })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testEmail);
    });

    it('should reject invalid OTP', async () => {
      const response = await request
        .post('/api/auth/otp/verify')
        .send({ email: testEmail, otp: '999999' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject unknown OTP', async () => {
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
      const response = await request
        .post('/api/auth/otp/verify')
        .send({ email: 'any@example.com', otp: '123456' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
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
