import { describe, it, expect, beforeEach, vi } from 'vitest';
import emailService from '../../src/services/EmailService.js';

// Mock Resend
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation((apiKey) => {
      return {
        emails: {
          send: vi.fn().mockResolvedValue({ id: 'test-email-id' })
        }
      };
    })
  };
});

// Mock configLoader
vi.mock('../../src/config/configLoader.js', () => {
  return {
    default: {
      get: vi.fn((path) => {
        if (path === 'email.resendApiKey') {
          return 'test-api-key';
        }
        if (path === 'email.fromAddress') {
          return 'test@example.com';
        }
        return null;
      })
    }
  };
});

// Mock logger
vi.mock('../../src/logging/Logger.js', () => {
  return {
    default: {
      info: vi.fn(() => Promise.resolve()),
      warn: vi.fn(() => Promise.resolve()),
      error: vi.fn(() => Promise.resolve())
    }
  };
});

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset service state
    emailService.initialized = false;
    emailService.resend = null;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM_ADDRESS;
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(emailService.isValidEmail('test@example.com')).toBe(true);
      expect(emailService.isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(emailService.isValidEmail('invalid')).toBe(false);
      expect(emailService.isValidEmail('invalid@')).toBe(false);
      expect(emailService.isValidEmail('@example.com')).toBe(false);
      expect(emailService.isValidEmail('')).toBe(false);
      expect(emailService.isValidEmail(null)).toBe(false);
      expect(emailService.isValidEmail(undefined)).toBe(false);
    });
  });

  describe('sendOTP', () => {
    it('should send OTP email successfully', async () => {
      emailService.initialize();
      const result = await emailService.sendOTP('test@example.com', '123456');
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid email format', async () => {
      emailService.initialize();
      const result = await emailService.sendOTP('invalid-email', '123456');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email address format');
    });

    it('should handle missing API key gracefully', async () => {
      // Test production behavior where API key is required
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      // Clear any existing API key env vars
      const originalApiKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;
      
      // Import configLoader to override mock for this test
      const configLoader = await import('../../src/config/configLoader.js');
      const originalGet = configLoader.default.get;
      configLoader.default.get = vi.fn((path) => {
        if (path === 'email.resendApiKey') return ''; // Return empty API key
        if (path === 'email.fromAddress') return 'test@example.com';
        return null;
      });
      
      try {
        // Reset service state to force re-initialization
        emailService.initialized = false;
        emailService.resend = null;
        
        const result = await emailService.sendOTP('test@example.com', '123456');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('not configured');
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalApiKey) process.env.RESEND_API_KEY = originalApiKey;
        configLoader.default.get = originalGet;
      }
    });

    it('should use environment variable for API key when set', async () => {
      process.env.RESEND_API_KEY = 'env-api-key';
      process.env.EMAIL_FROM_ADDRESS = 'env@example.com';
      emailService.initialize();
      
      const result = await emailService.sendOTP('test@example.com', '123456');
      expect(result.success).toBe(true);
    });
  });
});
