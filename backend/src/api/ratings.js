import { Router } from 'express';
import ratingService from '../services/RatingService.js';
import { toCSV } from '../utils/csvParser.js';
import loggerService from '../logging/Logger.js';
import requireAuth from '../middleware/requireAuth.js';
import eventService from '../services/EventService.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/events/:eventId/ratings
 * Get all ratings for an event (CSV format)
 * Requires JWT authentication
 */
router.get('/ratings', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // Get ratings as CSV
    const ratings = await ratingService.getRatings(eventId);
    const csvContent = toCSV(ratings);

    res.setHeader('Content-Type', 'text/csv');
    res.send(csvContent);
  } catch (error) {
    loggerService.error(`Error getting ratings: ${error.message}`, error).catch(() => {});

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(500).json({
      error: 'Failed to retrieve ratings'
    });
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
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    const { itemId, rating, note } = req.body;

    // Get user email from JWT token only
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({
        error: 'Email is required for rating submission'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail.trim())) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Validate required fields
    if (itemId === undefined || itemId === null) {
      return res.status(400).json({
        error: 'Item ID is required'
      });
    }

    if (rating === undefined || rating === null) {
      return res.status(400).json({
        error: 'Rating is required'
      });
    }

    // Submit rating
    const savedRating = await ratingService.submitRating(eventId, itemId, rating, note || '', userEmail);

    res.status(201).json(savedRating);
  } catch (error) {
    loggerService.error(`Error submitting rating: ${error.message}`, error).catch(() => {});

    // Handle validation errors
    if (error.message.includes('not in started state') || 
        error.message.includes('not available')) {
      return res.status(400).json({
        error: error.message
      });
    }

    if (error.message.includes('Invalid') || 
        error.message.includes('required') ||
        error.message.includes('exceed')) {
      return res.status(400).json({
        error: error.message
      });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    res.status(500).json({
      error: 'Failed to submit rating. Please try again.'
    });
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
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // Get user email from JWT token only
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({
        error: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail.trim())) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Parse itemId
    const itemIdNum = parseInt(itemId, 10);
    if (isNaN(itemIdNum)) {
      return res.status(400).json({
        error: 'Invalid item ID'
      });
    }

    // Get rating
    const rating = await ratingService.getRating(eventId, itemIdNum, userEmail);

    if (!rating) {
      return res.status(404).json({
        error: 'Rating not found'
      });
    }

    res.json(rating);
  } catch (error) {
    loggerService.error(`Error getting rating: ${error.message}`, error).catch(() => {});

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    res.status(500).json({
      error: 'Failed to retrieve rating'
    });
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
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // Get user email from JWT token only
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({
        error: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail.trim())) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Parse itemId
    const itemIdNum = parseInt(itemId, 10);
    if (isNaN(itemIdNum)) {
      return res.status(400).json({
        error: 'Invalid item ID'
      });
    }

    // Delete rating
    const deleted = await ratingService.deleteRating(eventId, itemIdNum, userEmail);

    if (!deleted) {
      return res.status(404).json({
        error: 'Rating not found'
      });
    }

    res.status(200).json({ message: 'Rating deleted successfully' });
  } catch (error) {
    loggerService.error(`Error deleting rating: ${error.message}`, error).catch(() => {});

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    if (error.message.includes('not in started state')) {
      return res.status(400).json({
        error: error.message
      });
    }

    if (error.message.includes('Invalid') || error.message.includes('required')) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to delete rating. Please try again.'
    });
  }
});

export default router;
