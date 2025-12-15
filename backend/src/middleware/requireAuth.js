import { jwtAuth } from './jwtAuth.js';

/**
 * Require authentication middleware
 * Uses existing jwtAuth middleware to protect routes
 * Redirects unauthenticated users are handled by frontend
 */
export function requireAuth(req, res, next) {
  // Use existing JWT auth middleware
  // Note: jwtAuth sends its own error responses (401, 500) and doesn't call next with error
  // It only calls next() on success, so we can directly pass next to it
  jwtAuth(req, res, next);
}

export default requireAuth;
