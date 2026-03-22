import eventService from './EventService.js';
import ratingService from './RatingService.js';
import dataRepository from '../data/DynamoDBRepository.js';
import { calculateWeightedAverage } from '../utils/bayesianAverage.js';
import { detectPersonality } from './PersonalityService.js';
import loggerService from '../logging/Logger.js';
import { normalizeEmail } from '../utils/emailUtils.js';
import { generateUserId } from '../utils/userIdUtils.js';

/**
 * DashboardService
 * Aggregates event statistics and item rating summaries for dashboard display
 * Uses DynamoDB with TTL for caching computed dashboard data
 */
class DashboardService {
  /**
   * Get dashboard data (statistics and item summaries)
   * Uses DynamoDB TTL-based caching
   * @param {string} eventId - Event identifier
   * @returns {Promise<object>} Dashboard data with statistics, itemSummaries, and globalAverage
   */
  async getDashboardData(eventId) {
    // Check cache first
    try {
      const cached = await dataRepository.getDashboardCache(eventId);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Cache miss or error, continue to compute
      loggerService.debug(`Dashboard cache miss for event ${eventId}: ${error.message}`);
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

      // Calculate user summaries
      const userSummaries = await this.calculateUserSummaries(
        event,
        ratings,
        statistics.totalItems
      );

      // Get rating configuration for colors
      const ratingConfig = event.ratingConfiguration || {};

      // Find most and least controversial items (min 3 ratings required)
      const controversialItems = this.findControversialItems(itemSummaries);

      // Build response
      const dashboardData = {
        statistics,
        itemSummaries,
        userSummaries,
        globalAverage: globalAverage !== null && globalAverage !== undefined ? globalAverage : null,
        ratingConfiguration: ratingConfig,
        mostControversial: controversialItems.most,
        leastControversial: controversialItems.least
      };

      // Cache for 30 seconds
      try {
        await dataRepository.setDashboardCache(eventId, dashboardData, 30);
      } catch (cacheError) {
        // Cache write failed, but we have the data - just log and continue
        loggerService.warn(`Failed to cache dashboard data for event ${eventId}: ${cacheError.message}`);
      }

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
          uniqueRaters.add(normalizeEmail(rating.email));
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

      // Calculate standard deviation for controversy metric
      let standardDeviation = null;
      if (itemRatings.length > 0 && averageRating !== null) {
        const squaredDiffs = itemRatings.map(rating => {
          const ratingValue = parseInt(rating.rating, 10);
          if (isNaN(ratingValue)) return 0;
          return Math.pow(ratingValue - averageRating, 2);
        });
        const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / itemRatings.length;
        standardDeviation = Math.sqrt(variance);
        standardDeviation = parseFloat(standardDeviation.toFixed(2));
      }

      summaries.push({
        itemId,
        numberOfRaters,
        averageRating,
        weightedAverage: weightedAverageFormatted,
        ratingProgression,
        ratingDistribution,
        standardDeviation
      });
    }

    return summaries;
  }

