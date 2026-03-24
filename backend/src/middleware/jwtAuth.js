import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import configLoader from '../config/configLoader.js';
import { isProduction } from '../utils/environment.js';
import dataRepository from '../data/DynamoDBRepository.js';

// JWT cookie configuration
export const JWT_COOKIE_NAME = 'jwt_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Get JWT cookie options based on environment
 * @returns {object} Cookie options
 */
export function getJWTCookieOptions() {
  const expiration = configLoader.get('security.jwtExpiration') || '24h';
  const match = expiration.match(/^(\d+)([hms])$/);
  let maxAge = 24 * 60 * 60 * 1000; // Default 24 hours
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 'h': maxAge = value * 60 * 60 * 1000; break;
      case 'm': maxAge = value * 60 * 1000; break;
      case 's': maxAge = value * 1000; break;
    }
  }

  const isProd = isProduction();
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    maxAge,
    path: '/',
  };
}

/**
 * JWT authentication middleware
 * Validates JWT tokens from Authorization header or httpOnly cookie.
 * Bearer header is checked first so that an explicit header always governs
 * authentication — prevents a garbage Bearer from being ignored while the
 * browser-sent cookie silently authenticates the request.
 */
export function jwtAuth(req, res, next) {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = req.cookies?.[JWT_COOKIE_NAME];
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Missing or invalid authorization', code: 'AUTHENTICATION_REQUIRED' });
    }
    const secret = process.env.JWT_SECRET || configLoader.get('security.jwtSecret');

    if (!secret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    const isProd = isProduction();
    const defaultSecret = 'CHANGE_THIS_IN_PRODUCTION_USE_ENV_VAR';
    if (isProd && secret === defaultSecret) {
      return res.status(500).json({ error: 'JWT secret must be changed from default value in production' });
    }
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

    // Attach decoded token to request
    req.user = decoded;

    // Detect legacy PIN tokens (have email but no userId)
    if (decoded.authMethod === 'pin' && decoded.email && !decoded.userId) {
      req.user.legacyPinToken = true;
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
    }
    return res.status(500).json({ error: 'Token verification failed' });
  }
}

/**
 * Generate JWT token with event access control
 * @param {object} payload - Token payload with email and optional events array
 * @param {string} payload.email - User email
 * @param {Array<string>} payload.events - Array of event IDs user has access to
 * @returns {string} JWT token
 */
export function generateToken(payload) {
  const secret = process.env.JWT_SECRET || configLoader.get('security.jwtSecret');
  const expiration = configLoader.get('security.jwtExpiration') || '24h';

  const isProd = isProduction();
  const defaultSecret = 'CHANGE_THIS_IN_PRODUCTION_USE_ENV_VAR';
  
  if (!secret) {
    throw new Error('JWT secret not configured');
  }

  if (isProd && secret === defaultSecret) {
    throw new Error('JWT secret must be changed from default value in production');
  }

  // Role-dependent payload: PIN guests get userId (no email), OTP admins get email
  const events = Array.isArray(payload.events) ? payload.events : [];
  let tokenPayload;

  if (payload.authMethod === 'pin' && payload.userId) {
    // Guest (PIN): opaque userId, no email
    tokenPayload = {
      userId: payload.userId,
      events,
      authMethod: 'pin'
    };
  } else {
    // Admin (OTP) or legacy: email-based
    tokenPayload = {
      email: payload.email,
      events,
      ...(payload.authMethod && { authMethod: payload.authMethod })
    };
  }

  // Use secret as-is (in development, default is allowed for testing)
  return jwt.sign(tokenPayload, secret, { expiresIn: expiration });
}

/**
 * Add event access to existing JWT token
 * Decodes the token, adds the event to the events array, and generates a new token
 * @param {string} token - Existing JWT token
 * @param {string} eventId - Event ID to add access for
 * @returns {string} New JWT token with updated event access
 */
