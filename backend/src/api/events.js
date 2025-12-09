import { Router } from 'express';
import eventService from '../services/EventService.js';
import pinService from '../services/PINService.js';
import loggerService from '../logging/Logger.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

/**
 * POST /api/events
 * Create a new event
 * Requires authentication (JWT token)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    // Extract administrator email from JWT token (set by jwtAuth middleware)
    const administratorEmail = req.user?.email;

    if (!administratorEmail) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const { name, typeOfItem } = req.body;

    // Create event
    const event = await eventService.createEvent(name, typeOfItem, administratorEmail);

    // Return created event
    res.status(201).json(event);
  } catch (error) {
    // Log full error details for debugging
    loggerService.error(`Event creation error: ${error.message}`, error).catch(() => {});
    if (error.stack) {
      loggerService.error(`Stack trace: ${error.stack}`).catch(() => {});
    }

    // Handle validation errors (400)
    if (error.message.includes('required') || 
        error.message.includes('invalid') || 
        error.message.includes('cannot be empty') ||
        error.message.includes('characters') ||
        error.message.includes('must be')) {
      return res.status(400).json({
        error: error.message
      });
    }

    // Handle configuration errors
    if (error.message.includes('dataDirectory') || error.message.includes('configuration')) {
      return res.status(500).json({
        error: 'Server configuration error. Please contact support.'
      });
    }

    // Handle server errors (500)
    // In development, include more error details
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to create event. Please try again.',
      ...(isDevelopment && { details: error.message, stack: error.stack })
    });
  }
});

/**
 * POST /api/events/:eventId/verify-pin
 * Verify PIN and create verification session
 * Registers user for the event upon successful PIN verification
 * No authentication required (public endpoint)
 */
router.post('/:eventId/verify-pin', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { pin, email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Validate event ID format
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      return res.status(400).json({
        error: 'Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.'
      });
    }

    // Validate email is provided
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        error: 'Email address is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Validate PIN is provided
    if (!pin) {
      return res.status(400).json({
        error: 'PIN is required'
      });
    }

    // Verify PIN
    const result = await pinService.verifyPIN(eventId, pin, ipAddress);

    if (!result.valid) {
      // Determine appropriate status code based on error type
      if (result.error.includes('Too many attempts')) {
        return res.status(429).json({ error: result.error });
      }
      if (result.error.includes('not found')) {
        return res.status(404).json({ error: result.error });
      }
      if (result.error.includes('must be exactly 6 digits')) {
        return res.status(400).json({ error: result.error });
      }
      // Default to 401 for invalid PIN
      return res.status(401).json({ error: result.error });
    }

    // PIN verified successfully - register user for the event
    try {
      await eventService.registerUser(eventId, email.trim());
      loggerService.info(`User registered for event ${eventId}: ${email.trim()}`);
    } catch (registrationError) {
      // Log registration error but don't fail the PIN verification
      // User can still access the event even if registration fails
      loggerService.error(`Failed to register user for event ${eventId}: ${registrationError.message}`, registrationError);
    }

    // PIN verified successfully
    res.json({
      sessionId: result.sessionId,
      eventId,
      message: 'PIN verified successfully'
    });
  } catch (error) {
    loggerService.error(`PIN verification error: ${error.message}`, error).catch(() => {});
    
    // Handle event not found
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Handle server errors
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to verify PIN. Please try again.',
      ...(isDevelopment && { details: error.message })
    });
  }
});

/**
 * Middleware to check PIN session OR JWT token for event access
 */
function requirePINOrAuth(req, res, next) {
  const { eventId } = req.params;
  const sessionId = req.headers['x-pin-session-id'];
  const authHeader = req.headers.authorization;

  // Check PIN session first
  if (sessionId) {
    const pinVerified = pinService.checkPINSession(eventId, sessionId);
    if (pinVerified) {
      req.pinVerified = true;
      req.eventId = eventId;
      return next();
    }
  }

  // If no valid PIN session, check JWT token
  if (authHeader) {
    // Use jwtAuth middleware to validate JWT
    return jwtAuth(req, res, (err) => {
      if (err) {
        // JWT invalid - check if we had a PIN session attempt
        if (sessionId) {
          return res.status(401).json({ error: 'PIN verification expired or invalid' });
        }
        return res.status(401).json({ error: 'Authentication required' });
      }
      // JWT valid
      next();
    });
  }

  // No PIN session and no JWT token
  return res.status(401).json({ error: 'PIN verification or authentication required' });
}

/**
 * GET /api/events/:eventId
 * Retrieve event by ID
 * Requires either PIN verification session OR OTP authentication (JWT token)
 */
router.get('/:eventId', requirePINOrAuth, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate event ID format before processing (8-character alphanumeric)
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      return res.status(400).json({
        error: 'Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.'
      });
    }

    // Get event using EventService
    const event = await eventService.getEvent(eventId);

    // Remove PIN from response for non-administrators (only return PIN if user is administrator via JWT)
    const isAdministrator = req.user?.email && 
      event.administrator?.toLowerCase() === req.user.email.toLowerCase();
    
    if (!isAdministrator) {
      // Remove PIN from response
      const { pin, pinGeneratedAt, ...eventWithoutPIN } = event;
      return res.json(eventWithoutPIN);
    }

    // Return full event data including PIN for administrators
    res.json(event);
  } catch (error) {
    // Log full error details for debugging
    loggerService.error(`Event retrieval error: ${error.message}`, error).catch(() => {});
    if (error.stack) {
      loggerService.error(`Stack trace: ${error.stack}`).catch(() => {});
    }

    // Handle event not found (404)
    if (error.message.includes('not found') || error.message.includes('Event not found')) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    // Handle validation errors (400)
    if (error.message.includes('Invalid event ID format') || 
        error.message.includes('Event ID is required')) {
      return res.status(400).json({
        error: error.message
      });
    }

    // Handle server errors (500)
    // In development, include more error details
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to retrieve event. Please try again.',
      ...(isDevelopment && { details: error.message, stack: error.stack })
    });
  }
});

/**
 * POST /api/events/:eventId/regenerate-pin
 * Regenerate PIN for an event (admin only)
 * Requires OTP authentication (JWT token)
 */
router.post('/:eventId/regenerate-pin', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const administratorEmail = req.user?.email;

    if (!administratorEmail) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Validate event ID format
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      return res.status(400).json({
        error: 'Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.'
      });
    }

    // Regenerate PIN
    const result = await eventService.regeneratePIN(eventId, administratorEmail);

    res.json(result);
  } catch (error) {
    loggerService.error(`PIN regeneration error: ${error.message}`, error).catch(() => {});
    
    // Handle event not found
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Handle authorization errors
    if (error.message.includes('administrator')) {
      return res.status(401).json({ error: error.message });
    }

    // Handle server errors
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to regenerate PIN. Please try again.',
      ...(isDevelopment && { details: error.message })
    });
  }
});

export default router;
