import { jwtAuth, hasEventAccess } from './jwtAuth.js';

/**
 * Require authentication middleware
 * Uses existing jwtAuth middleware to protect routes
 * For event-specific routes, also validates event access
 * Redirects unauthenticated users are handled by frontend
 */
export function requireAuth(req, res, next) {
  // First, validate JWT token
  jwtAuth(req, res, (err) => {
    if (err) {
      return next(err);
    }
    
    // JWT is valid, now check event access if this is an event-specific route
    const eventId = req.params.eventId;
    
    // If no eventId in params, allow access (non-event routes like /api/events)
    if (!eventId) {
      return next();
    }
    
    // Check if user has access to this specific event
    if (!hasEventAccess(req.user, eventId)) {
      return res.status(403).json({ 
        error: 'Access denied: You do not have access to this event. Please authenticate for this event first.',
        code: 'EVENT_ACCESS_DENIED'
      });
    }
    
    // User has access to this event
    next();
  });
}

export default requireAuth;
