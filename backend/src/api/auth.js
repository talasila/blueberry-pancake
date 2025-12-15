import { Router } from 'express';
import emailService from '../services/EmailService.js';
import otpService from '../services/OTPService.js';
import rateLimitService from '../services/RateLimitService.js';
import suspensionService from '../services/SuspensionService.js';
import { 
  generateToken, 
  generateRefreshToken,
  validateRefreshToken,
  invalidateRefreshToken,
  invalidateAllRefreshTokens,
  JWT_COOKIE_NAME, 
  REFRESH_COOKIE_NAME,
  getJWTCookieOptions,
  getRefreshCookieOptions
} from '../middleware/jwtAuth.js';
import loggerService from '../logging/Logger.js';

const router = Router();

/**
 * POST /api/auth/otp/request
 * Request an OTP code to be sent to the user's email
 */
router.post('/otp/request', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email is provided
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email address is required'
      });
    }

    // Validate email format
    if (!emailService.isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email address format'
      });
    }

    // Check if email is suspended
    const suspensionStatus = suspensionService.isSuspended(email);
    if (suspensionStatus.suspended) {
      const remainingMinutes = Math.ceil((suspensionStatus.endTime - Date.now()) / 60000);
      return res.status(403).json({
        error: `Account is temporarily suspended. Please try again in ${remainingMinutes} minute(s).`
      });
    }

    // Check rate limits (both email and IP)
    // Rate limiting is ALWAYS enabled but with environment-aware limits
    // (higher limits in development for testing, stricter in production)
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimitResult = rateLimitService.checkLimits(email, clientIP);

    if (!rateLimitResult.allowed) {
      const retryAfterSeconds = Math.ceil(rateLimitResult.retryAfter || 0);
      const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
      return res.status(429).json({
        error: `Rate limit exceeded. Please try again in ${retryAfterMinutes} minute(s).`,
        retryAfter: retryAfterSeconds
      });
    }

    // Generate OTP
    const otp = otpService.generateOTP();

    // Store OTP (this will invalidate any existing OTP for this email - FR-014)
    otpService.storeOTP(email, otp);

    // Send OTP via email (or skip in development/test environments)
    const emailResult = await emailService.sendOTP(email, otp);

    if (!emailResult.success) {
      loggerService.error(`Failed to send OTP email to ${email}: ${emailResult.error}`).catch(() => {});
      return res.status(500).json({
        error: emailResult.error || 'Failed to send OTP email. Please try again later.'
      });
    }

    // Check if we're in a test/development environment for response formatting
    // If NODE_ENV is not set, treat as development environment
    const devTestEnvironments = ['development', 'test', undefined, ''];
    const isDevOrTest = devTestEnvironments.includes(process.env.NODE_ENV);
    
    // Log successful OTP request
    loggerService.info(`OTP requested for ${email}`).catch(() => {});
    const response = {
      success: true,
      message: isDevOrTest 
        ? `OTP code generated: ${otp} (Development mode - email not sent)`
        : 'OTP code has been sent to your email address. Please check your inbox.'
    };

    if (isDevOrTest && emailResult.otp) {
      response.otp = emailResult.otp;
      response.devMode = true;
    }

    return res.status(200).json(response);
  } catch (error) {
    loggerService.error(`Error in OTP request: ${error.message}`).catch(() => {});
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again later.'
    });
  }
});

/**
 * POST /api/auth/otp/verify
 * Verify OTP code and issue JWT token
 */
