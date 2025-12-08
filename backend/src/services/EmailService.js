import { Resend } from 'resend';
import configLoader from '../config/configLoader.js';
import loggerService from '../logging/Logger.js';

/**
 * Email service for sending OTP codes via Resend
 * Handles email delivery with proper error handling
 */
class EmailService {
  constructor() {
    this.resend = null;
    this.fromAddress = null;
    this.initialized = false;
  }

  /**
   * Initialize Resend client with API key from config or environment
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    // Get API key from environment variable (takes precedence) or config
    const apiKey = process.env.RESEND_API_KEY || 
                   configLoader.get('email.resendApiKey') || 
                   '';

    if (!apiKey) {
      loggerService.warn('Resend API key not configured. Email service will not function.').catch(() => {});
      this.initialized = false;
      return;
    }

    this.resend = new Resend(apiKey);

    // Get from address from environment variable (takes precedence) or config
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 
                       configLoader.get('email.fromAddress') || 
                       'sreeni@7155421.xys';

    this.initialized = true;
    loggerService.info('Email service initialized').catch(() => {});
  }

  /**
   * Validate email address format
   * @param {string} email - Email address to validate
   * @returns {boolean} True if valid email format
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Send OTP code via email
   * In development/test environments, skips actual email sending and returns OTP for testing
   * @param {string} email - Recipient email address
   * @param {string} otp - 6-digit OTP code
   * @returns {Promise<{success: boolean, error?: string, otp?: string, devMode?: boolean}>}
   */
  async sendOTP(email, otp) {
    if (!this.isValidEmail(email)) {
      return {
        success: false,
        error: 'Invalid email address format'
      };
    }

    // In development/test environments, skip actual email sending
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      loggerService.info(`[DEV MODE] OTP ${otp} generated for ${email} (email not sent)`).catch(() => {});
      return {
        success: true,
        otp: otp,
        devMode: true
      };
    }

    // Production: Send actual email
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.initialized || !this.resend) {
      return {
        success: false,
        error: 'Email service not configured. Please check Resend API key.'
      };
    }

    try {
      const result = await this.resend.emails.send({
        from: this.fromAddress,
        to: email,
        subject: 'Your OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Your One-Time Password</h2>
            <p>Your OTP code is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
              <strong style="font-size: 24px; letter-spacing: 5px; color: #333;">${otp}</strong>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `
      });

      if (result.error) {
        loggerService.error(`Failed to send OTP email: ${result.error.message}`).catch(() => {});
        return {
          success: false,
          error: 'Failed to send email. Please try again later.'
        };
      }

      loggerService.info(`OTP email sent to ${email}`).catch(() => {});
      return { success: true };
    } catch (error) {
      loggerService.error(`Error sending OTP email: ${error.message}`).catch(() => {});
      return {
        success: false,
        error: 'Failed to send email. Please try again later.'
      };
    }
  }
}

export default new EmailService();
