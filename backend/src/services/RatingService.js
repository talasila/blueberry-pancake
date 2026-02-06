import eventService from './EventService.js';
import dataRepository from '../data/DynamoDBRepository.js';
import loggerService from '../logging/Logger.js';
import { normalizeEmail, isValidEmail } from '../utils/emailUtils.js';

/**
 * RatingService
 * Handles rating business logic with direct DynamoDB atomic writes
 * No caching layer - each rating is immediately persisted to DynamoDB
 * DynamoDB provides atomic operations so no application-level locking needed
 */
class RatingService {
  /**
   * Get all ratings for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<Array<object>>} Array of rating objects
   */
  async getRatings(eventId) {
    try {
      return await dataRepository.getRatings(eventId);
    } catch (error) {
      loggerService.error(`Error reading ratings for event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a specific user's rating for an item
   * @param {string} eventId - Event identifier
   * @param {number} itemId - Item identifier
   * @param {string} email - User email
   * @returns {Promise<object|null>} Rating object or null if not found
   */
  async getRating(eventId, itemId, email) {
    try {
      return await dataRepository.getRating(eventId, email, itemId);
    } catch (error) {
      loggerService.error(`Error getting rating for event ${eventId}, item ${itemId}, email ${email}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Submit a rating (create new or update existing)
   * Implements replace-on-update: if user has existing rating for item, replaces it
   * DynamoDB PutItem with the same key atomically replaces the item
   * @param {string} eventId - Event identifier
   * @param {number} itemId - Item identifier
   * @param {number} rating - Rating value (1 to maxRating)
   * @param {string} note - Optional note (max 500 characters)
   * @param {string} email - User email
   * @returns {Promise<object>} Saved rating object
   */
  async submitRating(eventId, itemId, rating, note, email) {
    // Validate event state (must be "started")
    const event = await eventService.getEvent(eventId);
    if (event.state !== 'started') {
      throw new Error(`Event is not in started state. Rating is not available. Current state: ${event.state}`);
    }

    // Validate inputs
    await this.validateRatingInputAsync(eventId, itemId, rating, note, email, event);

    const normalizedUserEmail = normalizeEmail(email);

    // Create new rating object
    const newRating = {
      email: normalizedUserEmail,
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), // ISO 8601 format
      itemId: parseInt(itemId, 10),
      rating: parseInt(rating, 10),
      note: (note || '').trim()
    };

    try {
      // Check if rating exists - if so, update; otherwise add
      const existingRating = await dataRepository.getRating(eventId, normalizedUserEmail, itemId);
      
      if (existingRating) {
        // Update existing rating
        await dataRepository.updateRating(eventId, normalizedUserEmail, itemId, {
          rating: newRating.rating,
          note: newRating.note
        });
      } else {
        // Add new rating
        await dataRepository.addRating(eventId, newRating);
      }

      loggerService.info(`Rating submitted for event ${eventId}, item ${itemId}, email ${normalizedUserEmail}`);
      return newRating;
    } catch (error) {
      loggerService.error(`Error submitting rating for event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Validate rating input (async version that fetches configs)
   * @param {string} eventId - Event identifier
   * @param {number} itemId - Item identifier
   * @param {number} rating - Rating value
   * @param {string} note - Note text
   * @param {string} email - User email
   * @param {object} event - Event object
   * @throws {Error} If validation fails
   */
  async validateRatingInputAsync(eventId, itemId, rating, note, email, event) {
    // Validate email using shared utility
    if (!isValidEmail(email)) {
      throw new Error('Valid email is required');
    }

    // Validate itemId
    const itemConfig = await eventService.getItemConfiguration(eventId);
    if (!Number.isInteger(itemId) || itemId < 1 || itemId > itemConfig.numberOfItems) {
      throw new Error(`Invalid item ID. Must be between 1 and ${itemConfig.numberOfItems}`);
    }

    if (itemConfig.excludedItemIds.includes(itemId)) {
      throw new Error(`Item ${itemId} is excluded from this event`);
    }

    // Validate rating
    const ratingConfig = await eventService.getRatingConfiguration(eventId);
    if (!Number.isInteger(rating) || rating < 1 || rating > ratingConfig.maxRating) {
      throw new Error(`Rating must be between 1 and ${ratingConfig.maxRating}`);
    }

    // Validate note length
    if (note && note.length > 500) {
      throw new Error('Note must not exceed 500 characters');
    }
  }

  /**
   * Delete a rating (remove existing rating)
   * @param {string} eventId - Event identifier
   * @param {number} itemId - Item identifier
   * @param {string} email - User email
   * @returns {Promise<boolean>} True if rating was deleted, false if not found
   */
  async deleteRating(eventId, itemId, email) {
    // Validate event state (must be "started")
    const event = await eventService.getEvent(eventId);
    if (event.state !== 'started') {
      throw new Error(`Event is not in started state. Rating deletion is not available. Current state: ${event.state}`);
    }

    // Validate email using shared utility
    if (!isValidEmail(email)) {
      throw new Error('Valid email is required');
    }

    // Validate itemId
    const itemConfig = await eventService.getItemConfiguration(eventId);
    if (!Number.isInteger(itemId) || itemId < 1 || itemId > itemConfig.numberOfItems) {
      throw new Error(`Invalid item ID. Must be between 1 and ${itemConfig.numberOfItems}`);
    }

    const normalizedUserEmail = normalizeEmail(email);

    try {
      // Check if rating exists
      const existingRating = await dataRepository.getRating(eventId, normalizedUserEmail, itemId);
      
      if (!existingRating) {
        return false;
      }

      // Delete the rating
      await dataRepository.deleteRating(eventId, normalizedUserEmail, itemId);
      loggerService.info(`Rating deleted for event ${eventId}, item ${itemId}, email ${normalizedUserEmail}`);
      return true;
    } catch (error) {
      loggerService.error(`Error deleting rating for event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Delete all ratings for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<void>}
   */
  async deleteAllRatings(eventId) {
    try {
      await dataRepository.deleteAllRatings(eventId);
      loggerService.info(`All ratings deleted for event ${eventId}`);
    } catch (error) {
      loggerService.error(`Error deleting all ratings for event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Invalidate all caches related to ratings for an event
   * With DynamoDB, we don't need in-memory cache invalidation
   * This method is kept for API compatibility but is now a no-op
   * @param {string} eventId - Event identifier
   */
  invalidateCache(eventId) {
    // No-op: DynamoDB provides immediate consistency
    loggerService.debug(`Rating cache invalidation called for event ${eventId} (no-op with DynamoDB)`);
  }
}

export default new RatingService();
