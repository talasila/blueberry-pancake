import { Router } from 'express';
import eventService from '../services/EventService.js';
import pinService from '../services/PINService.js';
import ratingService from '../services/RatingService.js';
import loggerService from '../logging/Logger.js';
import { 
  generateToken, 
  generateRefreshToken,
  JWT_COOKIE_NAME, 
  REFRESH_COOKIE_NAME,
  getJWTCookieOptions,
  getRefreshCookieOptions
} from '../middleware/jwtAuth.js';
import requireAuth from '../middleware/requireAuth.js';
import { validateEventId } from '../utils/validators.js';
import { handleApiError, badRequestError, unauthorizedError } from '../utils/apiErrorHandler.js';
import { isValidEmail } from '../utils/emailUtils.js';

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
      return unauthorizedError(res, 'Authentication required');
    }

    const { name, typeOfItem } = req.body;

    // Create event
    const event = await eventService.createEvent(name, typeOfItem, administratorEmail);

    // Return created event
    res.status(201).json(event);
  } catch (error) {
    return handleApiError(res, error, 'create event');
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
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Validate email is provided
    if (!email || typeof email !== 'string' || !email.trim()) {
      return badRequestError(res, 'Email address is required');
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return badRequestError(res, 'Invalid email format');
    }

    // Validate PIN format using centralized validation
    const pinFormatValidation = pinService.validatePINFormat(pin);
    if (!pinFormatValidation.valid) {
      return badRequestError(res, pinFormatValidation.error);
    }

    // Get user agent for session fingerprinting
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Verify PIN (includes client fingerprinting for security)
    const result = await pinService.verifyPIN(eventId, pin, ipAddress, userAgent);

    if (!result.valid) {
      // Determine appropriate status code based on error type
      if (result.error.includes('Too many attempts')) {
        return res.status(429).json({ error: result.error });
      }
      if (result.error.includes('not found')) {
        return res.status(404).json({ error: result.error });
      }
      if (result.error.includes('must be exactly 6 digits')) {
        return badRequestError(res, result.error);
      }
      // Default to 401 for invalid PIN
      return unauthorizedError(res, result.error);
    }

    // PIN verified successfully - register user for the event
    try {
      await eventService.registerUser(eventId, email.trim());
    } catch (registrationError) {
      // Log registration error but don't fail the PIN verification
      // User can still access the event even if registration fails
      loggerService.warn(`User registration failed for event ${eventId}: ${registrationError.message}`);
    }

    // Generate JWT token for PIN-authenticated user
    let token;
    try {
      token = generateToken({ email: email.trim() });
    } catch (tokenError) {
      return handleApiError(res, tokenError, 'generate authentication token');
    }

    // Generate refresh token for session persistence
    const refreshToken = generateRefreshToken(email.trim());

    // Set JWT as httpOnly cookie for security
    res.cookie(JWT_COOKIE_NAME, token, getJWTCookieOptions());
    // Set refresh token as httpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    // PIN verified successfully
    res.json({
      sessionId: result.sessionId,
      eventId,
      token, // Still return token for backward compatibility
      message: 'PIN verified successfully'
    });
  } catch (error) {
    return handleApiError(res, error, 'verify PIN');
  }
});

/**
 * GET /api/events/:eventId/check-admin
 * Check if an email is an administrator for an event
 * Public endpoint - no authentication required
 * Used to determine which authentication flow to use (PIN vs OTP)
 * 
 * Rate limited to prevent user enumeration attacks
 */
router.get('/:eventId/check-admin', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { email } = req.query;

    // Validate inputs
    if (!email || typeof email !== 'string') {
      return badRequestError(res, 'Email address is required');
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, 'Invalid event ID format');
    }

    // Rate limit check to prevent user enumeration
    // Import rateLimitService dynamically to avoid circular dependencies
    const rateLimitService = (await import('../services/RateLimitService.js')).default;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const ipLimit = rateLimitService.checkIPLimit(clientIP);
    
    if (!ipLimit.allowed) {
      const retryMinutes = Math.ceil((ipLimit.retryAfter || 900) / 60);
      return res.status(429).json({
        error: `Too many requests. Please try again in ${retryMinutes} minute(s).`,
        retryAfter: ipLimit.retryAfter
      });
    }

    // Get event (this will throw if event doesn't exist)
    const event = await eventService.getEvent(eventId);

    // Check if email is an administrator
    const isAdmin = eventService.isAdministrator(event, email);

    // Return result (don't expose other event data)
    res.json({ isAdmin });
  } catch (error) {
    return handleApiError(res, error, 'check administrator status');
  }
});

/**
 * GET /api/events/:eventId
 * Retrieve event by ID
 * Requires JWT token authentication
 */
