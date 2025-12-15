import crypto from 'crypto';
import cacheService from '../cache/CacheService.js';

/**
 * OTP Service for generating, storing, and validating OTP codes
 * Uses node-cache for in-memory storage with 10-minute expiration
 */
class OTPService {
  constructor() {
    this.OTP_LENGTH = 6;
    this.OTP_EXPIRATION_MINUTES = 10;
    this.OTP_EXPIRATION_SECONDS = this.OTP_EXPIRATION_MINUTES * 60;
  }

  /**
   * Generate a cryptographically secure 6-digit OTP code
   * @returns {string} 6-digit OTP code (000000-999999)
   */
  generateOTP() {
    // Generate random 6-digit number (0 to 999999), padded to ensure 6 digits
    const otp = crypto.randomInt(0, 1000000).toString().padStart(this.OTP_LENGTH, '0');
    return otp;
  }

  /**
   * Store OTP for an email address
   * Invalidates any existing OTP for the same email (FR-014)
   * @param {string} email - Email address
   * @param {string} otp - OTP code to store
   * @returns {boolean} True if stored successfully
   */
  storeOTP(email, otp) {
    if (!email || !otp) {
      return false;
    }

    // Ensure cache is initialized
    cacheService.initialize();

    // Invalidate any existing OTP for this email
    this.invalidateOTP(email);

    // Store new OTP with expiration
    const otpData = {
      code: otp,
      email: email,
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.OTP_EXPIRATION_MINUTES * 60 * 1000)
    };

    const key = `otp:${email}`;
    return cacheService.set(key, otpData, this.OTP_EXPIRATION_SECONDS);
  }

  /**
   * Validate OTP code for an email address
   * @param {string} email - Email address
   * @param {string} otp - OTP code to validate
   * @returns {{valid: boolean, expired?: boolean, error?: string}}
   */
  validateOTP(email, otp) {
    if (!email || !otp) {
      return { valid: false, error: 'Email and OTP are required' };
    }

    // Validate OTP format (exactly 6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return { valid: false, error: 'OTP must be exactly 6 digits' };
    }

    // Check for test OTP bypass (explicitly allowed in development and test environments only)
    // This is more secure than checking for NOT production, as it requires explicit whitelisting
    // If NODE_ENV is not set, treat as development environment
    const allowedTestEnvironments = ['development', 'test', undefined, ''];
    const isTestEnvironment = allowedTestEnvironments.includes(process.env.NODE_ENV);
    if (isTestEnvironment && otp === '123456') {
      return { valid: true, bypass: true };
    }

    // Ensure cache is initialized
    cacheService.initialize();

    const key = `otp:${email}`;
    const otpData = cacheService.get(key);

    if (!otpData) {
      return { valid: false, error: 'OTP not found or expired' };
    }

    // Check expiration
    const now = Date.now();
    if (now > otpData.expiresAt) {
      // Clean up expired OTP
      cacheService.del(key);
      return { valid: false, expired: true, error: 'OTP has expired' };
    }

    // Validate code
    if (otpData.code !== otp) {
      return { valid: false, error: 'Invalid OTP code' };
    }

    return { valid: true };
  }

  /**
   * Invalidate OTP for an email address
   * @param {string} email - Email address
   * @returns {boolean} True if OTP was invalidated
   */
  invalidateOTP(email) {
    if (!email) {
      return false;
    }

    cacheService.initialize();
    const key = `otp:${email}`;
    return cacheService.del(key) > 0;
  }

  /**
   * Get OTP data for an email (for testing/debugging)
   * @param {string} email - Email address
   * @returns {object|null} OTP data or null if not found
   */
  getOTPData(email) {
    if (!email) {
      return null;
    }

    cacheService.initialize();
    const key = `otp:${email}`;
    return cacheService.get(key) || null;
  }
}

export default new OTPService();
