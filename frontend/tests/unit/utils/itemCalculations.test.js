import { describe, it, expect } from 'vitest';
import {
  calculateRatingDistribution,
  calculateWeightedAverages,
  calculateItemRank,
  calculateRatingProgression,
  findUserRating,
} from '@/utils/itemCalculations';

describe('calculateRatingDistribution', () => {
  it('returns empty object for empty ratings', () => {
    expect(calculateRatingDistribution([])).toEqual({});
  });

  it('returns empty object for null/undefined', () => {
    expect(calculateRatingDistribution(null)).toEqual({});
    expect(calculateRatingDistribution(undefined)).toEqual({});
  });

  it('counts a single rating', () => {
    const ratings = [{ rating: 3 }];
    expect(calculateRatingDistribution(ratings)).toEqual({ 3: 1 });
  });

  it('counts multiple ratings with the same value', () => {
    const ratings = [{ rating: 5 }, { rating: 5 }, { rating: 5 }];
    expect(calculateRatingDistribution(ratings)).toEqual({ 5: 3 });
  });

  it('builds correct distribution from mixed values', () => {
    const ratings = [
      { rating: 1 },
      { rating: 2 },
      { rating: 2 },
      { rating: 3 },
      { rating: 3 },
      { rating: 3 },
    ];
    expect(calculateRatingDistribution(ratings)).toEqual({ 1: 1, 2: 2, 3: 3 });
  });
});

describe('calculateWeightedAverages', () => {
  it('returns nulls for empty item ratings', () => {
    const result = calculateWeightedAverages([], []);
    expect(result.averageRating).toBeNull();
    expect(result.globalAverage).toBeNull();
    expect(result.weightedAverage).toBeNull();
    expect(result.totalUsers).toBe(0);
  });

  it('returns nulls for null/undefined inputs', () => {
    const result = calculateWeightedAverages(null, null);
    expect(result.averageRating).toBeNull();
    expect(result.totalUsers).toBe(0);
  });

  it('calculates plain average for item ratings', () => {
    const itemRatings = [
      { rating: 4, email: 'a@b.com' },
      { rating: 6, email: 'c@d.com' },
    ];
    const result = calculateWeightedAverages(itemRatings, itemRatings);
    expect(result.averageRating).toBe(5);
  });

  it('calculates global average across all ratings', () => {
    const allRatings = [
      { rating: 2, email: 'a@b.com' },
      { rating: 4, email: 'c@d.com' },
      { rating: 6, email: 'e@f.com' },
    ];
    const result = calculateWeightedAverages([], allRatings);
    expect(result.globalAverage).toBe(4);
  });

  it('counts unique users (case-insensitive, trimmed)', () => {
    const allRatings = [
      { rating: 3, email: 'Alice@Example.com' },
      { rating: 4, email: ' alice@example.com ' },
      { rating: 5, email: 'bob@example.com' },
    ];
    const result = calculateWeightedAverages([], allRatings);
    expect(result.totalUsers).toBe(2);
  });

  it('handles ratings with missing email gracefully', () => {
    const allRatings = [
      { rating: 3, email: null },
      { rating: 4 },
    ];
    const result = calculateWeightedAverages(allRatings, allRatings);
    expect(result.totalUsers).toBe(0);
    // Still computes average
    expect(result.averageRating).toBe(3.5);
  });

  it('calculates weighted average using Bayesian formula', () => {
    // 5 unique users globally, item has 2 ratings summing to 10
    const allRatings = [
      { rating: 3, email: 'a@b.com' },
      { rating: 4, email: 'b@b.com' },
      { rating: 5, email: 'c@b.com' },
      { rating: 3, email: 'd@b.com' },
      { rating: 5, email: 'e@b.com' },
    ];
    const itemRatings = [
      { rating: 5, email: 'a@b.com' },
      { rating: 5, email: 'b@b.com' },
    ];
    const result = calculateWeightedAverages(itemRatings, allRatings);
    // globalAvg = 4.0, totalUsers = 5, C = floor(5 * 0.4) = 2
    // weighted = (2 * 4 + 10) / (2 + 2) = 18 / 4 = 4.5
    expect(result.weightedAverage).toBe(4.5);
  });
});

