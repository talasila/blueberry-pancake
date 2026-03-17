import { describe, it, expect } from 'vitest';
import { calculateMeanAbsoluteError, maeToSimilarityScore } from '../../../src/utils/meanAbsoluteError.js';

describe('calculateMeanAbsoluteError', () => {
  it('should return 0 for identical ratings', () => {
    const user1 = [
      { itemId: 1, rating: 4 },
      { itemId: 2, rating: 3 },
      { itemId: 3, rating: 2 }
    ];
    const user2 = [
      { itemId: 1, rating: 4 },
      { itemId: 2, rating: 3 },
      { itemId: 3, rating: 2 }
    ];
    expect(calculateMeanAbsoluteError(user1, user2)).toBe(0);
  });

  it('should calculate MAE correctly for different ratings', () => {
    const user1 = [
      { itemId: 1, rating: 4 },
      { itemId: 2, rating: 1 },
      { itemId: 3, rating: 3 }
    ];
    const user2 = [
      { itemId: 1, rating: 2 },
      { itemId: 2, rating: 3 },
      { itemId: 3, rating: 3 }
    ];
    // |4-2| + |1-3| + |3-3| = 2 + 2 + 0 = 4, MAE = 4/3
    expect(calculateMeanAbsoluteError(user1, user2)).toBeCloseTo(4 / 3, 5);
  });

  it('should only consider common items', () => {
    const user1 = [
      { itemId: 1, rating: 4 },
      { itemId: 2, rating: 3 },
      { itemId: 3, rating: 2 },
      { itemId: 4, rating: 1 } // not rated by user2
    ];
    const user2 = [
      { itemId: 1, rating: 4 },
      { itemId: 2, rating: 3 },
      { itemId: 3, rating: 2 },
      { itemId: 5, rating: 1 } // not rated by user1
    ];
    // Common: items 1,2,3 → all identical → MAE = 0
    expect(calculateMeanAbsoluteError(user1, user2)).toBe(0);
  });

  it('should return null with fewer than 3 common items', () => {
    const user1 = [
      { itemId: 1, rating: 4 },
      { itemId: 2, rating: 3 }
    ];
    const user2 = [
      { itemId: 1, rating: 4 },
      { itemId: 2, rating: 3 }
    ];
    expect(calculateMeanAbsoluteError(user1, user2)).toBeNull();
  });

  it('should return null with no common items', () => {
    const user1 = [{ itemId: 1, rating: 4 }];
    const user2 = [{ itemId: 2, rating: 3 }];
    expect(calculateMeanAbsoluteError(user1, user2)).toBeNull();
  });

  it('should return null for empty arrays', () => {
    expect(calculateMeanAbsoluteError([], [])).toBeNull();
  });

  it('should handle maximum disagreement', () => {
    const user1 = [
      { itemId: 1, rating: 1 },
      { itemId: 2, rating: 1 },
      { itemId: 3, rating: 1 }
    ];
    const user2 = [
      { itemId: 1, rating: 4 },
      { itemId: 2, rating: 4 },
      { itemId: 3, rating: 4 }
    ];
    // |1-4| * 3 = 9, MAE = 9/3 = 3
    expect(calculateMeanAbsoluteError(user1, user2)).toBe(3);
  });
});

describe('maeToSimilarityScore', () => {
  it('should return 1 (max similarity with confidence adjustment) for MAE of 0', () => {
    const score = maeToSimilarityScore(0, 4, 3);
    // base = 1, confidence at 3 items = 0, adjusted = 1 * (0.9 + 0.1 * 0) = 0.9
    expect(score).toBeCloseTo(0.9, 2);
  });

  it('should return 0 for MAE equal to maxRating', () => {
    const score = maeToSimilarityScore(4, 4, 3);
    expect(score).toBe(0);
  });

  it('should increase score with more common items (confidence boost)', () => {
    const score3 = maeToSimilarityScore(1, 4, 3);
    const score20 = maeToSimilarityScore(1, 4, 20);
    expect(score20).toBeGreaterThan(score3);
  });

  it('should return 0 for null MAE', () => {
    expect(maeToSimilarityScore(null, 4, 3)).toBe(0);
  });

  it('should return 0 for maxRating of 0', () => {
    expect(maeToSimilarityScore(0, 0, 3)).toBe(0);
  });

  it('should return 0 for negative maxRating', () => {
    expect(maeToSimilarityScore(0, -1, 3)).toBe(0);
  });

  it('should clamp to range [0, 1]', () => {
    const score = maeToSimilarityScore(0, 4, 100);
    expect(score).toBeLessThanOrEqual(1);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('should handle fewer than minimum common items gracefully', () => {
    const score = maeToSimilarityScore(1, 4, 1);
    // base = 1 - 0.25 = 0.75, no confidence boost
    expect(score).toBeCloseTo(0.75, 2);
  });

  it('should produce decreasing scores as MAE increases', () => {
    const score0 = maeToSimilarityScore(0, 4, 10);
    const score1 = maeToSimilarityScore(1, 4, 10);
    const score2 = maeToSimilarityScore(2, 4, 10);
    const score3 = maeToSimilarityScore(3, 4, 10);

    expect(score0).toBeGreaterThan(score1);
    expect(score1).toBeGreaterThan(score2);
    expect(score2).toBeGreaterThan(score3);
  });
});
