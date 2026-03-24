import configLoader from '../config/configLoader.js';
import { unauthorizedError, forbiddenError } from '../utils/apiErrorHandler.js';

/**
 * Middleware to require root administrator access
 * Must be used AFTER requireAuth middleware (needs req.user populated)
 * 
 * Checks if the authenticated user's email is in the rootAdmins config array.
 * Returns 403 Forbidden if user is not a root administrator.
 */
export function requireRoot(req, res, next) {
  // requireAuth must run first to populate req.user
  const userEmail = req.user?.email;

  if (!userEmail) {
    return unauthorizedError(res, 'Authentication required', 'AUTHENTICATION_REQUIRED');
  }

  if (!configLoader.isRootAdmin(userEmail)) {
    return forbiddenError(res, 'Root access required', 'ROOT_ACCESS_REQUIRED');
  }

  next();
}

export default requireRoot;
