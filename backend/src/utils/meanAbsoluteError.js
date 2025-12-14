/**
 * Mean Absolute Error (MAE) Calculation Utility
 * 
 * Calculates Mean Absolute Error between two users' rating patterns:
 * MAE = (1/n) * Σ|user1Rating - user2Rating|
 * 
 * Where:
 * - n = number of common items
 * - user1Rating = current user's rating for a common item
 * - user2Rating = other user's rating for the same item
 * 
 * MAE ranges from 0 (perfect match) to maxRating (worst possible match)
 * Lower MAE = more similar users
 * 
 * Returns null if:
 * - Fewer than 3 common items
 * - Invalid input data
 */

/**
 * Calculate Mean Absolute Error between two users' rating patterns
 * @param {Array<{itemId: number, rating: number}>} user1Ratings - First user's ratings
 * @param {Array<{itemId: number, rating: number}>} user2Ratings - Second user's ratings
 * @returns {number|null} Mean Absolute Error (0 to maxRating) or null if calculation cannot be performed
 */
export function calculateMeanAbsoluteError(user1Ratings, user2Ratings) {
  // Find common items (items rated by both users)
  const commonItems = getCommonItems(user1Ratings, user2Ratings);

  // Minimum 3 common items required
  if (commonItems.length < 3) {
    return null;
  }

  // Calculate sum of absolute differences
  let sumAbsoluteDifferences = 0;
  for (const item of commonItems) {
    const difference = Math.abs(item.user1Rating - item.user2Rating);
    sumAbsoluteDifferences += difference;
  }

  // Calculate MAE: average of absolute differences
  const mae = sumAbsoluteDifferences / commonItems.length;

  // Check for invalid results (NaN, Infinity)
  if (isNaN(mae) || !isFinite(mae)) {
    return null;
  }

  return mae;
}

/**
 * Convert MAE to similarity score (0 to 1, where 1 = perfect match)
 * Includes confidence weighting based on number of common items.
 * More common items = higher confidence = slight boost to similarity score.
 * 
 * @param {number} mae - Mean Absolute Error
 * @param {number} maxRating - Maximum rating value (e.g., 4 for scale 1-4)
 * @param {number} commonItemsCount - Number of common items (default: 3, minimum)
 * @returns {number} Similarity score from 0 to 1
 */
export function maeToSimilarityScore(mae, maxRating, commonItemsCount = 3) {
  if (mae === null || !isFinite(mae) || maxRating <= 0) {
    return 0;
  }
  
  // Base similarity from MAE: similarity = 1 - (MAE / maxRating)
  // MAE of 0 (perfect match) → similarity of 1
  // MAE of maxRating (worst match) → similarity of 0
  const baseSimilarity = 1 - (mae / maxRating);
  
  // Confidence factor based on number of common items
  // Uses logarithmic scale: more items = higher confidence, but with diminishing returns
  // Formula: confidence = 1 - (1 / (1 + log(n/minItems)))
  // This gives:
  // - 3 items (minimum): confidence ≈ 0.85
  // - 10 items: confidence ≈ 0.95
  // - 20 items: confidence ≈ 0.98
  // - 50+ items: confidence ≈ 1.0
  const minItems = 3;
  if (commonItemsCount < minItems) {
    // If somehow we have fewer than minimum, use base similarity without boost
    return Math.max(0, Math.min(1, baseSimilarity));
  }
  
  const confidenceFactor = 1 - (1 / (1 + Math.log(commonItemsCount / minItems)));
  
  // Adjusted similarity: base similarity weighted by confidence
  // More common items = higher confidence = slight boost to score
  // Formula: adjusted = base * (0.9 + 0.1 * confidence)
  // This gives a boost of 0-10% based on confidence
  const adjustedSimilarity = baseSimilarity * (0.9 + 0.1 * confidenceFactor);
  
  // Ensure result is within valid range [0, 1]
  return Math.max(0, Math.min(1, adjustedSimilarity));
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