describe('calculateItemRank', () => {
  it('returns null when dashboardData is null', () => {
    expect(calculateItemRank(1, null)).toBeNull();
  });

  it('returns null when itemSummaries is missing', () => {
    expect(calculateItemRank(1, {})).toBeNull();
  });

  it('returns null when itemId is falsy', () => {
    expect(calculateItemRank(0, { itemSummaries: [] })).toBeNull();
    expect(calculateItemRank(null, { itemSummaries: [] })).toBeNull();
  });

  it('returns 1-based rank for the top item', () => {
    const data = {
      itemSummaries: [
        { itemId: 1, weightedAverage: 3.0 },
        { itemId: 2, weightedAverage: 5.0 },
        { itemId: 3, weightedAverage: 4.0 },
      ],
    };
    expect(calculateItemRank(2, data)).toBe(1);
  });

  it('returns correct rank for middle item', () => {
    const data = {
      itemSummaries: [
        { itemId: 1, weightedAverage: 3.0 },
        { itemId: 2, weightedAverage: 5.0 },
        { itemId: 3, weightedAverage: 4.0 },
      ],
    };
    expect(calculateItemRank(3, data)).toBe(2);
    expect(calculateItemRank(1, data)).toBe(3);
  });

  it('returns null for item with null weightedAverage', () => {
    const data = {
      itemSummaries: [
        { itemId: 1, weightedAverage: 5.0 },
        { itemId: 2, weightedAverage: null },
      ],
    };
    expect(calculateItemRank(2, data)).toBeNull();
  });

  it('returns null when item is not found', () => {
    const data = {
      itemSummaries: [
        { itemId: 1, weightedAverage: 5.0 },
      ],
    };
    expect(calculateItemRank(999, data)).toBeNull();
  });

  it('handles items with undefined weightedAverage (pushed to end)', () => {
    const data = {
      itemSummaries: [
        { itemId: 1, weightedAverage: undefined },
        { itemId: 2, weightedAverage: 3.0 },
      ],
    };
    expect(calculateItemRank(2, data)).toBe(1);
    // itemId 1 has undefined weightedAverage → sorted last but still gets a rank
    // (only strict null triggers null-check; undefined does not)
    expect(calculateItemRank(1, data)).toBe(2);
  });
});

describe('calculateRatingProgression', () => {
  it('returns 0 when totalUsers is 0', () => {
    expect(calculateRatingProgression([], 0)).toBe(0);
  });

  it('returns 0 when totalUsers is null/undefined', () => {
    expect(calculateRatingProgression([], null)).toBe(0);
    expect(calculateRatingProgression([], undefined)).toBe(0);
  });

  it('returns 0 for null ratings array', () => {
    expect(calculateRatingProgression(null, 5)).toBe(0);
  });

  it('calculates correct percentage', () => {
    const ratings = [
      { email: 'a@b.com' },
      { email: 'c@d.com' },
    ];
    // 2 out of 4 users = 50%
    expect(calculateRatingProgression(ratings, 4)).toBe(50);
  });

  it('deduplicates users by email (case-insensitive)', () => {
    const ratings = [
      { email: 'Alice@Example.com' },
      { email: 'alice@example.com' },
      { email: 'bob@example.com' },
    ];
    // 2 unique raters out of 4 total = 50%
    expect(calculateRatingProgression(ratings, 4)).toBe(50);
  });

  it('clamps result at 100', () => {
    const ratings = [
      { email: 'a@b.com' },
      { email: 'c@d.com' },
      { email: 'e@f.com' },
    ];
    // 3 raters out of 2 total = 150% → clamped to 100
    expect(calculateRatingProgression(ratings, 2)).toBe(100);
  });

  it('skips ratings without email', () => {
    const ratings = [
      { email: 'a@b.com' },
      { email: null },
      {},
    ];
    // 1 unique rater out of 5 total = 20%
    expect(calculateRatingProgression(ratings, 5)).toBe(20);
  });
});

describe('findUserRating', () => {
  it('returns null when userEmail is falsy', () => {
    expect(findUserRating([{ rating: 3, email: 'a@b.com' }], null)).toBeNull();
    expect(findUserRating([{ rating: 3, email: 'a@b.com' }], '')).toBeNull();
  });

  it('returns null when ratings is empty', () => {
    expect(findUserRating([], 'a@b.com')).toBeNull();
  });

  it('returns null when ratings is null/undefined', () => {
    expect(findUserRating(null, 'a@b.com')).toBeNull();
    expect(findUserRating(undefined, 'a@b.com')).toBeNull();
  });

  it('finds matching rating (case-insensitive, trimmed)', () => {
    const ratings = [
      { rating: 3, email: 'Alice@Example.com' },
      { rating: 5, email: 'bob@example.com' },
    ];
    const result = findUserRating(ratings, ' alice@example.com ');
    expect(result).toEqual({ rating: 3, email: 'Alice@Example.com' });
  });

  it('returns null when no match', () => {
    const ratings = [
      { rating: 3, email: 'alice@example.com' },
    ];
    expect(findUserRating(ratings, 'bob@example.com')).toBeNull();
  });

  it('handles ratings with missing email', () => {
    const ratings = [
      { rating: 3 },
      { rating: 5, email: null },
      { rating: 4, email: 'alice@example.com' },
    ];
    const result = findUserRating(ratings, 'alice@example.com');
    expect(result).toEqual({ rating: 4, email: 'alice@example.com' });
  });
});
