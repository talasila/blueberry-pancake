import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import configLoader from '../config/configLoader.js';

// JWT cookie configuration
export const JWT_COOKIE_NAME = 'jwt_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';

// In-memory refresh token store (in production, use Redis or database)
// Format: { refreshToken: { email, createdAt, expiresAt } }
const refreshTokenStore = new Map();

/**
 * Get JWT cookie options based on environment
 * @returns {object} Cookie options
 */
export function getJWTCookieOptions() {
  const expiration = configLoader.get('security.jwtExpiration') || '24h';
  // Parse expiration to milliseconds (e.g., '24h' -> 86400000, '4h' -> 14400000)
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

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/',
  };
}

/**
 * JWT authentication middleware
 * Validates JWT tokens from httpOnly cookie or Authorization header
 */
export function jwtAuth(req, res, next) {
  try {
    // Try to get token from httpOnly cookie first (more secure)
    let token = req.cookies?.[JWT_COOKIE_NAME];
    
    // Fall back to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }
    const secret = process.env.JWT_SECRET || configLoader.get('security.jwtSecret');

    if (!secret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    // In production, reject default secret
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const defaultSecret = 'CHANGE_THIS_IN_PRODUCTION_USE_ENV_VAR';
    if (!isDevelopment && secret === defaultSecret) {
      return res.status(500).json({ error: 'JWT secret must be changed from default value in production' });
    }

    // Verify token (use secret as-is - in development, default is allowed)
    const decoded = jwt.verify(token, secret);
    
    // Attach decoded token to request
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Token verification failed' });
  }
}

/**
 * Generate JWT token
 * @param {object} payload - Token payload (typically user info)
 * @returns {string} JWT token
 */
export function generateToken(payload) {
  const secret = process.env.JWT_SECRET || configLoader.get('security.jwtSecret');
  const expiration = configLoader.get('security.jwtExpiration') || '4h';

  // In development, allow default secret for testing
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const defaultSecret = 'CHANGE_THIS_IN_PRODUCTION_USE_ENV_VAR';
  
  if (!secret) {
    throw new Error('JWT secret not configured');
  }

  // In production, reject default secret
  if (!isDevelopment && secret === defaultSecret) {
    throw new Error('JWT secret must be changed from default value in production');
  }

  // Use secret as-is (in development, default is allowed for testing)
  return jwt.sign(payload, secret, { expiresIn: expiration });
}

/**
 * Generate a secure refresh token
 * @param {string} email - User email
 * @returns {string} Refresh token
 */
export function generateRefreshToken(email) {
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const refreshExpiration = configLoader.get('security.refreshTokenExpiration') || '7d';
  
  // Parse expiration to milliseconds
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

  const expiresAt = Date.now() + expiresInMs;
  
  // Store refresh token
  refreshTokenStore.set(refreshToken, {
    email,
    createdAt: Date.now(),
    expiresAt
  });

  return refreshToken;
}

/**
 * Get refresh cookie options based on environment
 * @returns {object} Cookie options for refresh token
 */
export function getRefreshCookieOptions() {
  const refreshExpiration = configLoader.get('security.refreshTokenExpiration') || '7d';
  
  // Parse expiration to milliseconds
  const match = refreshExpiration.match(/^(\d+)([dhms])$/);
  let maxAge = 7 * 24 * 60 * 60 * 1000; // Default 7 days
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 'd': maxAge = value * 24 * 60 * 60 * 1000; break;
      case 'h': maxAge = value * 60 * 60 * 1000; break;
      case 'm': maxAge = value * 60 * 1000; break;
      case 's': maxAge = value * 1000; break;
    }
  }

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/api/auth', // Only sent for auth endpoints
  };
}

/**
 * Validate refresh token and return email if valid
 * @param {string} refreshToken - Refresh token to validate
 * @returns {{valid: boolean, email?: string, error?: string}}
 */
export function validateRefreshToken(refreshToken) {
  if (!refreshToken) {
    return { valid: false, error: 'No refresh token provided' };
  }

  const tokenData = refreshTokenStore.get(refreshToken);
  
  if (!tokenData) {
    return { valid: false, error: 'Invalid refresh token' };
  }

  if (Date.now() > tokenData.expiresAt) {
    // Clean up expired token
    refreshTokenStore.delete(refreshToken);
    return { valid: false, error: 'Refresh token expired' };
  }

  return { valid: true, email: tokenData.email };
}

/**
 * Invalidate a refresh token
 * @param {string} refreshToken - Refresh token to invalidate
 * @returns {boolean} True if token was found and removed
 */
export function invalidateRefreshToken(refreshToken) {
  return refreshTokenStore.delete(refreshToken);
}

/**
 * Invalidate all refresh tokens for an email
 * @param {string} email - User email
 * @returns {number} Number of tokens invalidated
 */
export function invalidateAllRefreshTokens(email) {
  let count = 0;
  for (const [token, data] of refreshTokenStore.entries()) {
    if (data.email === email) {
      refreshTokenStore.delete(token);
      count++;
    }
  }
  return count;
}