export function addEventToToken(token, eventId) {
  const secret = process.env.JWT_SECRET || configLoader.get('security.jwtSecret');
  
  if (!secret) {
    throw new Error('JWT secret not configured');
  }

  // Decode existing token
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  
  // Get existing events or initialize empty array
  const events = Array.isArray(decoded.events) ? decoded.events : [];
  
  // Add new event if not already present
  if (!events.includes(eventId)) {
    events.push(eventId);
  }
  
  // Generate new token with updated events (preserve identity and authMethod)
  return generateToken({
    ...(decoded.email && { email: decoded.email }),
    ...(decoded.userId && { userId: decoded.userId }),
    events,
    ...(decoded.authMethod && { authMethod: decoded.authMethod })
  });
}

/**
 * Verify if a user has access to a specific event
 * @param {object} decodedToken - Decoded JWT token payload
 * @param {string} eventId - Event ID to check access for
 * @returns {boolean} True if user has access to the event
 */
export function hasEventAccess(decodedToken, eventId) {
  if (!decodedToken || !eventId) {
    return false;
  }
  
  // Check if events array exists and includes the event
  const events = Array.isArray(decodedToken.events) ? decodedToken.events : [];
  return events.includes(eventId);
}

function parseRefreshExpiration() {
  const refreshExpiration = configLoader.get('security.refreshTokenExpiration') || '7d';
  const match = refreshExpiration.match(/^(\d+)([dhms])$/);
  let expiresInMs = 7 * 24 * 60 * 60 * 1000; // Default 7 days
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 'd': expiresInMs = value * 24 * 60 * 60 * 1000; break;
      case 'h': expiresInMs = value * 60 * 60 * 1000; break;
      case 'm': expiresInMs = value * 60 * 1000; break;
      case 's': expiresInMs = value * 1000; break;
    }
  }
  return expiresInMs;
}

/**
 * Generate a secure refresh token and store in DynamoDB
 * @param {string} email - User email
 * @returns {Promise<string>} Refresh token
 */
export async function generateRefreshToken(email) {
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const expiresAt = Date.now() + parseRefreshExpiration();

  await dataRepository.storeRefreshToken(hashToken(refreshToken), email, expiresAt);

  return refreshToken;
}

/**
 * Get refresh cookie options based on environment
 * @returns {object} Cookie options for refresh token
 */
export function getRefreshCookieOptions() {
  const maxAge = parseRefreshExpiration();

  const isProd = isProduction();
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    maxAge,
    path: '/api/auth',
  };
}

/**
 * Validate refresh token and return email if valid
 * @param {string} refreshToken - Refresh token to validate
 * @returns {Promise<{valid: boolean, email?: string, error?: string}>}
 */
export async function validateRefreshToken(refreshToken) {
  if (!refreshToken) {
    return { valid: false, error: 'No refresh token provided' };
  }

  const tokenData = await dataRepository.getRefreshToken(hashToken(refreshToken));

  if (!tokenData) {
    return { valid: false, error: 'Invalid refresh token' };
  }

  if (Date.now() > tokenData.expiresAt) {
    await dataRepository.deleteRefreshToken(hashToken(refreshToken));
    return { valid: false, error: 'Refresh token expired' };
  }

  return { valid: true, email: tokenData.email };
}

/**
 * Invalidate a refresh token
 * @param {string} refreshToken - Refresh token to invalidate
 * @returns {Promise<void>}
 */
export async function invalidateRefreshToken(refreshToken) {
  if (!refreshToken) return;
  await dataRepository.deleteRefreshToken(hashToken(refreshToken));
}

/**
 * Invalidate all refresh tokens for an email
 * @param {string} email - User email
 * @returns {Promise<number>} Number of tokens invalidated
 */
export async function invalidateAllRefreshTokens(email) {
  return dataRepository.deleteRefreshTokensByEmail(email);
}

/**
 * Clear both JWT and refresh token cookies from the response
 * @param {object} res - Express response object
 */
export function clearAuthCookies(res) {
  const isProd = isProduction();

  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    path: '/',
  });

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    path: '/api/auth',
  });
}
