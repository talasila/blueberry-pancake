import { Router } from 'express';
import jwt from 'jsonwebtoken';
import eventService from '../services/EventService.js';
import eventAdminService from '../services/EventAdminService.js';
import eventConfigService from '../services/EventConfigService.js';
import eventMemberService from '../services/EventMemberService.js';
import pinService from '../services/PINService.js';
import ratingService from '../services/RatingService.js';
import rateLimitService from '../services/RateLimitService.js';
import loggerService from '../logging/Logger.js';
import {
  generateToken,
  generateRefreshToken,
  invalidateRefreshToken,
  addEventToToken,
  JWT_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getJWTCookieOptions,
  getRefreshCookieOptions
} from '../middleware/jwtAuth.js';
import requireAuth from '../middleware/requireAuth.js';
import { isProduction } from '../utils/environment.js';
import { validateEventId } from '../utils/validators.js';
import { handleApiError, badRequestError, unauthorizedError, forbiddenError, notFoundError, rateLimitError, formatRateLimitResponse } from '../utils/apiErrorHandler.js';
import { isValidEmail, normalizeEmail } from '../utils/emailUtils.js';
import { resolveEmailFromUserId } from '../utils/userIdUtils.js';
import { verifyTurnstile } from '../middleware/turnstileProtection.js';

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

    const { name, typeOfItem, theme } = req.body;

    // Create event
    const event = await eventService.createEvent(name, typeOfItem, administratorEmail, theme);

    try {
      const existingToken = req.cookies?.[JWT_COOKIE_NAME];
      if (existingToken) {
        const updatedToken = addEventToToken(existingToken, event.eventId);
        res.cookie(JWT_COOKIE_NAME, updatedToken, getJWTCookieOptions());
        loggerService.info(`Added new event ${event.eventId} to JWT for administrator ${administratorEmail}`);
      }
    } catch (tokenError) {
      loggerService.warn(`Failed to update token with new event ${event.eventId}: ${tokenError.message}`);
    }

    const token = req.cookies?.[JWT_COOKIE_NAME];
    const decoded = token ? jwt.decode(token) : null;
    res.status(201).json({ ...event, user: { email: administratorEmail, exp: decoded?.exp, authMethod: decoded?.authMethod || 'otp' } });
  } catch (error) {
    return handleApiError(res, error, 'create event');
  }
});

