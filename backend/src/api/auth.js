import { Router } from 'express';
import jwt from 'jsonwebtoken';
import emailService from '../services/EmailService.js';
import otpService from '../services/OTPService.js';
import rateLimitService from '../services/RateLimitService.js';
import suspensionService from '../services/SuspensionService.js';
import eventService from '../services/EventService.js';
import eventMemberService from '../services/EventMemberService.js';
import eventConfigService from '../services/EventConfigService.js';
import { validateEventId } from '../utils/validators.js';
import {
  generateToken,
  generateRefreshToken,
  validateRefreshToken,
  invalidateRefreshToken,
  clearAuthCookies,
  JWT_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getJWTCookieOptions,
  getRefreshCookieOptions
} from '../middleware/jwtAuth.js';
import loggerService from '../logging/Logger.js';
import { verifyTurnstile } from '../middleware/turnstileProtection.js';
import { isProduction, isDevelopment, isTest } from '../utils/environment.js';
import { handleApiError, formatRateLimitResponse } from '../utils/apiErrorHandler.js';
import { normalizeEmail, isValidEmail } from '../utils/emailUtils.js';

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

    const normalizedEmail = normalizeEmail(email);

    // Validate email format
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        error: 'Invalid email address format'
      });
    }

    // Turnstile verification (rejects invalid/expired tokens; missing tokens fail open)
    const turnstileResult = await verifyTurnstile(req, res);
    if (!turnstileResult.success) return;

    // Global rate limit (caps total OTP requests across all callers)
    const globalResult = await rateLimitService.checkGlobalLimit();
    if (!globalResult.allowed) {
      return formatRateLimitResponse(res, globalResult, 'Too many requests');
    }

    // Check if email is suspended
    const suspensionStatus = await suspensionService.isSuspended(normalizedEmail);
    if (suspensionStatus.suspended) {
      const remainingMinutes = Math.ceil((suspensionStatus.endTime - Date.now()) / 60000);
      return res.status(403).json({
        error: `Account is temporarily suspended. Please try again in ${remainingMinutes} minute(s).`
      });
    }

    if (isProduction()) {
      const clientIP = req.ip || req.socket?.remoteAddress || 'unknown';
      const rateLimitResult = await rateLimitService.checkLimits(normalizedEmail, clientIP);

      if (!rateLimitResult.allowed) {
        return formatRateLimitResponse(res, rateLimitResult, 'Rate limit exceeded');
      }
    }

    // Generate OTP
    const otp = otpService.generateOTP();

    // Store OTP (this will invalidate any existing OTP for this email - FR-014)
    otpService.storeOTP(normalizedEmail, otp);

    // Send OTP via email (or skip in development/test environments)
    const emailResult = await emailService.sendOTP(normalizedEmail, otp);

    if (!emailResult.success) {
      loggerService.error(`Failed to send OTP email to ${normalizedEmail}: ${emailResult.error}`).catch(() => {});
      return res.status(500).json({
        error: emailResult.error || 'Failed to send OTP email. Please try again later.'
      });
    }

    const isDevOrTest = isDevelopment() || isTest();
    
    // Log successful OTP request
    loggerService.info(`OTP requested for ${normalizedEmail}`).catch(() => {});
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
    return handleApiError(res, error, 'request OTP');
  }
});

/**
 * POST /api/auth/otp/verify
 * Verify OTP code and issue JWT token
 */
