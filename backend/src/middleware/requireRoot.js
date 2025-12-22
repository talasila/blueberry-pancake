import configLoader from '../config/configLoader.js';

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
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }

  if (!configLoader.isRootAdmin(userEmail)) {
    return res.status(403).json({ 
      error: 'Root access required' 
    });
  }

  next();
}

export default requireRoot;