/**
 * GET /api/events/mine
 * Get all events where the authenticated user is an administrator
 * Returns event summaries sorted by createdAt descending
 * Requires authentication (JWT token)
 */
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return unauthorizedError(res, 'Authentication required');
    }

    const events = await eventMemberService.getEventSummariesByAdministrator(email);

    res.json({ events });
  } catch (error) {
    return handleApiError(res, error, 'retrieve events');
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
    const { pin, email, name: rawName } = req.body;
    const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Validate email is provided
    if (!email || typeof email !== 'string' || !email.trim()) {
      return badRequestError(res, 'Email address is required', 'INVALID_EMAIL');
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return badRequestError(res, 'Invalid email format', 'INVALID_EMAIL');
    }

    // Validate mandatory name (server-side: trim, non-empty, max 100 chars)
    let validatedName;
    if (rawName && typeof rawName === 'string') {
      const trimmedName = rawName.trim();
      if (trimmedName && trimmedName.length <= 100) {
        validatedName = trimmedName;
      }
    }
    if (!validatedName) {
      return badRequestError(res, 'Display name is required', 'INVALID_DISPLAY_NAME');
    }

    // Validate PIN format using centralized validation
    const pinFormatValidation = pinService.validatePINFormat(pin);
    if (!pinFormatValidation.valid) {
      return badRequestError(res, pinFormatValidation.error, 'INVALID_PIN');
    }

    // Security check: Prevent administrators from logging in via PIN
    // Administrators MUST use OTP authentication for security
    const event = await eventService.getEvent(eventId);
    const isAdmin = eventService.isAdministrator(event, email.trim());

    if (isAdmin) {
      return unauthorizedError(res, 'Administrators must use OTP authentication. Please use the OTP login flow.', 'ADMIN_MUST_USE_OTP');
    }

    // Get user agent for session fingerprinting
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Verify PIN (includes client fingerprinting for security)
    const result = await pinService.verifyPIN(eventId, pin, ipAddress, userAgent);

    if (!result.valid) {
      // Determine appropriate status code based on error type
      if (result.error.includes('Too many attempts')) {
        return rateLimitError(res, result.error, 'RATE_LIMITED');
      }
      if (result.error.includes('not found')) {
        return notFoundError(res, result.error, 'EVENT_NOT_FOUND');
      }
      if (result.error.includes('must be exactly 6 digits')) {
        return badRequestError(res, result.error, 'INVALID_PIN');
      }
      // Default to 401 for invalid PIN
      return unauthorizedError(res, result.error, 'INVALID_PIN');
    }

    // PIN verified successfully - register user for the event
    let registration;
    try {
      registration = await eventMemberService.registerUser(eventId, email.trim(), validatedName);
      // For returning users, update name separately (atomic registration uses if_not_exists)
      if (registration.alreadyExists && validatedName) {
        try {
          await eventConfigService.updateUserName(eventId, email.trim(), validatedName);
        } catch (nameError) {
          loggerService.warn(`Name update failed for returning user in event ${eventId}: ${nameError.message}`);
        }
      }
    } catch (registrationError) {
      // Log registration error but don't fail the PIN verification
      // User can still access the event even if registration fails
      loggerService.warn(`User registration failed for event ${eventId}: ${registrationError.message}`);
    }

    const normalizedEmail = normalizeEmail(email);
    const userId = registration?.userId;

    // Generate JWT token for PIN-authenticated user with event access
    // PIN tokens contain userId (no email) for privacy
    let token;
    try {
      // Check if user already has a JWT token (from cookie or header)
      const existingToken = req.cookies?.[JWT_COOKIE_NAME] ||
        (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

      if (existingToken) {
        // User already authenticated - add this event to their existing token
        try {
          token = addEventToToken(existingToken, eventId);
        } catch (addError) {
          // If adding fails (token expired, invalid, etc.), create new token
          loggerService.warn(`Failed to add event to existing token, creating new: ${addError.message}`);
          token = generateToken({
            userId,
            events: [eventId],
            authMethod: 'pin'
          });
        }
      } else {
        // New authentication - create token with userId (no email)
        token = generateToken({
          userId,
          events: [eventId],
          authMethod: 'pin'
        });
      }
    } catch (tokenError) {
      return handleApiError(res, tokenError, 'generate authentication token');
    }

    const existingRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (existingRefreshToken) {
      await invalidateRefreshToken(existingRefreshToken).catch(err => {
        loggerService.warn(`Could not invalidate old refresh token: ${err.message}`);
      });
    }

    const decoded = jwt.decode(token);
    const refreshToken = await generateRefreshToken(normalizedEmail, { authMethod: 'pin', userId, events: decoded?.events || [eventId] });

    // Set JWT as httpOnly cookie for security
    res.cookie(JWT_COOKIE_NAME, token, getJWTCookieOptions());
    // Set refresh token as httpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
    res.json({
      sessionId: result.sessionId,
      eventId,
      user: { userId, name: registration?.name || validatedName || normalizedEmail.split('@')[0], exp: decoded?.exp, authMethod: 'pin' },
      message: 'PIN verified successfully'
    });
  } catch (error) {
    return handleApiError(res, error, 'verify PIN');
  }
});

/**
 * GET /api/events/:eventId/public-info
 * Return minimal public event information for display on unauthenticated entry pages.
 * Public endpoint - no authentication required.
 * Returns only: name, typeOfItem, theme, state.
 * Rate limited to prevent abuse.
 */
router.get('/:eventId/public-info', async (req, res) => {
  try {
    const { eventId } = req.params;

    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, 'Invalid event ID format');
    }

    // Rate limiting (same pattern as check-admin)
    const globalResult = await rateLimitService.checkGlobalCheckAdminLimit();
    if (!globalResult.allowed) {
      return formatRateLimitResponse(res, globalResult, 'Too many requests');
    }

    if (isProduction()) {
      const clientIP = req.ip || req.socket?.remoteAddress || 'unknown';
      const ipLimit = await rateLimitService.checkIPLimit(clientIP);
      if (!ipLimit.allowed) {
        return formatRateLimitResponse(res, ipLimit, 'Too many requests');
      }
    }

    const event = await eventService.getEvent(eventId);

    // Return only public-safe fields
    res.json({
      name: event.name,
      typeOfItem: event.typeOfItem,
      theme: event.theme || 'classic',
      state: event.state,
    });
  } catch (error) {
    return handleApiError(res, error, 'get public event info');
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

    const turnstileResult = await verifyTurnstile(req, res);
    if (!turnstileResult.success) return;

    // Global rate limit (caps total check-admin requests across all callers)
    const globalResult = await rateLimitService.checkGlobalCheckAdminLimit();
    if (!globalResult.allowed) {
      return formatRateLimitResponse(res, globalResult, 'Too many requests');
    }

    if (isProduction()) {
      const clientIP = req.ip || req.socket?.remoteAddress || 'unknown';
      const ipLimit = await rateLimitService.checkIPLimit(clientIP);
      
      if (!ipLimit.allowed) {
        return formatRateLimitResponse(res, ipLimit, 'Too many requests');
      }
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
    const administrators = await eventAdminService.getAdministrators(eventId, requesterEmail);

    res.json({ administrators });
  } catch (error) {
    return handleApiError(res, error, 'retrieve administrators');
  }
});