router.get('/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Get event using EventService (lazy migration happens in getEvent)
    const event = await eventService.getEvent(eventId);

    // Remove PIN from response for non-administrators (only return PIN if user is administrator via JWT)
    const isAdministrator = req.user?.email && 
      eventService.isAdministrator(event, req.user.email);
    
    if (!isAdministrator) {
      // Remove PIN from response
      const { pin, pinGeneratedAt, ...eventWithoutPIN } = event;
      return res.json(eventWithoutPIN);
    }

    // Return full event data including PIN for administrators
    res.json(event);
  } catch (error) {
    return handleApiError(res, error, 'retrieve event');
  }
});

/**
 * GET /api/events/:eventId/administrators
 * Get list of administrators for an event
 * Requires OTP authentication (JWT token) and administrator authorization
 */
router.get('/:eventId/administrators', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const requesterEmail = req.user?.email;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Get administrators
    const administrators = await eventService.getAdministrators(eventId, requesterEmail);

    res.json({ administrators });
  } catch (error) {
    return handleApiError(res, error, 'retrieve administrators');
  }
});

/**
 * POST /api/events/:eventId/administrators
 * Add a new administrator to an event
 * Requires OTP authentication (JWT token) and administrator authorization
 */
router.post('/:eventId/administrators', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { email } = req.body;
    const requesterEmail = req.user?.email;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return badRequestError(res, 'Email address is required');
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Add administrator
    const event = await eventService.addAdministrator(eventId, email, requesterEmail);

    res.json({ administrators: event.administrators });
  } catch (error) {
    return handleApiError(res, error, 'add administrator');
  }
});

/**
 * DELETE /api/events/:eventId/administrators/:email
 * Delete an administrator from an event
 * Requires OTP authentication (JWT token) and administrator authorization
 */
router.delete('/:eventId/administrators/:email', requireAuth, async (req, res) => {
  try {
    const { eventId, email } = req.params;
    const requesterEmail = req.user?.email;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Decode email from URL
    const emailToDelete = decodeURIComponent(email);

    if (!emailToDelete || typeof emailToDelete !== 'string' || !emailToDelete.trim()) {
      return badRequestError(res, 'Email address is required');
    }

    // Delete administrator
    await eventService.deleteAdministrator(eventId, emailToDelete, requesterEmail);

    res.json({ success: true });
  } catch (error) {
    return handleApiError(res, error, 'delete administrator');
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
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Regenerate PIN
    const result = await eventService.regeneratePIN(eventId, administratorEmail);

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'regenerate PIN');
  }
});

/**
 * PATCH /api/events/:eventId
 * Update event name
 * Requires authentication (JWT token) and administrator authorization
 * 
 * Request body:
 * - name: New event name (required, max 100 characters)
 * 
 * @returns {object} Updated event object
 * @throws {400} Bad request - validation error
 * @throws {401} Unauthorized - authentication required
 * @throws {403} Forbidden - user is not an administrator
 * @throws {404} Not found - event does not exist
 * @throws {500} Internal server error
 */
router.patch('/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const requesterEmail = req.user?.email;
    const { name } = req.body;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Validate name is provided
    if (!name || typeof name !== 'string' || !name.trim()) {
      return badRequestError(res, 'Event name is required');
    }

    // Validate name length
    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return badRequestError(res, 'Event name must be 100 characters or less');
    }

    // Get event to check authorization
    const event = await eventService.getEvent(eventId);

    // Check if requester is administrator
    if (!eventService.isAdministrator(event, requesterEmail)) {
      return res.status(403).json({
        error: 'Only administrators can update event name'
      });
    }

    // Update event name
    const updatedEvent = {
      ...event,
      name: trimmedName
    };

    const result = await eventService.updateEvent(eventId, updatedEvent);

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'update event name');
  }
});

/**
 * PATCH /api/events/:eventId/state
 * Transition event state
 * 
 * Transitions an event to a new state. Only administrators can perform state transitions.
 * Uses optimistic locking to prevent concurrent modification conflicts.
 * 
 * Valid transitions:
 * - created → started
 * - started → paused, completed
 * - paused → started, completed
 * - completed → started, paused
 * 
 * Request body:
 * - state: Target state for transition (required)
 * - currentState: Expected current state for optimistic locking (required)
 * 
 * Requires authentication (JWT token) and administrator authorization
 * 
 * @returns {object} Updated event object with new state
 * @throws {400} Bad request - invalid state, invalid transition, or missing parameters
 * @throws {401} Unauthorized - authentication required
 * @throws {403} Forbidden - user is not an administrator
 * @throws {404} Not found - event does not exist
 * @throws {409} Conflict - state has changed (optimistic locking failure)
 * @throws {500} Internal server error
 */
