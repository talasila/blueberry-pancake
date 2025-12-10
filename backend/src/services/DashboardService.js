import eventService from './EventService.js';
import ratingService from './RatingService.js';
import cacheService from '../cache/CacheService.js';
import { calculateWeightedAverage } from '../utils/bayesianAverage.js';
import loggerService from '../logging/Logger.js';

/**
 * DashboardService
 * Aggregates event statistics and item rating summaries for dashboard display
 */
class DashboardService {
  /**
   * Get dashboard data (statistics and item summaries)
   * Uses caching to reduce file I/O
   * @param {string} eventId - Event identifier
   * @returns {Promise<object>} Dashboard data with statistics, itemSummaries, and globalAverage
   */
  async getDashboardData(eventId) {
    // Check cache first
    const cacheKey = `dashboard:${eventId}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get event configuration
      const event = await eventService.getEvent(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Get ratings
      const ratings = await ratingService.getRatings(eventId);

      // Calculate statistics
      const statistics = this.calculateStatistics(event, ratings);

      // Calculate global average
      const globalAverage = this.calculateGlobalAverage(ratings);

      // Calculate item summaries
      const itemSummaries = this.calculateItemSummaries(
        event,
        ratings,
        globalAverage,
        statistics.totalUsers
      );

      // Get rating configuration for colors
      const ratingConfig = event.ratingConfiguration || {};

      // Build response
      const dashboardData = {
        statistics,
        itemSummaries,
        globalAverage: globalAverage !== null && globalAverage !== undefined ? globalAverage : null,
        ratingConfiguration: ratingConfig
      };

      // Cache for 30 seconds
      cacheService.set(cacheKey, dashboardData, 30);

      return dashboardData;
    } catch (error) {
      loggerService.error(`Error getting dashboard data for event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Calculate dashboard statistics
   * @param {object} event - Event configuration
   * @param {Array} ratings - Array of rating objects
   * @returns {object} Statistics object with totalUsers, totalItems, totalRatings, averageRatingsPerItem
   */
  calculateStatistics(event, ratings) {
    // Total users: count of users in event.users object
    const totalUsers = event.users ? Object.keys(event.users).length : 0;

    // Total items: numberOfItems - excludedItemIds.length
    const itemConfig = event.itemConfiguration || {};
    const numberOfItems = itemConfig.numberOfItems || 0;
    const excludedItemIds = itemConfig.excludedItemIds || [];
    const totalItems = numberOfItems - excludedItemIds.length;

    // Total ratings: count of all rating submissions
    const totalRatings = ratings.length;

    // Average ratings per item: totalRatings / totalItems
    // Handle edge case: totalItems = 0
    let averageRatingsPerItem = 0;
    if (totalItems > 0) {
      averageRatingsPerItem = totalRatings / totalItems;
    }

    return {
      totalUsers,
      totalItems,
      totalRatings,
      averageRatingsPerItem: parseFloat(averageRatingsPerItem.toFixed(2))
    };
  }

  /**
   * Calculate global average rating across all items
   * @param {Array} ratings - Array of rating objects
   * @returns {number|null} Global average or null if no ratings exist
   */
  calculateGlobalAverage(ratings) {
    if (!ratings || ratings.length === 0) {
      return null;
    }

    const sum = ratings.reduce((acc, rating) => {
      const ratingValue = parseInt(rating.rating, 10);
      return acc + (isNaN(ratingValue) ? 0 : ratingValue);
    }, 0);

    const average = sum / ratings.length;
    return isNaN(average) ? null : average;
  }

  /**
   * Calculate item rating summaries
   * @param {object} event - Event configuration
   * @param {Array} ratings - Array of rating objects
   * @param {number|null} globalAverage - Global average rating
   * @param {number} totalUsers - Total number of users
   * @returns {Array} Array of item rating summary objects
   */
  calculateItemSummaries(event, ratings, globalAverage, totalUsers) {
    const itemConfig = event.itemConfiguration || {};
    const numberOfItems = itemConfig.numberOfItems || 0;
    const excludedItemIds = itemConfig.excludedItemIds || [];
    const summaries = [];

    // Process each item from 1 to numberOfItems
    for (let itemId = 1; itemId <= numberOfItems; itemId++) {
      // Skip excluded items
      if (excludedItemIds.includes(itemId)) {
        continue;
      }

      // Filter ratings for this item
      const itemRatings = ratings.filter(r => parseInt(r.itemId, 10) === itemId);

      // Count unique raters (by email)
      const uniqueRaters = new Set();
      itemRatings.forEach(rating => {
        if (rating.email) {
          uniqueRaters.add(rating.email.toLowerCase().trim());
        }
      });
      const numberOfRaters = uniqueRaters.size;

      // Calculate average rating
      let averageRating = null;
      if (itemRatings.length > 0) {
        const sum = itemRatings.reduce((acc, rating) => {
          const ratingValue = parseInt(rating.rating, 10);
          return acc + (isNaN(ratingValue) ? 0 : ratingValue);
        }, 0);
        averageRating = sum / itemRatings.length;
        averageRating = isNaN(averageRating) ? null : parseFloat(averageRating.toFixed(2));
      }

      // Calculate sum of ratings for Bayesian formula
      const sumOfRatings = itemRatings.reduce((acc, rating) => {
        const ratingValue = parseInt(rating.rating, 10);
        return acc + (isNaN(ratingValue) ? 0 : ratingValue);
      }, 0);

      // Calculate weighted average using Bayesian formula
      const weightedAverage = calculateWeightedAverage(
        globalAverage,
        totalUsers,
        numberOfRaters,
        sumOfRatings
      );
      const weightedAverageFormatted = weightedAverage !== null 
        ? parseFloat(weightedAverage.toFixed(2)) 
        : null;

      // Calculate rating progression (percentage of users who rated this item)
      let ratingProgression = 0;
      if (totalUsers > 0) {
        ratingProgression = (numberOfRaters / totalUsers) * 100;
        ratingProgression = parseFloat(ratingProgression.toFixed(2));
      }

      // Calculate rating distribution (count of each rating value)
      const ratingDistribution = {};
      const maxRating = event.ratingConfiguration?.maxRating || 4;
      for (let ratingValue = 1; ratingValue <= maxRating; ratingValue++) {
        ratingDistribution[ratingValue] = itemRatings.filter(
          r => parseInt(r.rating, 10) === ratingValue
        ).length;
      }

      summaries.push({
        itemId,
        numberOfRaters,
        averageRating,
        weightedAverage: weightedAverageFormatted,
        ratingProgression,
        ratingDistribution
      });
    }

    return summaries;
  }
}

export default new DashboardService();
