/**
 * Bayesian Average Calculation Utility
 * 
 * Calculates weighted average using Bayesian formula:
 * (C × global_avg + Σ(ratings)) / (C + n)
 * 
 * Where:
 * - C = 40% of total_users
 * - global_avg = average rating across all items
 * - n = number of raters for the item
 * - Σ(ratings) = sum of all rating values for the item
 */

/**
 * Calculate weighted average using Bayesian formula
 * @param {number|null} globalAvg - Global average rating across all items (can be null/undefined)
 * @param {number} totalUsers - Total number of users in the event
 * @param {number} numberOfRaters - Number of users who rated this item
 * @param {number} sumOfRatings - Sum of all rating values for this item
 * @returns {number|null} Weighted average or null if calculation cannot be performed
 */
export function calculateWeightedAverage(globalAvg, totalUsers, numberOfRaters, sumOfRatings) {
  // Calculate C (40% of total_users, rounded down)
  const C = Math.floor(totalUsers * 0.4);

  // Edge case: C = 0 (no users registered)
  if (C === 0) {
    return null;
  }

  // Edge case: global_avg is undefined/null (no ratings exist)
  if (globalAvg === null || globalAvg === undefined || isNaN(globalAvg)) {
    return null;
  }

  // Edge case: numberOfRaters is 0 (no ratings for this item)
  // In this case, weighted average equals global average
  if (numberOfRaters === 0) {
    return globalAvg;
  }

  // Calculate Bayesian weighted average
  // Formula: (C × global_avg + Σ(ratings)) / (C + n)
  const numerator = (C * globalAvg) + sumOfRatings;
  const denominator = C + numberOfRaters;
  const weightedAverage = numerator / denominator;

  // Return null if result is invalid
  if (isNaN(weightedAverage) || !isFinite(weightedAverage)) {
    return null;
  }

  return weightedAverage;
}
