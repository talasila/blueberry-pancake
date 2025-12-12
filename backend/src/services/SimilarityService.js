import ratingService from './RatingService.js';
import cacheService from '../cache/CacheService.js';
import eventService from './EventService.js';
import { calculateMeanAbsoluteError, maeToSimilarityScore } from '../utils/meanAbsoluteError.js';
import loggerService from '../logging/Logger.js';

/**
 * SimilarityService
 * Calculates similarity between users based on rating patterns using Mean Absolute Error (MAE)
 */
class SimilarityService {
  /**
   * Find similar users for the current user
   * @param {string} eventId - Event identifier
   * @param {string} currentUserEmail - Current user's email address
   * @param {number} limit - Maximum number of similar users to return (default: 5)
   * @returns {Promise<Array<object>>} Array of similar user objects with similarity scores
   */
  async findSimilarUsers(eventId, currentUserEmail, limit = 5) {
    const startTime = performance.now();
    
    // Check cache first
    const cacheKey = `similarUsers:${eventId}:${currentUserEmail}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      const cacheTime = performance.now() - startTime;
      loggerService.debug(`Similar users cache hit for event ${eventId}, user ${currentUserEmail} (${cacheTime.toFixed(2)}ms)`).catch(() => {});
      return cached;
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
        // MAE of 0 (perfect match) → similarity of 1
        // MAE of maxRating (worst match) → similarity of 0
        const similarityScore = maeToSimilarityScore(mae, maxRating);

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

        similarUsers.push({
          email,
          name: null, // Will be populated from event config if available
          similarityScore,
          mae, // Mean Absolute Error (for display purposes)
          commonItemsCount: commonItems.length,
          perfectMatches,
          closeMatches,
          commonItems: commonItemsForResponse
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

      // Limit to top N users (if limit is specified and not Infinity)
      const result = limit === Infinity || limit === undefined 
        ? similarUsers 
        : similarUsers.slice(0, limit);

      // Cache for 30 seconds
      cacheService.set(cacheKey, result, 30);

      // Performance monitoring
      const calculationTime = performance.now() - startTime;
      loggerService.info(`Similar users calculation completed for event ${eventId}, user ${currentUserEmail}: ${result.length} users found in ${calculationTime.toFixed(2)}ms`).catch(() => {});
      
      // Log warning if calculation takes too long (exceeds 2s target per SC-001)
      if (calculationTime > 2000) {
        loggerService.warn(`Similar users calculation exceeded 2s target: ${calculationTime.toFixed(2)}ms for event ${eventId}, user ${currentUserEmail}`).catch(() => {});
      }

      return result;
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
   * Normalize email address (lowercase, trim)
   * @param {string} email - Email address
   * @returns {string} Normalized email
   */
  normalizeEmail(email) {
    if (!email || typeof email !== 'string') {
      return '';
    }
    return email.trim().toLowerCase();
  }
}

export default new SimilarityService();