router.patch('/:eventId/state', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { state, currentState } = req.body;
    const administratorEmail = req.user?.email;

    if (!administratorEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Validate request body
    if (!state || !currentState) {
      return badRequestError(res, 'Both state and currentState are required');
    }

    // Transition state
    const event = await eventService.transitionState(
      eventId,
      state,
      currentState,
      administratorEmail
    );

    // Invalidate ratings cache on state change (T078)
    ratingService.invalidateCache(eventId);

    res.json(event);
  } catch (error) {
    return handleApiError(res, error, 'transition event state');
  }
});

/**
 * GET /api/events/:eventId/item-configuration
 * Get item configuration for an event
 * 
 * Returns the item configuration for the specified event, including the number of items
 * and excluded item IDs. If no configuration exists, returns default values (20 items, no exclusions).
 * Only authenticated administrators can access this endpoint.
 * 
 * Requires authentication (JWT token) and administrator authorization
 * 
 * @returns {object} Item configuration object with numberOfItems and excludedItemIds
 * @throws {401} Unauthorized - authentication required
 * @throws {403} Forbidden - user is not an administrator
 * @throws {404} Not found - event does not exist
 * @throws {500} Internal server error
 */
router.get('/:eventId/item-configuration', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const requesterEmail = req.user?.email;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    // Get event to check authorization
    const event = await eventService.getEvent(eventId);

    // Check if requester is administrator
    if (!eventService.isAdministrator(event, requesterEmail)) {
      return res.status(403).json({
        error: 'Only administrators can view item configuration'
      });
    }

    // Get item configuration
    const config = await eventService.getItemConfiguration(eventId);

    res.json(config);
  } catch (error) {
    return handleApiError(res, error, 'get item configuration');
  }
});

/**
 * PATCH /api/events/:eventId/item-configuration
 * Update item configuration for an event
 * 
 * Updates the item configuration for the specified event. Can update numberOfItems and/or
 * excludedItemIds. Partial updates are supported (only provided fields are updated).
 * Only authenticated administrators can update item configuration.
 * 
 * Requires authentication (JWT token) and administrator authorization
 * 
 * Request body:
 * - numberOfItems: (optional) Integer between 1 and 100
 * - excludedItemIds: (optional) Comma-separated string or array of integers
 * 
 * @returns {object} Updated item configuration object
 * @throws {400} Bad request - validation error
 * @throws {401} Unauthorized - authentication required
 * @throws {403} Forbidden - user is not an administrator
 * @throws {404} Not found - event does not exist
 * @throws {500} Internal server error
 */
router.patch('/:eventId/item-configuration', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const requesterEmail = req.user?.email;
    const { numberOfItems, excludedItemIds } = req.body;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    // Update item configuration
    const result = await eventService.updateItemConfiguration(
      eventId,
      { numberOfItems, excludedItemIds },
      requesterEmail
    );

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'update item configuration');
  }
});

/**
 * GET /api/events/:eventId/rating-configuration
 * Get rating configuration for an event
 * 
 * Returns the rating configuration for the specified event, including maxRating
 * and ratings array with labels and colors. Returns default values if not configured.
 * 
 * No authentication required (public endpoint for event access)
 * 
 * @returns {object} Rating configuration object with maxRating and ratings array
 * @throws {400} Bad request - invalid event ID format
 * @throws {404} Not found - event does not exist
 * @throws {500} Internal server error
 */
router.get('/:eventId/rating-configuration', async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Get rating configuration
    const ratingConfig = await eventService.getRatingConfiguration(eventId);

    res.json(ratingConfig);
  } catch (error) {
    return handleApiError(res, error, 'get rating configuration');
  }
});

/**
 * PATCH /api/events/:eventId/rating-configuration
 * Update rating configuration for an event
 * 
 * Updates the rating configuration for the specified event. Can update maxRating
 * and/or ratings array. Partial updates are supported (only provided fields are updated).
 * Max rating can only be changed when event is in "created" state.
 * Uses optimistic locking to prevent concurrent modification conflicts.
 * Only authenticated administrators can update rating configuration.
 * 
 * Requires authentication (JWT token) and administrator authorization
 * 
 * Request body:
 * - maxRating: (optional) Integer between 2 and 4
 * - ratings: (optional) Array of rating objects with value, label, color
 * - expectedUpdatedAt: (optional) Expected updatedAt timestamp for optimistic locking
 * 
 * @returns {object} Updated rating configuration object
 * @throws {400} Bad request - validation error
 * @throws {401} Unauthorized - authentication required
 * @throws {403} Forbidden - user is not an administrator
 * @throws {404} Not found - event does not exist
 * @throws {409} Conflict - event has been modified (optimistic locking failure)
 * @throws {500} Internal server error
 */