/**
 * POST /api/events/:eventId/administrators
 * Add a new administrator to an event
 * Requires OTP authentication (JWT token) and owner authorization
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
    const event = await eventAdminService.addAdministrator(eventId, email, requesterEmail);

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
    await eventAdminService.deleteAdministrator(eventId, emailToDelete, requesterEmail);

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
    const result = await eventAdminService.regeneratePIN(eventId, administratorEmail);

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
      return forbiddenError(res, 'Only administrators can update event name');
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
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }
    const requesterEmail = req.user?.email;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    const event = await eventService.getEvent(eventIdValidation.eventId);

    // Check if requester is administrator
    if (!eventService.isAdministrator(event, requesterEmail)) {
      return forbiddenError(res, 'Only administrators can view item configuration');
    }

    // Get item configuration
    const config = await eventConfigService.getItemConfiguration(eventId);

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
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }
    const requesterEmail = req.user?.email;
    const { numberOfItems, excludedItemIds } = req.body;

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    const result = await eventConfigService.updateItemConfiguration(
      eventIdValidation.eventId,
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
    const ratingConfig = await eventConfigService.getRatingConfiguration(eventId);

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
    const { maxRating, ratings, noteSuggestionsEnabled, personalityEnabled, expectedUpdatedAt } = req.body;

    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    // Update rating configuration
    const result = await eventConfigService.updateRatingConfiguration(
      eventIdValidation.eventId,
      { maxRating, ratings, noteSuggestionsEnabled, personalityEnabled },
      requesterEmail,
      expectedUpdatedAt
    );

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'update rating configuration');
  }
});

/**
 * PATCH /api/events/:eventId/theme
 * Update event theme preset. Only allowed when event is in "created" or "paused" state.
 * Requires authentication (JWT token) and administrator authorization.
 */
router.patch('/:eventId/theme', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const requesterEmail = req.user?.email;
    const { theme } = req.body;

    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    if (!requesterEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    const updatedEvent = await eventConfigService.updateTheme(
      eventIdValidation.eventId,
      theme,
      requesterEmail
    );

    res.json(updatedEvent);
  } catch (error) {
    return handleApiError(res, error, 'update theme');
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

    // Resolve user email from JWT (supports both OTP and PIN auth)
    let userEmail = req.user?.email;
    if (!userEmail && req.user?.userId) {
      const evt = await eventService.getEvent(eventId);
      userEmail = resolveEmailFromUserId(evt, req.user.userId);
    }

    if (!userEmail || typeof userEmail !== 'string') {
      return unauthorizedError(res, 'Authentication required');
    }

    // Get bookmarks for user
    const bookmarks = await eventConfigService.getUserBookmarks(eventId, userEmail);

    res.json({
      eventId,
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

    // Resolve user email from JWT (supports both OTP and PIN auth)
    let userEmail = req.user?.email;
    if (!userEmail && req.user?.userId) {
      const evt = await eventService.getEvent(eventId);
      userEmail = resolveEmailFromUserId(evt, req.user.userId);
    }

    if (!userEmail || typeof userEmail !== 'string') {
      return unauthorizedError(res, 'Authentication required');
    }

    // Get user profile
    const result = await eventConfigService.getUserProfile(eventId, userEmail);

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

    // Resolve user email from JWT (supports both OTP and PIN auth)
    let userEmail = req.user?.email;
    if (!userEmail && req.user?.userId) {
      const evt = await eventService.getEvent(eventId);
      userEmail = resolveEmailFromUserId(evt, req.user.userId);
    }

    if (!userEmail || typeof userEmail !== 'string') {
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate name (optional, but if provided must be a string)
    if (name !== undefined && typeof name !== 'string') {
      return badRequestError(res, 'Name must be a string');
    }

    // Update user name
    const result = await eventConfigService.updateUserName(eventId, userEmail, name || '');

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

    // Resolve user email from JWT (supports both OTP and PIN auth)
    let userEmail = req.user?.email;
    if (!userEmail && req.user?.userId) {
      const evt = await eventService.getEvent(eventId);
      userEmail = resolveEmailFromUserId(evt, req.user.userId);
    }

    if (!userEmail || typeof userEmail !== 'string') {
      return unauthorizedError(res, 'Authentication required');
    }

    // Validate bookmarks
    if (!Array.isArray(bookmarks)) {
      return badRequestError(res, 'Bookmarks must be an array');
    }

    // Save bookmarks for user
    const result = await eventConfigService.saveUserBookmarks(eventId, userEmail, bookmarks);

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
    const result = await eventAdminService.deleteAllRatingsAndBookmarks(eventId, requesterEmail);

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
    const result = await eventAdminService.deleteUser(eventId, userEmailToDelete, requesterEmail);

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
    const result = await eventAdminService.deleteAllUsers(eventId, requesterEmail);

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'delete users');
  }
});

export default router;
