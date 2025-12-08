import { jwtAuth } from './jwtAuth.js';

/**
 * Require authentication middleware
 * Uses existing jwtAuth middleware to protect routes
 * Redirects unauthenticated users are handled by frontend
 */
export function requireAuth(req, res, next) {
  // Use existing JWT auth middleware
  jwtAuth(req, res, (err) => {
    if (err) {
      // jwtAuth already sends 401 response, just pass through
      return;
    }
    // Authentication successful, continue to next middleware
    next();
  });
}

export default requireAuth;
