import { Router } from 'express';
import ratingService from '../services/RatingService.js';
import { toCSV } from '../utils/csvParser.js';
import requireAuth from '../middleware/requireAuth.js';
import { isValidEmail } from '../utils/emailUtils.js';
import { validateEventId, validateNumericItemId, validateAuthentication } from '../utils/validators.js';
import { handleApiError, badRequestError, unauthorizedError } from '../utils/apiErrorHandler.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/events/:eventId/ratings
 * Get all ratings for an event (CSV format)
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

    // Get ratings as CSV
    const ratings = await ratingService.getRatings(eventId);
    const csvContent = toCSV(ratings);

    res.setHeader('Content-Type', 'text/csv');
    res.send(csvContent);
  } catch (error) {
    return handleApiError(res, error, 'retrieve ratings');
  }
});

/**
 * POST /api/events/:eventId/ratings
 * Submit a rating for an item
 * Requires JWT authentication
 */
router.post('/ratings', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }
    
    const { itemId, rating, note } = req.body;

    // Get user email from JWT token only
    const userEmail = req.user?.email;
    const authValidation = validateAuthentication(userEmail);
    if (!authValidation.valid) {
      return unauthorizedError(res, 'Email is required for rating submission');
    }

    // Validate email format using shared utility
    if (!isValidEmail(userEmail)) {
      return badRequestError(res, 'Invalid email format');
    }

    // Validate required fields
    if (itemId === undefined || itemId === null) {
      return badRequestError(res, 'Item ID is required');
    }

    if (rating === undefined || rating === null) {
      return badRequestError(res, 'Rating is required');
    }

    // Submit rating
    const savedRating = await ratingService.submitRating(eventId, itemId, rating, note || '', userEmail);

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

    // Get user email from JWT token only
    const userEmail = req.user?.email;
    const authValidation = validateAuthentication(userEmail);
    if (!authValidation.valid) {
      return unauthorizedError(res, 'Email is required');
    }

    // Validate email format using shared utility
    if (!isValidEmail(userEmail)) {
      return badRequestError(res, 'Invalid email format');
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
router.delete('/ratings/:itemId', requireAuth, async (req, res) => {
  try {
    const { eventId, itemId } = req.params;
    
    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Get user email from JWT token only
    const userEmail = req.user?.email;
    const authValidation = validateAuthentication(userEmail);
    if (!authValidation.valid) {
      return unauthorizedError(res, 'Email is required');
    }

    // Validate email format using shared utility
    if (!isValidEmail(userEmail)) {
      return badRequestError(res, 'Invalid email format');
    }

    // Validate itemId
    const itemIdValidation = validateNumericItemId(itemId);
    if (!itemIdValidation.valid) {
      return badRequestError(res, 'Invalid item ID');
    }

    // Delete rating
    const deleted = await ratingService.deleteRating(eventId, itemIdValidation.value, userEmail);

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
