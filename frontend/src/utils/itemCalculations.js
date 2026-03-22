/**
 * Item Calculations Utility
 *
 * Extracted from ItemDetailsDrawer.jsx to reduce component complexity.
 * Each function mirrors the exact logic that was previously inline in useMemo blocks.
 */

import { calculateWeightedAverage } from '@/utils/bayesianAverage';

/**
 * Build a distribution object from an array of rating records.
 * @param {Array} ratings - Array of rating objects with a `rating` property
 * @returns {Object} Map of rating value → count  (empty object when no ratings)
 */
export function calculateRatingDistribution(ratings) {
  if (!ratings || !ratings.length) return {};

  const distribution = {};
  ratings.forEach(rating => {
    const value = rating.rating;
    distribution[value] = (distribution[value] || 0) + 1;
  });

  return distribution;
}

/**
 * Calculate plain average, global average, weighted (Bayesian) average,
 * and total unique user count from all ratings and item-specific ratings.
 *
 * @param {Array} itemRatings  - Ratings for the current item
 * @param {Array} allRatings   - Every rating across all items in the event
 * @returns {{ averageRating: number|null, globalAverage: number|null, weightedAverage: number|null, totalUsers: number }}
 */
export function calculateWeightedAverages(itemRatings, allRatings) {
  // --- plain average for this item ---
  let averageRating = null;
  if (itemRatings && itemRatings.length) {
    const sum = itemRatings.reduce((acc, r) => acc + (parseInt(r.rating, 10) || 0), 0);
    const avg = sum / itemRatings.length;
    averageRating = isNaN(avg) ? null : parseFloat(avg.toFixed(2));
  }

  // --- global average from ALL ratings ---
  let globalAverage = null;
  if (allRatings && allRatings.length > 0) {
    const sum = allRatings.reduce((acc, r) => acc + (parseInt(r.rating, 10) || 0), 0);
    globalAverage = sum / allRatings.length;
    globalAverage = isNaN(globalAverage) ? null : parseFloat(globalAverage.toFixed(2));
  }

  // --- count total unique users ---
  const uniqueUsers = new Set();
  if (allRatings) {
    allRatings.forEach(r => {
      if (r.email) {
        uniqueUsers.add(r.email.trim().toLowerCase());
      }
    });
  }
  const totalUsers = uniqueUsers.size;

  // --- Bayesian weighted average ---
  let weightedAverage = null;
  if (globalAverage !== null && totalUsers > 0 && itemRatings && itemRatings.length > 0) {
    const sumOfRatings = itemRatings.reduce((acc, r) => acc + (parseInt(r.rating, 10) || 0), 0);
    const numberOfRaters = itemRatings.length;
    weightedAverage = calculateWeightedAverage(globalAverage, totalUsers, numberOfRaters, sumOfRatings);
    weightedAverage = weightedAverage !== null ? parseFloat(weightedAverage.toFixed(2)) : null;
  }

  return { averageRating, globalAverage, weightedAverage, totalUsers };
}

/**
 * Find the 1-based rank of an item within the dashboard data (sorted by weightedAverage desc).
 *
 * @param {number} itemId          - The item ID to look up
 * @param {Object} dashboardData   - Dashboard payload (must contain `itemSummaries` array)
 * @returns {number|null}           1-based rank, or null if not rankable
 */
export function calculateItemRank(itemId, dashboardData) {
  if (!dashboardData?.itemSummaries || !itemId) return null;

  const itemSummaries = dashboardData.itemSummaries;

  // Sort by weightedAverage descending (nulls go to end)
  const sorted = [...itemSummaries].sort((a, b) => {
    const aVal = a.weightedAverage ?? -1;
    const bVal = b.weightedAverage ?? -1;

    // Handle nulls (put at end)
    if (aVal === -1 && bVal === -1) return 0;
    if (aVal === -1) return 1;
    if (bVal === -1) return -1;

    // Sort descending
    return bVal - aVal;
  });

  // Find position of current item
  const rank = sorted.findIndex(item => item.itemId === itemId);

  // If item not found or has no weighted average, return null
  if (rank === -1 || sorted[rank]?.weightedAverage === null) {
    return null;
  }

  return rank + 1; // 1-based ranking
}

/**
 * Calculate the percentage of total users who have rated a specific item.
 *
 * @param {Array}  itemRatings - Ratings for the item
 * @param {number} totalUsers  - Total unique users across event
 * @returns {number} Percentage clamped between 0 and 100
 */
export function calculateRatingProgression(itemRatings, totalUsers) {
  if (!totalUsers || totalUsers === 0) return 0;

  // Count unique users who rated this item
  const uniqueRaters = new Set();
  if (itemRatings) {
    itemRatings.forEach(rating => {
      if (rating.email) {
        uniqueRaters.add(rating.email.trim().toLowerCase());
      }
    });
  }
  const numberOfRaters = uniqueRaters.size;

  // Calculate percentage
  const progress = (numberOfRaters / totalUsers) * 100;
  return Math.max(0, Math.min(100, progress)); // Clamp between 0 and 100
}

/**
 * Find the current user's rating for a specific item.
 * @param {Array}  ratings        - Ratings for the item
 * @param {string} userIdentifier - Current user's identifier (email for admins, userId for guests)
 * @returns {Object|null} The matching rating object, or null
 */
export function findUserRating(ratings, userEmail) {
  if (!userEmail || !ratings || !ratings.length) return null;
  const normalizedUserEmail = userEmail.trim().toLowerCase();
  return ratings.find(r => r.email?.trim().toLowerCase() === normalizedUserEmail) || null;
}
