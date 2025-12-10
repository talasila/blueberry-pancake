import dataRepository from '../data/FileDataRepository.js';
import eventService from './EventService.js';
import { parseCSV, toCSV } from '../utils/csvParser.js';
import cacheService from '../cache/CacheService.js';
import loggerService from '../logging/Logger.js';

/**
 * RatingService
 * Handles rating business logic, CSV operations, and validation
 */
class RatingService {
  constructor() {
    // Periodic cache refresh interval (30 seconds)
    this.cacheRefreshInterval = null;
    this.refreshIntervals = new Set(); // Track intervals per event
  }

  /**
   * Initialize periodic cache refresh for an event (T077)
   * @param {string} eventId - Event identifier
   */
  startCacheRefresh(eventId) {
    // Clear existing interval for this event if any
    if (this.refreshIntervals.has(eventId)) {
      this.stopCacheRefresh(eventId);
    }

    // Store interval ID for proper cleanup
    const intervalId = setInterval(() => {
      // Invalidate ratings cache for this event
      cacheService.del(`ratings:${eventId}`);
      loggerService.debug(`Periodic cache refresh for event ${eventId}`).catch(() => {});
    }, 30000); // 30 seconds

    // Store interval ID mapped to eventId for proper cleanup
    if (!this.eventIntervals) {
      this.eventIntervals = new Map();
    }
    this.eventIntervals.set(eventId, intervalId);
    this.refreshIntervals.add(eventId);
  }

  /**
   * Stop periodic cache refresh for an event
   * @param {string} eventId - Event identifier
   */
  stopCacheRefresh(eventId) {
    if (this.eventIntervals && this.eventIntervals.has(eventId)) {
      clearInterval(this.eventIntervals.get(eventId));
      this.eventIntervals.delete(eventId);
    }
    this.refreshIntervals.delete(eventId);
  }

  /**
   * Get all ratings for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<Array<object>>} Array of rating objects
   */
  async getRatings(eventId) {
    try {
      const csvData = await dataRepository.readEventRatings(eventId);
      const ratings = parseCSV(csvData);
      
      // Start periodic refresh if not already started
      this.startCacheRefresh(eventId);
      
      return ratings;
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
      const normalizedEmail = this.normalizeEmail(email);
      
      const rating = ratings.find(
        r => r.itemId === itemId && this.normalizeEmail(r.email) === normalizedEmail
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

    // Validate inputs (async validation)
    await this.validateRatingInputAsync(eventId, itemId, rating, note, email, event);

    // Get all ratings
    const ratings = await this.getRatings(eventId);
    const normalizedEmail = this.normalizeEmail(email);

    // Find existing rating for this user/item combination
    const existingIndex = ratings.findIndex(
      r => r.itemId === itemId && this.normalizeEmail(r.email) === normalizedEmail
    );

    // Create new rating object
    const newRating = {
      email: normalizedEmail,
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

    // Write back entire CSV file
    const csvContent = toCSV(ratings);
    await dataRepository.writeEventRatings(eventId, csvContent);

    // Invalidate cache
    cacheService.del(`ratings:${eventId}`);

    loggerService.info(`Rating submitted for event ${eventId}, item ${itemId}, email ${normalizedEmail}`);

    return newRating;
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
    // Validate email
    if (!email || typeof email !== 'string' || !this.isValidEmail(email)) {
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
   * Normalize email address
   * @param {string} email - Email address
   * @returns {string} Normalized email
   */
  normalizeEmail(email) {
    if (!email || typeof email !== 'string') {
      return '';
    }
    return email.trim().toLowerCase();
  }

  /**
   * Validate email format
   * @param {string} email - Email address
   * @returns {boolean} True if valid
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Invalidate cache for an event (called on event state change)
   * @param {string} eventId - Event identifier
   */
  invalidateCache(eventId) {
    cacheService.del(`ratings:${eventId}`);
  }
}

export default new RatingService();