router.patch('/:eventId/rating-configuration', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const requesterEmail = req.user?.email;
    const { maxRating, ratings, noteSuggestionsEnabled, expectedUpdatedAt } = req.body;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    // Update rating configuration
    const result = await eventService.updateRatingConfiguration(
      eventId,
      { maxRating, ratings, noteSuggestionsEnabled },
      requesterEmail,
      expectedUpdatedAt
    );

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'update rating configuration');
  }
});

/**
 * GET /api/events/:eventId/bookmarks
 * Get bookmarks for the current user in an event
 * Requires either PIN verification session OR OTP authentication (JWT token)
 */
router.get('/:eventId/bookmarks', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Get user email from JWT token
    const userEmail = req.user?.email;

    if (!userEmail || typeof userEmail !== 'string') {
      return unauthorizedError(res, 'Authentication required');
    }

    // Get bookmarks for user
    const bookmarks = await eventService.getUserBookmarks(eventId, userEmail);

    res.json({
      eventId,
      email: userEmail,
      bookmarks
    });
  } catch (error) {
    return handleApiError(res, error, 'retrieve bookmarks');
  }
});

/**
 * GET /api/events/:eventId/profile
 * Get user profile (name) for an event
 * Requires PIN or JWT authentication
 */
router.get('/:eventId/profile', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Get user email from JWT token
    const userEmail = req.user?.email;

    if (!userEmail || typeof userEmail !== 'string') {
      return unauthorizedError(res, 'Authentication required');
    }

    // Get user profile
    const result = await eventService.getUserProfile(eventId, userEmail);

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'retrieve user profile');
  }
});

/**
 * PUT /api/events/:eventId/profile
 * Update user profile (name) for an event
 * Requires PIN or JWT authentication
 */
router.put('/:eventId/profile', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name } = req.body;

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Get user email from JWT token
    const userEmail = req.user?.email;

    if (!userEmail || typeof userEmail !== 'string') {
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate name (optional, but if provided must be a string)
    if (name !== undefined && typeof name !== 'string') {
      return badRequestError(res, 'Name must be a string');
    }

    // Update user name
    const result = await eventService.updateUserName(eventId, userEmail, name || '');

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'update user profile');
  }
});

/**
 * PUT /api/events/:eventId/bookmarks
 * Save bookmarks for the current user in an event
 * Requires either PIN verification session OR OTP authentication (JWT token)
 */
router.put('/:eventId/bookmarks', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { bookmarks } = req.body;

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Get user email from JWT token
    const userEmail = req.user?.email;

    if (!userEmail || typeof userEmail !== 'string') {
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate bookmarks
    if (!Array.isArray(bookmarks)) {
      return badRequestError(res, 'Bookmarks must be an array');
    }

    // Save bookmarks for user
    const result = await eventService.saveUserBookmarks(eventId, userEmail, bookmarks);

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'save bookmarks');
  }
});

/**
 * DELETE /api/events/:eventId
 * Delete an event and all its data
 * Requires OTP authentication (JWT token) and owner authorization
 * Only the event owner can delete the event
 */
router.delete('/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const requesterEmail = req.user?.email;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Delete event
    const result = await eventService.deleteEvent(eventId, requesterEmail);

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'delete event');
  }
});

/**
 * DELETE /api/events/:eventId/ratings
 * Delete all ratings and bookmarks for an event
 * Requires OTP authentication (JWT token) and administrator authorization
 * Only event administrators can delete ratings and bookmarks
 */
router.delete('/:eventId/ratings', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const requesterEmail = req.user?.email;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Delete all ratings and bookmarks
    const result = await eventService.deleteAllRatingsAndBookmarks(eventId, requesterEmail);

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'delete ratings and bookmarks');
  }
});

/**
 * DELETE /api/events/:eventId/users/:email
 * Delete a single user and all their associated data
 * Requires OTP authentication (JWT token) and administrator authorization
 * Only event administrators can delete users
 * Prevents deletion of owner or last administrator
 */
router.delete('/:eventId/users/:email', requireAuth, async (req, res) => {
  try {
    const { eventId, email } = req.params;
    const requesterEmail = req.user?.email;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Decode email from URL
    const userEmailToDelete = decodeURIComponent(email);

    if (!userEmailToDelete || typeof userEmailToDelete !== 'string' || !userEmailToDelete.trim()) {
      return badRequestError(res, 'User email is required');
    }

    // Delete user
    const result = await eventService.deleteUser(eventId, userEmailToDelete, requesterEmail);

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'delete user');
  }
});

/**
 * DELETE /api/events/:eventId/users
 * Delete all users (excluding administrators) and all their associated data
 * Requires OTP authentication (JWT token) and administrator authorization
 * Only event administrators can delete users
 */
router.delete('/:eventId/users', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const requesterEmail = req.user?.email;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Delete all users
    const result = await eventService.deleteAllUsers(eventId, requesterEmail);

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'delete users');
  }
});

export default router;