router.post('/otp/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate inputs
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email address is required'
      });
    }

    if (!otp || typeof otp !== 'string') {
      return res.status(400).json({
        error: 'OTP code is required'
      });
    }

    // Validate email format
    if (!emailService.isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email address format'
      });
    }

    // Check for test OTP bypass FIRST (before any other checks)
    // Test OTP bypasses all restrictions: suspension, rate limits, expiration, etc. (FR-019)
    // Explicitly whitelist allowed test environments for better security
    // If NODE_ENV is not set, treat as development environment
    const allowedTestEnvironments = ['development', 'test', undefined, ''];
    const isTestEnvironment = allowedTestEnvironments.includes(process.env.NODE_ENV);
    const isTestOTP = isTestEnvironment && otp === '123456';
    
    let otpResult;
    if (isTestOTP) {
      // Test OTP bypass - skip all validation
      otpResult = { valid: true, bypass: true };
    } else {
      // Check if email is suspended (always check, security best practice)
      const suspensionStatus = suspensionService.isSuspended(email);
      if (suspensionStatus.suspended) {
        const remainingMinutes = Math.ceil((suspensionStatus.endTime - Date.now()) / 60000);
        return res.status(403).json({
          error: `Account is temporarily suspended. Please try again in ${remainingMinutes} minute(s).`
        });
      }

      // Validate OTP (normal flow)
      otpResult = otpService.validateOTP(email, otp);
    }

    if (!otpResult.valid) {
      // Record failed attempt (unless it's a test OTP bypass)
      if (!otpResult.bypass) {
        const attemptResult = suspensionService.recordFailedAttempt(email);

        if (attemptResult.suspended) {
          loggerService.warn(`Email ${email} suspended after ${attemptResult.attempts} failed attempts`).catch(() => {});
          return res.status(403).json({
            error: 'Too many failed attempts. Your account has been temporarily suspended for 5 minutes.'
          });
        }
      }

      return res.status(400).json({
        error: otpResult.error || 'Invalid or expired OTP code'
      });
    }

    // OTP is valid - reset failed attempts and generate JWT token
    // Always reset failed attempts on successful verification (including test OTP)
    suspensionService.resetFailedAttempts(email);
    
    if (!otpResult.bypass) {
      // Invalidate used OTP (not needed for test OTP which is static)
      otpService.invalidateOTP(email);
    }

    // Generate JWT token with email in payload (FR-017)
    let token;
    try {
      token = generateToken({ email });
    } catch (tokenError) {
      loggerService.error(`Failed to generate JWT token: ${tokenError.message}`).catch(() => {});
      return res.status(500).json({
        error: 'Authentication service configuration error. Please contact support.'
      });
    }

    // Generate refresh token for session persistence
    const refreshToken = generateRefreshToken(email);

    // Log successful authentication
    const authType = otpResult.bypass ? 'test OTP' : 'OTP';
    loggerService.info(`User ${email} authenticated successfully via ${authType}`).catch(() => {});

    // Set JWT as httpOnly cookie for security
    res.cookie(JWT_COOKIE_NAME, token, getJWTCookieOptions());
    // Set refresh token as httpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    return res.status(200).json({
      success: true,
      token, // Still return token for backward compatibility during migration
      message: 'Authentication successful'
    });
  } catch (error) {
    loggerService.error(`Error in OTP verification: ${error.message}`, { stack: error.stack }).catch(() => {});
    // Provide more specific error message if possible
    const errorMessage = error.message || 'An unexpected error occurred. Please try again later.';
    return res.status(500).json({
      error: errorMessage.includes('JWT') || errorMessage.includes('secret') 
        ? 'Authentication service configuration error. Please contact support.'
        : 'An unexpected error occurred. Please try again later.'
    });
  }
});

/**
 * POST /api/auth/logout
 * Clear JWT and refresh token cookies and log out user
 */
router.post('/logout', (req, res) => {
  // Invalidate refresh token if present
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (refreshToken) {
    invalidateRefreshToken(refreshToken);
  }

  // Clear JWT cookie
  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  // Clear refresh token cookie
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });

  loggerService.info('User logged out').catch(() => {});

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token using refresh token
 * Returns new JWT token if refresh token is valid
 */
router.post('/refresh', (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    
    // Validate refresh token
    const validation = validateRefreshToken(refreshToken);
    
    if (!validation.valid) {
      // Clear invalid cookies
      res.clearCookie(JWT_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
      });
      
      return res.status(401).json({
        error: validation.error || 'Invalid refresh token'
      });
    }

    // Generate new JWT token
    const email = validation.email;
    let token;
    try {
      token = generateToken({ email });
    } catch (tokenError) {
      loggerService.error(`Failed to generate JWT token during refresh: ${tokenError.message}`).catch(() => {});
      return res.status(500).json({
        error: 'Authentication service error. Please try logging in again.'
      });
    }

    // Set new JWT cookie
    res.cookie(JWT_COOKIE_NAME, token, getJWTCookieOptions());

    loggerService.info(`Token refreshed for ${email}`).catch(() => {});

    return res.status(200).json({
      success: true,
      token, // For backward compatibility
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    loggerService.error(`Error in token refresh: ${error.message}`, { stack: error.stack }).catch(() => {});
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again later.'
    });
  }
});

export default router;
