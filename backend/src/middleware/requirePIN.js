import pinService from '../services/PINService.js';

/**
 * Require PIN verification middleware
 * Checks if user has a valid PIN verification session for the event
 * Allows access to event main page without OTP authentication
 */
function requirePIN(req, res, next) {
  const { eventId } = req.params;
  const sessionId = req.headers['x-pin-session-id'] || req.cookies?.pinSessionId;

  if (!sessionId) {
    return res.status(401).json({ error: 'PIN verification required' });
  }

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' });
  }

  const verified = pinService.checkPINSession(eventId, sessionId);
  if (!verified) {
    return res.status(401).json({ error: 'PIN verification expired or invalid' });
  }

  // Attach PIN verification info to request
  req.pinVerified = true;
  req.eventId = eventId;
  next();
}

export default requirePIN;