router.post('/otp/verify', async (req, res) => {
  try {
    const { email, otp, name: rawName, eventId } = req.body;

    // Validate inputs
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email address is required'
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const rawOtp = otp;
    if (rawOtp == null || (typeof rawOtp !== 'string' && typeof rawOtp !== 'number')) {
      return res.status(400).json({
        error: 'OTP code is required'
      });
    }
    const otpTrimmed = String(rawOtp).trim();
    if (!otpTrimmed) {
      return res.status(400).json({
        error: 'OTP code is required'
      });
    }

    // Validate email format
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        error: 'Invalid email address format'
      });
    }

    // Test OTP bypasses all restrictions in non-production environments (FR-019)
    const isTestOTP = !isProduction() && otpTrimmed === '123456';
    
    let otpResult;
    if (isTestOTP) {
      // Test OTP bypass - skip all validation
      otpResult = { valid: true, bypass: true };
    } else {
      // Check if email is suspended (always check, security best practice)
      const suspensionStatus = await suspensionService.isSuspended(normalizedEmail);
      if (suspensionStatus.suspended) {
        const remainingMinutes = Math.ceil((suspensionStatus.endTime - Date.now()) / 60000);
        return res.status(403).json({
          error: `Account is temporarily suspended. Please try again in ${remainingMinutes} minute(s).`
        });
      }

      // Validate OTP (normal flow)
      otpResult = await otpService.validateOTP(normalizedEmail, otpTrimmed);
    }

    if (!otpResult.valid) {
      // Record failed attempt (unless it's a test OTP bypass)
      if (!otpResult.bypass) {
        const attemptResult = await suspensionService.recordFailedAttempt(normalizedEmail);

        if (attemptResult.suspended) {
          loggerService.warn(`Email ${normalizedEmail} suspended after ${attemptResult.attempts} failed attempts`).catch(() => {});
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
    await suspensionService.resetFailedAttempts(normalizedEmail);

    if (!otpResult.bypass) {
      // Invalidate used OTP (not needed for test OTP which is static)
      otpService.invalidateOTP(normalizedEmail);
    }

    // Save display name if provided with a valid eventId
    if (rawName && typeof rawName === 'string' && eventId && typeof eventId === 'string') {
      const eventIdValidation = validateEventId(eventId);
      const trimmedName = rawName.trim();
      if (eventIdValidation.valid && trimmedName && trimmedName.length <= 100) {
        try {
          await eventConfigService.updateUserName(eventId, normalizedEmail, trimmedName);
        } catch (nameError) {
          loggerService.warn(`Name update failed for admin in event ${eventId}: ${nameError.message}`);
        }
      }
    }

    // Get all events where user is an administrator
    let adminEvents = [];
    try {
      adminEvents = await eventMemberService.getEventsByAdministrator(normalizedEmail);
      loggerService.info(`Admin has access to ${adminEvents.length} event(s)`).catch(() => {});

      // Ensure admin has a userId in each event's users map (lazy backfill)
      for (const adminEventId of adminEvents) {
        try {
          const evt = await eventService.getEvent(adminEventId);
          if (evt?.users?.[normalizedEmail] && !evt.users[normalizedEmail].userId) {
            await eventMemberService.ensureUserId(evt, normalizedEmail);
          }
        } catch (backfillError) {
          // Non-critical — userId will be backfilled on next access
          loggerService.debug(`userId backfill skipped for event ${adminEventId}: ${backfillError.message}`);
        }
      }
    } catch (error) {
      loggerService.error(`Failed to get events for administrator: ${error.message}`).catch(() => {});
      // Continue with empty events array - user can still authenticate
    }

    // Generate JWT token with email and events in payload
    let token;
    try {
      token = generateToken({ 
        email: normalizedEmail,
        events: adminEvents,
        authMethod: 'otp'
      });
    } catch (tokenError) {
      loggerService.error(`Failed to generate JWT token: ${tokenError.message}`).catch(() => {});
      return res.status(500).json({
        error: 'Authentication service configuration error. Please contact support.'
      });
    }

    const refreshToken = await generateRefreshToken(normalizedEmail);

    // Log successful authentication
    const authType = otpResult.bypass ? 'test OTP' : 'OTP';
    loggerService.info(`User ${normalizedEmail} authenticated successfully via ${authType}`).catch(() => {});

    // Set JWT as httpOnly cookie for security
    res.cookie(JWT_COOKIE_NAME, token, getJWTCookieOptions());
    // Set refresh token as httpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    const decoded = jwt.decode(token);
    return res.status(200).json({
      success: true,
      user: { email: normalizedEmail, exp: decoded?.exp, authMethod: 'otp' },
      message: 'Authentication successful'
    });
  } catch (error) {
    return handleApiError(res, error, 'verify OTP');
  }
});

/**
 * POST /api/auth/logout
 * Clear JWT and refresh token cookies and log out user
 */
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      await invalidateRefreshToken(refreshToken);
    }

    clearAuthCookies(res);

    loggerService.info('User logged out').catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    return handleApiError(res, error, 'logout');
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token using refresh token
 * Returns new JWT token if refresh token is valid
 */
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    
    const validation = await validateRefreshToken(refreshToken);
    
    if (!validation.valid) {
      clearAuthCookies(res);

      return res.status(401).json({
        error: validation.error || 'Invalid refresh token'
      });
    }

    // Generate new JWT token with updated event access
    const email = validation.email;
    
    // Get current events where user is an administrator (refresh access list)
    let adminEvents = [];
    try {
      adminEvents = await eventMemberService.getEventsByAdministrator(email);
      loggerService.debug(`Token refresh: User ${email} has access to ${adminEvents.length} event(s)`).catch(() => {});
    } catch (error) {
      loggerService.error(`Failed to get events during refresh for ${email}: ${error.message}`).catch(() => {});
      // Continue with empty events array
    }
    
    let token;
    try {
      token = generateToken({ 
        email,
        events: adminEvents,
        authMethod: 'otp'
      });
    } catch (tokenError) {
      loggerService.error(`Failed to generate JWT token during refresh: ${tokenError.message}`).catch(() => {});
      return res.status(500).json({
        error: 'Authentication service error. Please try logging in again.'
      });
    }

    // Rotate refresh token: invalidate the old one and issue a new one
    await invalidateRefreshToken(refreshToken);
    const newRefreshToken = await generateRefreshToken(email);

    // Set new JWT cookie
    res.cookie(JWT_COOKIE_NAME, token, getJWTCookieOptions());
    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());

    loggerService.info(`Token refreshed for ${email}`).catch(() => {});

    const decoded = jwt.decode(token);
    return res.status(200).json({
      success: true,
      user: { email, exp: decoded?.exp, authMethod: 'otp' },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    return handleApiError(res, error, 'refresh token');
  }
});

export default router;
