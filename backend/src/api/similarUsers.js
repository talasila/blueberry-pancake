import { Router } from 'express';
import similarityService from '../services/SimilarityService.js';
import ratingService from '../services/RatingService.js';
import eventService from '../services/EventService.js';
import requireAuth from '../middleware/requireAuth.js';
import { isValidEmail } from '../utils/emailUtils.js';
import { validateEventId, validateAuthentication } from '../utils/validators.js';
import { handleApiError, badRequestError, unauthorizedError, notFoundError } from '../utils/apiErrorHandler.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/events/:eventId/similar-users
 * Get list of users with similar taste preferences to the current authenticated user
 * Requires JWT authentication
 * 
 * Access control:
 * - Available during active events (state: 'started', 'paused', or 'completed')
 * - User must have rated at least 3 items
 */
router.get('/similar-users', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Get event to check state
    const event = await eventService.getEvent(eventId);
    if (!event) {
      return notFoundError(res, 'Event not found');
    }

    // Validate event state - allow 'started', 'paused', or 'completed' states
    if (event.state !== 'started' && event.state !== 'paused' && event.state !== 'completed') {
      return badRequestError(res, `Similar users feature is only available when event is started, paused, or completed. Current state: ${event.state}`);
    }

    // Get user email from JWT token
    const userEmail = req.user?.email;
    const authValidation = validateAuthentication(userEmail);
    if (!authValidation.valid) {
      return unauthorizedError(res, 'Email is required for similar users lookup');
    }

    // Validate email format using shared utility
    if (!isValidEmail(userEmail)) {
      return badRequestError(res, 'Invalid email format');
    }

    // Check if user has rated at least 3 items (FR-002, FR-008)
    const allRatings = await ratingService.getRatings(eventId);
    const userRatings = allRatings.filter(rating => {
      const normalizedEmail = rating.email?.trim().toLowerCase();
      return normalizedEmail === userEmail.trim().toLowerCase();
    });

    if (userRatings.length < 3) {
      return badRequestError(res, 'You need to rate at least 3 items before similar users can be found');
    }

    // Get user names from event config if available
    const userNames = {};
    if (event.users) {
      Object.keys(event.users).forEach(email => {
        const userData = event.users[email];
        if (userData && userData.name) {
          userNames[email.toLowerCase()] = userData.name;
        }
      });
    }

    // Find similar users
    // Get all similar users (no limit)
    const similarUsers = await similarityService.findSimilarUsers(eventId, userEmail, Infinity);

    // Add user names to response (show name if available, otherwise email per clarification)
    const similarUsersWithNames = similarUsers.map(user => ({
      ...user,
      name: userNames[user.email.toLowerCase()] || null
    }));

    res.json({
      similarUsers: similarUsersWithNames,
      currentUserEmail: userEmail,
      eventId
    });
  } catch (error) {
    return handleApiError(res, error, 'retrieve similar users');
  }
});

export default router;
