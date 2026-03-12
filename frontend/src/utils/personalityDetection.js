/**
 * Frontend personality detection — mirrors backend PersonalityService.js exactly.
 * Used for the current user's own personality (computed client-side to avoid an API call).
 */

function calculateStdDev(ratings) {
  if (ratings.length === 0) return 0;
  const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  const squaredDiffs = ratings.map(r => (r - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / ratings.length);
}

function calculateInterRatingMinutes(earliestTimestamp, latestTimestamp, totalRatings) {
  if (totalRatings <= 1 || !earliestTimestamp || !latestTimestamp) return null;
  const earliest = new Date(earliestTimestamp).getTime();
  const latest = new Date(latestTimestamp).getTime();
  if (isNaN(earliest) || isNaN(latest)) return null;
  const spanMs = latest - earliest;
  return (spanMs / 1000 / 60) / (totalRatings - 1);
}

function getMinimumThreshold(totalItems) {
  return Math.min(Math.max(4, Math.ceil(totalItems * 0.5)), totalItems);
}

const PERSONALITY_RULES = [
  {
    id: 'broken-record',
    test: ({ ratingDistribution, totalRatings }) => {
      const counts = Object.values(ratingDistribution);
      return counts.some(count => count / totalRatings >= 0.75);
    },
  },
  {
    id: 'love-hate-critic',
    test: ({ ratingDistribution, maxRating, totalRatings }) => {
      const minCount = ratingDistribution[1] || 0;
      const maxCount = ratingDistribution[maxRating] || 0;
      const extremeRatio = (minCount + maxCount) / totalRatings;
      if (extremeRatio < 0.7) return false;
      const middleCount = totalRatings - minCount - maxCount;
      return (middleCount / totalRatings) < 0.15;
    },
  },
  {
    id: 'speedrun',
    test: ({ earliestTimestamp, latestTimestamp, totalRatings, totalItems }) => {
      const avgMinutes = calculateInterRatingMinutes(earliestTimestamp, latestTimestamp, totalRatings);
      if (avgMinutes === null) return false;
      return avgMinutes < 2 && (totalRatings / totalItems) >= 0.75;
    },
    excludeWhen: ({ totalRatings }) => totalRatings <= 1,
  },
  {
    id: 'golden-retriever',
    test: ({ averageRating, maxRating }) => averageRating >= (maxRating - 0.5),
  },
  {
    id: 'simon-cowell',
    test: ({ averageRating, maxRating }) => averageRating <= (1 + (maxRating - 1) * 0.25),
  },
  {
    id: 'novelist',
    test: ({ noteCount, noteLengths, totalRatings }) => {
      if (noteCount / totalRatings < 0.7) return false;
      if (noteLengths.length === 0) return false;
      const avgLength = noteLengths.reduce((s, l) => s + l, 0) / noteLengths.length;
      return avgLength > 60;
    },
  },
  {
    id: 'rollercoaster',
    test: ({ ratings, maxRating }) => {
      const range = maxRating - 1;
      if (range === 0) return false;
      const stdDev = calculateStdDev(ratings);
      const distinctValues = new Set(ratings).size;
      return (stdDev / range) > 0.35 && distinctValues >= 3;
    },
    excludeWhen: ({ maxRating }) => maxRating <= 2,
  },
  {
    id: 'diplomat',
    test: ({ ratings, ratingDistribution, maxRating, totalRatings }) => {
      const range = maxRating - 1;
      if (range === 0) return false;
      const middleValues = [];
      for (let v = 2; v < maxRating; v++) {
        middleValues.push(v);
      }
      const middleCount = middleValues.reduce((sum, v) => sum + (ratingDistribution[v] || 0), 0);
      if (middleCount / totalRatings < 0.65) return false;
      const stdDev = calculateStdDev(ratings);
      return (stdDev / range) < 0.20;
    },
    excludeWhen: ({ maxRating }) => maxRating <= 2,
  },
  {
    id: 'ghost',
    test: ({ noteCount, totalRatings, totalItems }) => {
      return noteCount === 0 && (totalRatings / totalItems) >= 0.5;
    },
  },
  {
    id: 'philosopher',
    test: ({ earliestTimestamp, latestTimestamp, totalRatings, totalItems }) => {
      const avgMinutes = calculateInterRatingMinutes(earliestTimestamp, latestTimestamp, totalRatings);
      if (avgMinutes === null) return false;
      return avgMinutes > 8 && (totalRatings / totalItems) >= 0.5;
    },
    excludeWhen: ({ totalRatings }) => totalRatings <= 1,
  },
  {
    id: 'explorer',
    test: ({ ratingDistribution }) => {
      const distinctValues = Object.values(ratingDistribution).filter(c => c > 0).length;
      return distinctValues >= 2;
    },
  },
];

/**
 * Detect personality type from rating data.
 * @param {object} input - PersonalityDetectionInput
 * @returns {string|null} Personality type ID or null if below threshold
 */
export function detectPersonality(input) {
  const {
    totalRatings, totalItems,
  } = input;

  const threshold = getMinimumThreshold(totalItems);
  if (totalRatings < threshold) return null;

  for (const rule of PERSONALITY_RULES) {
    if (rule.excludeWhen && rule.excludeWhen(input)) continue;
    if (rule.test(input)) return rule.id;
  }

  return null;
}

export { getMinimumThreshold, calculateInterRatingMinutes, calculateStdDev };
