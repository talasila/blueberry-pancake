import crypto from 'crypto';
import dataRepository from '../data/DynamoDBRepository.js';

/**
 * OTP Service for generating, storing, and validating OTP codes
 * Uses DynamoDB for storage with TTL-based expiration
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
   * @returns {Promise<boolean>} True if stored successfully
   */
  async storeOTP(email, otp) {
    if (!email || !otp) {
      return false;
    }

    try {
      // Store new OTP with TTL (automatically invalidates previous OTP)
      await dataRepository.setOTP(email, otp, this.OTP_EXPIRATION_SECONDS);
      return true;
    } catch (error) {
      console.error(`Error storing OTP for ${email}:`, error);
      return false;
    }
  }

  /**
   * Validate OTP code for an email address
   * @param {string} email - Email address
   * @param {string} otp - OTP code to validate
   * @returns {Promise<{valid: boolean, expired?: boolean, error?: string}>}
   */
  async validateOTP(email, otp) {
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

    try {
      const otpData = await dataRepository.getOTP(email);

      if (!otpData) {
        return { valid: false, error: 'OTP not found or expired' };
      }

      // Validate code (normalize types and trim - DynamoDB may return number, frontend may send whitespace)
      const storedCode = String(otpData.code ?? '').trim();
      const enteredCode = String(otp).trim();
      if (storedCode !== enteredCode) {
        // Increment attempts counter
        await dataRepository.incrementOTPAttempts(email);
        return { valid: false, error: 'Invalid OTP code' };
      }

      return { valid: true };
    } catch (error) {
      console.error(`Error validating OTP for ${email}:`, error);
      return { valid: false, error: 'Error validating OTP' };
    }
  }

  /**
   * Invalidate OTP for an email address
   * @param {string} email - Email address
   * @returns {Promise<boolean>} True if OTP was invalidated
   */
  async invalidateOTP(email) {
    if (!email) {
      return false;
    }

    try {
      await dataRepository.deleteOTP(email);
      return true;
    } catch (error) {
      console.error(`Error invalidating OTP for ${email}:`, error);
      return false;
    }
  }

  /**
   * Get OTP data for an email (for testing/debugging)
   * @param {string} email - Email address
   * @returns {Promise<object|null>} OTP data or null if not found
   */
  async getOTPData(email) {
    if (!email) {
      return null;
    }

    try {
      return await dataRepository.getOTP(email);
    } catch (error) {
      console.error(`Error getting OTP data for ${email}:`, error);
      return null;
    }
  }
}

export default new OTPService();
