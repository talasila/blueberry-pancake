import { Router } from 'express';
import similarityService from '../services/SimilarityService.js';
import ratingService from '../services/RatingService.js';
import eventService from '../services/EventService.js';
import loggerService from '../logging/Logger.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/events/:eventId/similar-users
 * Get list of users with similar taste preferences to the current authenticated user
 * Requires JWT authentication
 * 
 * Access control:
 * - Only available during active events (state: 'started' or 'paused')
 * - User must have rated at least 3 items
 */
router.get('/similar-users', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // Validate event ID format
    const idValidation = eventService.validateEventId(eventId);
    if (!idValidation.valid) {
      return res.status(400).json({
        error: idValidation.error
      });
    }

    // Get event to check state (FR-010: only during active events)
    const event = await eventService.getEvent(eventId);
    if (!event) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    // Validate event state - only allow 'started' or 'paused' states
    if (event.state !== 'started' && event.state !== 'paused') {
      return res.status(400).json({
        error: `Similar users feature is only available during active events. Current state: ${event.state}`
      });
    }

    // Get user email from JWT token
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({
        error: 'Email is required for similar users lookup'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail.trim())) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Check if user has rated at least 3 items (FR-002, FR-008)
    const allRatings = await ratingService.getRatings(eventId);
    const userRatings = allRatings.filter(rating => {
      const normalizedEmail = rating.email?.toLowerCase().trim();
      return normalizedEmail === userEmail.toLowerCase().trim();
    });

    if (userRatings.length < 3) {
      return res.status(400).json({
        error: 'You need to rate at least 3 items before similar users can be found'
      });
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
    const similarUsers = await similarityService.findSimilarUsers(eventId, userEmail, 5);

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
    loggerService.error(`Error getting similar users: ${error.message}`, error).catch(() => {});

    // Handle specific error cases
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    res.status(500).json({
      error: 'Failed to retrieve similar users. Please try again.'
    });
  }
});

export default router;
