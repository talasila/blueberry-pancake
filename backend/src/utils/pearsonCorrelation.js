/**
 * Pearson Correlation Calculation Utility
 * 
 * Calculates Pearson correlation coefficient (r) between two users' rating patterns:
 * r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² × Σ(y - ȳ)²)
 * 
 * Where:
 * - x = current user's ratings for common items
 * - y = other user's ratings for common items
 * - x̄ = mean of current user's ratings
 * - ȳ = mean of other user's ratings
 * 
 * Returns null if:
 * - Insufficient variance (all ratings identical for either user)
 * - Division by zero
 * - NaN or Infinity result
 * - Fewer than 3 common items
 */

/**
 * Calculate Pearson correlation coefficient between two users' rating patterns
 * @param {Array<{itemId: number, rating: number}>} user1Ratings - First user's ratings
 * @param {Array<{itemId: number, rating: number}>} user2Ratings - Second user's ratings
 * @returns {number|null} Pearson correlation coefficient (-1.0 to 1.0) or null if calculation cannot be performed
 */
export function calculatePearsonCorrelation(user1Ratings, user2Ratings) {
  // Find common items (items rated by both users)
  const commonItems = getCommonItems(user1Ratings, user2Ratings);

  // Minimum 3 common items required
  if (commonItems.length < 3) {
    return null;
  }

  // Extract ratings for common items
  const x = commonItems.map(item => item.user1Rating);
  const y = commonItems.map(item => item.user2Rating);

  // Calculate means
  const xMean = x.reduce((sum, val) => sum + val, 0) / x.length;
  const yMean = y.reduce((sum, val) => sum + val, 0) / y.length;

  // Calculate numerator: Σ((x - x̄)(y - ȳ))
  let numerator = 0;
  for (let i = 0; i < x.length; i++) {
    numerator += (x[i] - xMean) * (y[i] - yMean);
  }

  // Calculate sum of squared differences for denominator
  let sumSquaredDiffX = 0;
  let sumSquaredDiffY = 0;
  for (let i = 0; i < x.length; i++) {
    const diffX = x[i] - xMean;
    const diffY = y[i] - yMean;
    sumSquaredDiffX += diffX * diffX;
    sumSquaredDiffY += diffY * diffY;
  }

  // Calculate denominator: √(Σ(x - x̄)² × Σ(y - ȳ)²)
  const denominator = Math.sqrt(sumSquaredDiffX * sumSquaredDiffY);

  // Check for division by zero or insufficient variance
  if (denominator === 0 || !isFinite(denominator)) {
    return null;
  }

  // Calculate correlation: r = numerator / denominator
  const correlation = numerator / denominator;

  // Check for invalid results (NaN, Infinity)
  if (isNaN(correlation) || !isFinite(correlation)) {
    return null;
  }

  // Ensure result is within valid range [-1, 1]
  return Math.max(-1, Math.min(1, correlation));
}

/**
 * Get common items between two users' ratings
 * @param {Array<{itemId: number, rating: number}>} user1Ratings - First user's ratings
 * @param {Array<{itemId: number, rating: number}>} user2Ratings - Second user's ratings
 * @returns {Array<{itemId: number, user1Rating: number, user2Rating: number}>} Array of common items with both ratings
 */
function getCommonItems(user1Ratings, user2Ratings) {
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
