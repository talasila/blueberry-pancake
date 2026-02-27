/**
 * Calculate user rating progress data from a list of ratings and available items.
 *
 * @param {Array} ratings - Array of rating objects ({itemId, rating, timestamp})
 * @param {Array<number>} availableItemIds - Array of available item IDs
 * @param {number} [maxRating=4] - Maximum rating value
 * @returns {object|null} Progress data or null if insufficient data
 */
export function calculateUserRatingProgress(ratings, availableItemIds, maxRating = 4) {
  if (!ratings || ratings.length === 0 || !availableItemIds?.length) {
    return null;
  }

  const totalItems = availableItemIds.length;

  const uniqueItemsRated = new Set();
  ratings.forEach(rating => {
    const itemId = parseInt(rating.itemId, 10);
    if (!isNaN(itemId)) {
      uniqueItemsRated.add(itemId);
    }
  });
  const numberOfItemsRated = uniqueItemsRated.size;

  const ratingProgression = totalItems > 0
    ? (numberOfItemsRated / totalItems) * 100
    : 0;

  const ratingDistribution = {};
  for (let ratingValue = 1; ratingValue <= maxRating; ratingValue++) {
    ratingDistribution[ratingValue] = ratings.filter(
      r => parseInt(r.rating, 10) === ratingValue
    ).length;
  }

  const sortedRatings = [...ratings]
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (isNaN(aTime)) return 1;
      if (isNaN(bTime)) return -1;
      return aTime - bTime;
    })
    .map(rating => {
      const ratingValue = parseInt(rating.rating, 10);
      return isNaN(ratingValue) ? null : ratingValue;
    })
    .filter(rating => rating !== null);

  return {
    ratingProgression: parseFloat(ratingProgression.toFixed(2)),
    ratingDistribution,
    ratings: sortedRatings,
    totalRatings: ratings.length,
  };
}
