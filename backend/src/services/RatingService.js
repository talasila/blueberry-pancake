import eventService from './EventService.js';
import cacheService from '../cache/CacheService.js';
import { getRatingsKey } from '../cache/cacheKeys.js';
import loggerService from '../logging/Logger.js';
import { normalizeEmail, isValidEmail } from '../utils/emailUtils.js';

/**
 * RatingService
 * Handles rating business logic with write-back caching
 * All reads from cache, writes marked dirty for periodic flush
 * 
 * Uses per-event mutex locks to prevent race conditions during concurrent
 * rating submissions. Without locking, concurrent read-modify-write operations
 * can cause lost updates (last write wins, losing other users' ratings).
 */
class RatingService {
  constructor() {
    // Per-event locks to serialize write operations
    // Map<eventId, Promise> - each event has its own lock
    this.eventLocks = new Map();
  }

  /**
   * Acquire a lock for an event (mutex pattern using promises)
   * Ensures only one rating write operation per event at a time
   * @param {string} eventId - Event identifier
   * @returns {Promise<Function>} Release function to call when done
   */
  async acquireLock(eventId) {
    // Wait for any existing lock to be released
    while (this.eventLocks.has(eventId)) {
      await this.eventLocks.get(eventId);
    }

    // Create a new lock (a promise that resolves when released)
    let releaseLock;
    const lockPromise = new Promise(resolve => {
      releaseLock = resolve;
    });
    this.eventLocks.set(eventId, lockPromise);

    // Return the release function
    return () => {
      this.eventLocks.delete(eventId);
      releaseLock();
    };
  }

  /**
   * Get all ratings for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<Array<object>>} Array of rating objects
   */
  async getRatings(eventId) {
    try {
      // Ensure ratings are loaded in cache
      await cacheService.ensureRatingsLoaded(eventId);
      
      const ratingsKey = getRatingsKey(eventId);
      const ratings = cacheService.get(ratingsKey);
      
      return ratings || [];
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
      const ratings = await this.getRatings(eventId);
      const normalizedUserEmail = normalizeEmail(email);
      
      const rating = ratings.find(
        r => r.itemId === itemId && normalizeEmail(r.email) === normalizedUserEmail
      );
      
      return rating || null;
    } catch (error) {
      loggerService.error(`Error getting rating for event ${eventId}, item ${itemId}, email ${email}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Submit a rating (create new or update existing)
   * Implements replace-on-update: if user has existing rating for item, replaces it
   * Uses per-event locking to prevent race conditions during concurrent submissions
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

    // Validate inputs (async validation) - done outside lock for performance
    await this.validateRatingInputAsync(eventId, itemId, rating, note, email, event);

    // Acquire lock for this event to prevent race conditions
    // This serializes read-modify-write operations per event
    const releaseLock = await this.acquireLock(eventId);
    
    try {
      // Get all ratings from cache (inside lock to ensure consistent read)
      const ratings = await this.getRatings(eventId);
      const normalizedUserEmail = normalizeEmail(email);

      // Find existing rating for this user/item combination
      const existingIndex = ratings.findIndex(
        r => r.itemId === itemId && normalizeEmail(r.email) === normalizedUserEmail
      );

      // Create new rating object
      const newRating = {
        email: normalizedUserEmail,
        timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), // ISO 8601 format
        itemId: parseInt(itemId, 10),
        rating: parseInt(rating, 10),
        note: (note || '').trim()
      };

      // Replace existing or append new
      if (existingIndex >= 0) {
        ratings[existingIndex] = newRating;
      } else {
        ratings.push(newRating);
      }

      // Update cache and mark as dirty (write-back)
      const ratingsKey = getRatingsKey(eventId);
      cacheService.setDirty(ratingsKey, ratings, 'ratings', eventId);

      // Invalidate computed caches (dashboard, similar users)
      cacheService.del(`dashboard:${eventId}`);
      cacheService.invalidate(`similarUsers:${eventId}:*`);

      loggerService.info(`Rating submitted for event ${eventId}, item ${itemId}, email ${normalizedUserEmail}`);

      return newRating;
    } finally {
      // Always release the lock
      releaseLock();
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
   * Uses per-event locking to prevent race conditions
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

    // Acquire lock for this event to prevent race conditions
    const releaseLock = await this.acquireLock(eventId);
    
    try {
      // Get all ratings from cache (inside lock)
      const ratings = await this.getRatings(eventId);
      const normalizedUserEmail = normalizeEmail(email);

      // Find existing rating for this user/item combination
      const existingIndex = ratings.findIndex(
        r => r.itemId === itemId && normalizeEmail(r.email) === normalizedUserEmail
      );

      if (existingIndex < 0) {
        // Rating not found
        return false;
      }

      // Remove the rating
      ratings.splice(existingIndex, 1);

      // Update cache and mark as dirty (write-back)
      const ratingsKey = getRatingsKey(eventId);
      cacheService.setDirty(ratingsKey, ratings, 'ratings', eventId);

      // Invalidate computed caches
      cacheService.del(`dashboard:${eventId}`);
      cacheService.invalidate(`similarUsers:${eventId}:*`);

      loggerService.info(`Rating deleted for event ${eventId}, item ${itemId}, email ${normalizedUserEmail}`);

      return true;
    } finally {
      // Always release the lock
      releaseLock();
    }
  }

  /**
   * Delete all ratings for an event
   * Clears ratings in cache and marks for flush
   * @param {string} eventId - Event identifier
   * @returns {Promise<void>}
   */
  async deleteAllRatings(eventId) {
    // Clear ratings to empty array
    const ratingsKey = getRatingsKey(eventId);
    cacheService.setDirty(ratingsKey, [], 'ratings', eventId);
    
    // Invalidate dashboard cache (depends on ratings)
    cacheService.del(`dashboard:${eventId}`);
    
    loggerService.info(`All ratings deleted for event ${eventId}`);
  }

  /**
   * Invalidate all caches related to ratings for an event
   * Called when event state changes to ensure fresh data
   * @param {string} eventId - Event identifier
   */
  invalidateCache(eventId) {
    // Invalidate dashboard cache (depends on ratings)
    cacheService.del(`dashboard:${eventId}`);
    
    // Invalidate similar users cache
    cacheService.invalidate(`similarUsers:${eventId}:*`);
    
    loggerService.debug(`Rating caches invalidated for event ${eventId}`);
  }
}

export default new RatingService();
