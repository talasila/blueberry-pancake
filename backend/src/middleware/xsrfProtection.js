import Tokens from 'csrf';
import configLoader from '../config/configLoader.js';
import loggerService from '../logging/Logger.js';

/**
 * XSRF protection middleware
 * Generates and validates CSRF tokens for state-changing requests
 * Uses csrf package (replacement for deprecated csurf)
 */
let csrfTokens = null;
const secretKey = process.env.CSRF_SECRET || 'csrf-secret-key-change-in-production';

/**
 * Initialize CSRF protection
 */
export function initializeXSRF() {
  const xsrfEnabled = configLoader.get('security.xsrfEnabled');
  
  if (!xsrfEnabled) {
    loggerService.info('XSRF protection is disabled in configuration').catch(() => {});
    return null;
  }

  // Initialize CSRF token generator
  csrfTokens = new Tokens();
  loggerService.info('XSRF protection initialized').catch(() => {});

  return true;
}

/**
 * Get CSRF token (for GET requests to obtain token)
 */
export function getCSRFToken(req, res, next) {
  if (!csrfTokens) {
    return res.json({ csrfToken: null, message: 'XSRF protection disabled' });
  }

  // Get or create secret from session/cookie
  let secret = req.cookies?.csrfSecret;
  
  if (!secret) {
    // Generate new secret
    secret = csrfTokens.secretSync();
    // Store secret in cookie
    res.cookie('csrfSecret', secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  // Generate token from secret
  const token = csrfTokens.create(secret);
  
  res.json({ csrfToken: token });
}

/**
 * Validate CSRF token (for POST/PUT/DELETE requests)
 */
export function validateCSRF(req, res, next) {
  if (!csrfTokens) {
    return next(); // XSRF disabled, skip validation
  }

  const secret = req.cookies?.csrfSecret;
  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;

  if (!secret) {
    return res.status(403).json({ error: 'CSRF secret not found. Please request a CSRF token first.' });
  }

  if (!token) {
    return res.status(403).json({ error: 'CSRF token missing. Include X-CSRF-Token header or csrfToken in body.' });
  }

  // Verify token
  if (!csrfTokens.verify(secret, token)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}
