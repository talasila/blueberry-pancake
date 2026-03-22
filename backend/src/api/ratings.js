import { Router } from 'express';
import ratingService from '../services/RatingService.js';
import eventService from '../services/EventService.js';
import eventMemberService from '../services/EventMemberService.js';
import { toCSV } from '../utils/csvParser.js';
import requireAuth from '../middleware/requireAuth.js';
import requireEventMembership from '../middleware/requireEventMembership.js';
import { isValidEmail } from '../utils/emailUtils.js';
import { validateEventId, validateNumericItemId, validateAuthentication } from '../utils/validators.js';
import { handleApiError, badRequestError, unauthorizedError } from '../utils/apiErrorHandler.js';

const router = Router({ mergeParams: true });

/**
 * Resolve the user's email from JWT — handles both OTP (email in token) and PIN (userId in token).
 * For PIN auth, scans the event users map to find the email matching the userId.
 */
async function resolveUserEmail(req, eventId) {
  if (req.user?.email) return req.user.email;
  if (req.user?.userId) {
    const event = await eventService.getEvent(eventId);
    for (const [email, data] of Object.entries(event?.users || {})) {
      if (data.userId === req.user.userId) return email;
    }
  }
  return null;
}

/**
 * GET /api/events/:eventId/ratings
 * Get all ratings for an event (CSV format)
 * Supports ?mine=true to return only the current user's ratings
 * Non-admin requests replace email with userId; admin requests keep email
 * Requires JWT authentication
 */
router.get('/ratings', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    const mineOnly = req.query.mine === 'true';

    if (mineOnly) {
      // Return only the current user's ratings (no email/userId in response)
      let userEmail;
      if (req.user.email) {
        userEmail = req.user.email;
      } else if (req.user.userId) {
        // PIN auth — resolve email from userId
        const event = await eventService.getEvent(eventId);
        for (const [email, data] of Object.entries(event.users || {})) {
          if (data.userId === req.user.userId) {
            userEmail = email;
            break;
          }
        }
      }

      if (!userEmail) {
        return badRequestError(res, 'Unable to identify current user');
      }

      const allRatings = await ratingService.getRatings(eventId);
      // Filter to current user and strip email column
      const myRatings = allRatings.filter(r => r.email?.toLowerCase() === userEmail.toLowerCase());
      const sanitizedRatings = myRatings.map(({ email, ...rest }) => rest);
      const csvContent = toCSV(sanitizedRatings);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csvContent);
    }

    // Determine if requester is admin
    const event = await eventService.getEvent(eventId);
    let isAdmin = false;
    if (req.user.email) {
      isAdmin = eventService.isAdministrator(event, req.user.email);
    } else if (req.user.userId) {
      // PIN users are never admins for this purpose
      isAdmin = false;
    }

    const ratings = await ratingService.getRatings(eventId);

    if (isAdmin) {
      // Admin: include emails (existing behavior)
      const csvContent = toCSV(ratings);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csvContent);
    }

    // Non-admin: replace email with userId
    const userIdMap = await eventMemberService.buildUserIdMap(event);
    const sanitizedRatings = ratings.map(r => {
      const lookup = userIdMap.get(r.email?.toLowerCase());
      return { userId: lookup?.userId || 'unknown', ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'email')) };
    });
    const csvContent = toCSV(sanitizedRatings);
    res.setHeader('Content-Type', 'text/csv');
    return res.send(csvContent);
  } catch (error) {
    return handleApiError(res, error, 'retrieve ratings');
  }
});

/**
 * POST /api/events/:eventId/ratings
 * Submit a rating for an item
 * Requires JWT authentication
 */
router.post('/ratings', requireAuth, requireEventMembership, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }
    
    const { itemId, rating, note } = req.body;

    // Get user email (from JWT for OTP, or resolved by requireEventMembership for PIN)
    const userEmail = req.user?.email || req.user?.resolvedEmail;
    if (!userEmail) {
      return unauthorizedError(res, 'Unable to identify user');
    }

    // Validate required fields
    if (itemId === undefined || itemId === null) {
      return badRequestError(res, 'Item ID is required');
    }

    if (rating === undefined || rating === null) {
      return badRequestError(res, 'Rating is required');
    }

    // Submit rating — pass req.event from middleware to avoid redundant getEvent()
    const savedRating = await ratingService.submitRating(eventId, itemId, rating, note || '', userEmail, req.event);

    res.status(201).json(savedRating);
  } catch (error) {
    return handleApiError(res, error, 'submit rating');
  }
});

/**
 * GET /api/events/:eventId/ratings/:itemId
 * Get user's rating for a specific item
 * Requires JWT authentication
 */
router.get('/ratings/:itemId', requireAuth, async (req, res) => {
  try {
    const { eventId, itemId } = req.params;
    
    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Get user email (from JWT for OTP, or resolved by requireEventMembership for PIN)
    const userEmail = req.user?.email || req.user?.resolvedEmail;
    if (!userEmail) {
      return unauthorizedError(res, 'Unable to identify user');
    }

    // Validate itemId
    const itemIdValidation = validateNumericItemId(itemId);
    if (!itemIdValidation.valid) {
      return badRequestError(res, 'Invalid item ID');
    }

    // Get rating
    const rating = await ratingService.getRating(eventId, itemIdValidation.value, userEmail);

    if (!rating) {
      return res.status(404).json({
        error: 'Rating not found'
      });
    }

    res.json(rating);
  } catch (error) {
    return handleApiError(res, error, 'retrieve rating');
  }
});

/**
 * DELETE /api/events/:eventId/ratings/:itemId
 * Delete user's rating for a specific item
 * Requires JWT authentication
 */
router.delete('/ratings/:itemId', requireAuth, requireEventMembership, async (req, res) => {
  try {
    const { eventId, itemId } = req.params;
    
    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Get user email (from JWT for OTP, or resolved by requireEventMembership for PIN)
    const userEmail = req.user?.email || req.user?.resolvedEmail;
    if (!userEmail) {
      return unauthorizedError(res, 'Unable to identify user');
    }

    // Validate itemId
    const itemIdValidation = validateNumericItemId(itemId);
    if (!itemIdValidation.valid) {
      return badRequestError(res, 'Invalid item ID');
    }

    // Delete rating — pass req.event from middleware to avoid redundant getEvent()
    const deleted = await ratingService.deleteRating(eventId, itemIdValidation.value, userEmail, req.event);

    if (!deleted) {
      return res.status(404).json({
        error: 'Rating not found'
      });
    }

    res.status(200).json({ message: 'Rating deleted successfully' });
  } catch (error) {
    return handleApiError(res, error, 'delete rating');
  }
});

export default router;
