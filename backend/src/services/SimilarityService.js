import ratingService from './RatingService.js';
import dataRepository from '../data/DynamoDBRepository.js';
import eventService from './EventService.js';
import { calculateMeanAbsoluteError, maeToSimilarityScore } from '../utils/meanAbsoluteError.js';
import { detectPersonality } from './PersonalityService.js';
import loggerService from '../logging/Logger.js';
import { normalizeEmail as normalizeEmailUtil } from '../utils/emailUtils.js';

/**
 * SimilarityService
 * Calculates similarity between users based on rating patterns using Mean Absolute Error (MAE)
 * Uses DynamoDB with TTL for caching computed similarity data
 */
class SimilarityService {
  /**
   * Find similar users for the current user
   * @param {string} eventId - Event identifier
   * @param {string} currentUserEmail - Current user's email address
   * @returns {Promise<Array<object>>} Array of similar user objects with similarity scores
   */
  async findSimilarUsers(eventId, currentUserEmail) {
    const startTime = performance.now();
    
    // Check cache first
    try {
      const cached = await dataRepository.getSimilarUsersCache(eventId, currentUserEmail);
      if (cached && cached.similarUsers) {
        const cacheTime = performance.now() - startTime;
        loggerService.debug(`Similar users cache hit for event ${eventId}, user ${currentUserEmail} (${cacheTime.toFixed(2)}ms)`).catch(() => {});
        return cached.similarUsers;
      }
    } catch (error) {
      // Cache miss or error, continue to compute
      loggerService.debug(`Similar users cache miss for event ${eventId}: ${error.message}`);
    }

    try {
      // Get event to access maxRating for MAE to similarity conversion
      const event = await eventService.getEvent(eventId);
      const maxRating = event.ratingConfiguration?.maxRating || 4;

      // Get all ratings for the event
      const allRatings = await ratingService.getRatings(eventId);

      // Get current user's ratings
      const currentUserRatings = this.getUserRatings(allRatings, currentUserEmail);

      // Check if current user has at least 3 ratings
      if (currentUserRatings.length < 3) {
        return [];
      }

      // Get all other users' ratings grouped by email
      const otherUsersRatings = this.groupRatingsByUser(allRatings, currentUserEmail);

      // Calculate similarity for each other user
      const similarUsers = [];
      for (const [email, ratings] of otherUsersRatings.entries()) {
        // Find common items
        const commonItems = this.getCommonItems(currentUserRatings, ratings);

        // Need at least 3 common items
        if (commonItems.length < 3) {
          continue;
        }

        // Calculate Mean Absolute Error (MAE)
        const mae = calculateMeanAbsoluteError(
          currentUserRatings,
          ratings
        );

        // Exclude users with null MAE (invalid calculation)
        if (mae === null) {
          loggerService.debug(`MAE calculation failed for event ${eventId}, users ${currentUserEmail} and ${email}: invalid data`).catch(() => {});
          continue;
        }

        // Convert MAE to similarity score (0 to 1, where 1 = perfect match)
        // Includes confidence weighting based on number of common items
        // MAE of 0 (perfect match) → similarity of 1
        // MAE of maxRating (worst match) → similarity of 0
        // More common items = higher confidence = slight boost to similarity score
        const similarityScore = maeToSimilarityScore(mae, maxRating, commonItems.length);

        // Build common items array for response
        const commonItemsForResponse = commonItems.map(item => ({
          itemId: item.itemId,
          userRating: item.user1Rating,
          similarUserRating: item.user2Rating
        }));

        // Count perfect matches (exact rating match) and close matches (within 1 point)
        const perfectMatches = commonItems.filter(item => item.user1Rating === item.user2Rating).length;
        const closeMatches = commonItems.filter(item => {
          const diff = Math.abs(item.user1Rating - item.user2Rating);
          return diff === 1; // Exactly 1 point difference
        }).length;

        // Compute personality for wine events
        let personality = null;
        if (event.typeOfItem === 'wine') {
          const normalizedEmail = this.normalizeEmail(email);
          const rawUserRatings = allRatings.filter(
            r => this.normalizeEmail(r.email) === normalizedEmail
          );
          personality = this._derivePersonality(rawUserRatings, event);
        }

        similarUsers.push({
          email,
          name: null, // Will be populated from event config if available
          similarityScore,
          mae,
          commonItemsCount: commonItems.length,
          perfectMatches,
          closeMatches,
          commonItems: commonItemsForResponse,
          personality,
        });
      }

      // Sort by similarity score (descending), then by perfect matches (descending),
      // then by close matches (descending), then by common items count (descending), then alphabetically
      similarUsers.sort((a, b) => {
        if (a.similarityScore !== b.similarityScore) {
          return b.similarityScore - a.similarityScore; // Descending
        }
        // Tiebreaker: prioritize perfect matches
        if (a.perfectMatches !== b.perfectMatches) {
          return b.perfectMatches - a.perfectMatches; // Descending
        }
        // Tiebreaker: prioritize close matches
        if (a.closeMatches !== b.closeMatches) {
          return b.closeMatches - a.closeMatches; // Descending
        }
        if (a.commonItemsCount !== b.commonItemsCount) {
          return b.commonItemsCount - a.commonItemsCount; // Descending
        }
        return a.email.localeCompare(b.email); // Alphabetical
      });

      // Cache for 30 seconds
      try {
        await dataRepository.setSimilarUsersCache(eventId, currentUserEmail, { similarUsers }, 30);
      } catch (cacheError) {
        // Cache write failed, but we have the data - just log and continue
        loggerService.warn(`Failed to cache similar users for event ${eventId}: ${cacheError.message}`);
      }

      // Performance monitoring
      const calculationTime = performance.now() - startTime;
      loggerService.info(`Similar users calculation completed for event ${eventId}, user ${currentUserEmail}: ${similarUsers.length} users found in ${calculationTime.toFixed(2)}ms`).catch(() => {});
      
      // Log warning if calculation takes too long (exceeds 2s target per SC-001)
      if (calculationTime > 2000) {
        loggerService.warn(`Similar users calculation exceeded 2s target: ${calculationTime.toFixed(2)}ms for event ${eventId}, user ${currentUserEmail}`).catch(() => {});
      }

      return similarUsers;
    } catch (error) {
      loggerService.error(`Error finding similar users for event ${eventId}, user ${currentUserEmail}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get ratings for a specific user
   * @param {Array<object>} allRatings - All ratings for the event
   * @param {string} email - User email
   * @returns {Array<{itemId: number, rating: number}>} User's ratings
   */
  getUserRatings(allRatings, email) {
    const normalizedEmail = this.normalizeEmail(email);
    return allRatings
      .filter(rating => this.normalizeEmail(rating.email) === normalizedEmail)
      .map(rating => ({
        itemId: parseInt(rating.itemId, 10),
        rating: parseInt(rating.rating, 10)
      }));
  }

  /**
   * Group ratings by user email, excluding the current user
   * @param {Array<object>} allRatings - All ratings for the event
   * @param {string} currentUserEmail - Current user's email to exclude
   * @returns {Map<string, Array<{itemId: number, rating: number}>>} Map of email to ratings
   */
  groupRatingsByUser(allRatings, currentUserEmail) {
    const normalizedCurrentEmail = this.normalizeEmail(currentUserEmail);
    const userRatingsMap = new Map();

    allRatings.forEach(rating => {
      const normalizedEmail = this.normalizeEmail(rating.email);
      if (normalizedEmail !== normalizedCurrentEmail) {
        if (!userRatingsMap.has(normalizedEmail)) {
          userRatingsMap.set(normalizedEmail, []);
        }
        userRatingsMap.get(normalizedEmail).push({
          itemId: parseInt(rating.itemId, 10),
          rating: parseInt(rating.rating, 10)
        });
      }
    });

    return userRatingsMap;
  }

  /**
   * Get common items between two users' ratings
   * @param {Array<{itemId: number, rating: number}>} user1Ratings - First user's ratings
   * @param {Array<{itemId: number, rating: number}>} user2Ratings - Second user's ratings
   * @returns {Array<{itemId: number, user1Rating: number, user2Rating: number}>} Common items with both ratings
   */
  getCommonItems(user1Ratings, user2Ratings) {
    // Create maps for quick lookup
    const user1Map = new Map();
    user1Ratings.forEach(rating => {
      user1Map.set(rating.itemId, rating.rating);
    });

    const user2Map = new Map();
    user2Ratings.forEach(rating => {
      user2Map.set(rating.itemId, rating.rating);
    });

    // Find common itemIds
    const commonItems = [];
    user1Map.forEach((rating, itemId) => {
      if (user2Map.has(itemId)) {
        commonItems.push({
          itemId,
          user1Rating: rating,
          user2Rating: user2Map.get(itemId)
        });
      }
    });

    return commonItems;
  }

  /**
   * Derive personality detection input from raw rating records and call detectPersonality.
   * @param {Array<object>} rawRatings - Raw rating objects for a single user
   * @param {object} event - Event object with itemConfiguration and ratingConfiguration
   * @returns {string|null} Personality type ID or null
   */
  _derivePersonality(rawRatings, event) {
    if (!rawRatings || rawRatings.length === 0) return null;

    const maxRating = event.ratingConfiguration?.maxRating || 4;
    const itemConfig = event.itemConfiguration || {};
    const totalItems = (itemConfig.numberOfItems || 0) - (itemConfig.excludedItemIds || []).length;

    const ratingValues = [];
    const distribution = {};
    for (let v = 1; v <= maxRating; v++) distribution[v] = 0;

    let noteCount = 0;
    const noteLengths = [];
    const timestamps = [];

    const sortedRatings = [...rawRatings].sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return at - bt;
    });

    for (const r of sortedRatings) {
      const val = parseInt(r.rating, 10);
      if (isNaN(val)) continue;
      ratingValues.push(val);
      distribution[val] = (distribution[val] || 0) + 1;
      if (r.note && r.note.trim()) {
        noteCount++;
        noteLengths.push(r.note.trim().length);
      }
      if (r.timestamp) timestamps.push(r.timestamp);
    }

    if (ratingValues.length === 0) return null;

    const avg = ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length;

    return detectPersonality({
      ratings: ratingValues,
      ratingDistribution: distribution,
      averageRating: avg,
      totalRatings: ratingValues.length,
      totalItems,
      maxRating,
      noteCount,
      noteLengths,
      earliestTimestamp: timestamps[0] || null,
      latestTimestamp: timestamps[timestamps.length - 1] || null,
    });
  }

  /**
   * Normalize email address (lowercase, trim)
   * Delegates to centralized emailUtils for consistency
   * @param {string} email - Email address
   * @returns {string} Normalized email
   */
  normalizeEmail(email) {
    return normalizeEmailUtil(email);
  }
}

export default new SimilarityService();
