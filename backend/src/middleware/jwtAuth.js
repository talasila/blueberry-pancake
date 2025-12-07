import jwt from 'jsonwebtoken';
import configLoader from '../config/configLoader.js';

/**
 * JWT authentication middleware
 * Validates JWT tokens in Authorization header
 */
export function jwtAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const secret = process.env.JWT_SECRET || configLoader.get('security.jwtSecret');

    if (!secret || secret === 'CHANGE_THIS_IN_PRODUCTION_USE_ENV_VAR') {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    // Verify token
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
  const expiration = configLoader.get('security.jwtExpiration') || '24h';

  if (!secret || secret === 'CHANGE_THIS_IN_PRODUCTION_USE_ENV_VAR') {
    throw new Error('JWT secret not configured');
  }

  return jwt.sign(payload, secret, { expiresIn: expiration });
}