  /**
   * Calculate user rating summaries
   * @param {object} event - Event configuration
   * @param {Array} ratings - Array of rating objects
   * @param {number} totalItems - Total number of items (excluding excluded items)
   * @returns {Array} Array of user rating summary objects
   */
  async calculateUserSummaries(event, ratings, totalItems) {
    const users = event.users || {};
    const summaries = [];
    let needsBackfillPersist = false;

    // Group ratings by user email
    const ratingsByUser = {};
    ratings.forEach(rating => {
      if (!rating.email) return;
      const email = normalizeEmail(rating.email);
      if (!ratingsByUser[email]) {
        ratingsByUser[email] = [];
      }
      ratingsByUser[email].push(rating);
    });

    // Process each user
    for (const email in users) {
      const userData = users[email];
      const userRatings = ratingsByUser[email] || [];

      // Get user name (may be null/undefined)
      const userName = userData?.name || null;

      // Count unique items rated
      const uniqueItemsRated = new Set();
      userRatings.forEach(rating => {
        const itemId = parseInt(rating.itemId, 10);
        if (!isNaN(itemId)) {
          uniqueItemsRated.add(itemId);
        }
      });
      const numberOfBottlesRated = uniqueItemsRated.size;

      // Calculate rating progression (percentage of items rated)
      let ratingProgression = 0;
      if (totalItems > 0) {
        ratingProgression = (numberOfBottlesRated / totalItems) * 100;
        ratingProgression = parseFloat(ratingProgression.toFixed(2));
      }

      // Calculate average rating across all bottles they've tasted
      let averageRating = null;
      if (userRatings.length > 0) {
        const sum = userRatings.reduce((acc, rating) => {
          const ratingValue = parseInt(rating.rating, 10);
          return acc + (isNaN(ratingValue) ? 0 : ratingValue);
        }, 0);
        averageRating = sum / userRatings.length;
        averageRating = isNaN(averageRating) ? null : parseFloat(averageRating.toFixed(2));
      }

      // Get all ratings in order (sorted by timestamp, oldest to newest for sparkline)
      const sortedUserRatings = [...userRatings]
        .sort((a, b) => {
          const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          if (isNaN(aTime)) return 1;
          if (isNaN(bTime)) return -1;
          return aTime - bTime;
        });

      const sortedRatings = sortedUserRatings
        .map(rating => {
          const ratingValue = parseInt(rating.rating, 10);
          return isNaN(ratingValue) ? null : ratingValue;
        })
        .filter(rating => rating !== null);

      // Calculate rating distribution for user's ratings
      const ratingDistribution = {};
      const maxRating = event.ratingConfiguration?.maxRating || 4;
      for (let ratingValue = 1; ratingValue <= maxRating; ratingValue++) {
        ratingDistribution[ratingValue] = userRatings.filter(
          r => parseInt(r.rating, 10) === ratingValue
        ).length;
      }

      // Personality detection fields
      let noteCount = 0;
      const noteLengths = [];
      const timestamps = sortedUserRatings
        .map(r => r.timestamp)
        .filter(Boolean);

      for (const r of userRatings) {
        if (r.note && r.note.trim()) {
          noteCount++;
          noteLengths.push(r.note.trim().length);
        }
      }

      // Personality detection (wine events only)
      let personality = null;
      if (event.typeOfItem === 'wine' && sortedRatings.length > 0) {
        const avg = sortedRatings.reduce((s, v) => s + v, 0) / sortedRatings.length;
        personality = detectPersonality({
          ratings: sortedRatings,
          ratingDistribution,
          averageRating: avg,
          totalRatings: sortedRatings.length,
          totalItems,
          maxRating,
          noteCount,
          noteLengths,
          earliestTimestamp: timestamps[0] || null,
          latestTimestamp: timestamps[timestamps.length - 1] || null,
        });
      }

      // Resolve userId (lazy backfill if missing)
      let userId = userData?.userId;
      if (!userId) {
        userId = generateUserId();
        if (event.users[email]) {
          event.users[email] = { ...event.users[email], userId };
          needsBackfillPersist = true;
        }
      }

      // Backfill name from email prefix if missing
      const displayName = userName || email.split('@')[0];
      if (!userName && event.users[email]) {
        event.users[email] = { ...event.users[email], name: displayName };
        needsBackfillPersist = true;
      }

      summaries.push({
        userId,
        name: displayName,
        numberOfBottlesRated,
        ratingProgression,
        averageRating,
        ratings: sortedRatings,
        ratingDistribution,
        totalRatings: userRatings.length,
        noteCount,
        personality,
      });
    }

    // Persist any lazy-backfilled userIds/names (event object was mutated in-place)
    if (needsBackfillPersist) {
      try {
        await eventService.updateEvent(event.eventId, event);
      } catch (backfillError) {
        loggerService.warn(`Dashboard userId backfill save failed: ${backfillError.message}`);
      }
    }

    // Sort by name for consistent ordering
    summaries.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return summaries;
  }

  /**
   * Find most and least controversial items based on standard deviation
   * Requires minimum 3 ratings per item
   * @param {Array} itemSummaries - Array of item summary objects with standardDeviation
   * @returns {object} Object with most and least controversial items (or null if not enough data)
   */
  findControversialItems(itemSummaries) {
    // Filter items with at least 3 ratings and valid standard deviation
    const eligibleItems = itemSummaries.filter(
      item => item.numberOfRaters >= 3 && 
              item.standardDeviation !== null && 
              item.standardDeviation !== undefined
    );

    // If no eligible items, return nulls
    if (eligibleItems.length === 0) {
      return {
        most: null,
        least: null
      };
    }

    // Sort by standard deviation (descending for most controversial)
    const sortedByStdDev = [...eligibleItems].sort(
      (a, b) => b.standardDeviation - a.standardDeviation
    );

    // Most controversial = highest standard deviation
    const most = {
      itemId: sortedByStdDev[0].itemId,
      standardDeviation: sortedByStdDev[0].standardDeviation,
      numberOfRaters: sortedByStdDev[0].numberOfRaters,
      averageRating: sortedByStdDev[0].averageRating
    };

    // Least controversial = lowest standard deviation
    const least = {
      itemId: sortedByStdDev[sortedByStdDev.length - 1].itemId,
      standardDeviation: sortedByStdDev[sortedByStdDev.length - 1].standardDeviation,
      numberOfRaters: sortedByStdDev[sortedByStdDev.length - 1].numberOfRaters,
      averageRating: sortedByStdDev[sortedByStdDev.length - 1].averageRating
    };

    return { most, least };
  }
}

export default new DashboardService();
