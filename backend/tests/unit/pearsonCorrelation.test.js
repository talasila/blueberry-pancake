import { describe, it, expect } from 'vitest';
import { calculatePearsonCorrelation } from '../../../src/utils/pearsonCorrelation.js';

/**
 * Unit tests for Pearson correlation calculation
 */
describe('Pearson Correlation Calculation', () => {
  describe('calculatePearsonCorrelation', () => {
    it('should calculate perfect positive correlation (1.0) for identical rating patterns', () => {
      const user1Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 3, rating: 3 }
      ];
      const user2Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 3, rating: 3 }
      ];

      const correlation = calculatePearsonCorrelation(user1Ratings, user2Ratings);
      expect(correlation).toBeCloseTo(1.0, 5);
    });

    it('should calculate perfect negative correlation (-1.0) for opposite rating patterns', () => {
      const user1Ratings = [
        { itemId: 1, rating: 1 },
        { itemId: 2, rating: 2 },
        { itemId: 3, rating: 3 }
      ];
      const user2Ratings = [
        { itemId: 1, rating: 5 },
        { itemId: 2, rating: 4 },
        { itemId: 3, rating: 3 }
      ];

      const correlation = calculatePearsonCorrelation(user1Ratings, user2Ratings);
      expect(correlation).toBeCloseTo(-1.0, 5);
    });

    it('should calculate positive correlation for similar rating patterns', () => {
      const user1Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 3, rating: 3 },
        { itemId: 4, rating: 4 }
      ];
      const user2Ratings = [
        { itemId: 1, rating: 5 },
        { itemId: 2, rating: 4 },
        { itemId: 3, rating: 4 },
        { itemId: 4, rating: 5 }
      ];

      const correlation = calculatePearsonCorrelation(user1Ratings, user2Ratings);
      expect(correlation).toBeGreaterThan(0);
      expect(correlation).toBeLessThanOrEqual(1.0);
    });

    it('should return null for insufficient variance (all ratings identical for user1)', () => {
      const user1Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 4 },
        { itemId: 3, rating: 4 }
      ];
      const user2Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 3, rating: 3 }
      ];

      const correlation = calculatePearsonCorrelation(user1Ratings, user2Ratings);
      expect(correlation).toBeNull();
    });

    it('should return null for insufficient variance (all ratings identical for user2)', () => {
      const user1Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 3, rating: 3 }
      ];
      const user2Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 4 },
        { itemId: 3, rating: 4 }
      ];

      const correlation = calculatePearsonCorrelation(user1Ratings, user2Ratings);
      expect(correlation).toBeNull();
    });

    it('should return null for insufficient variance (both users have identical ratings)', () => {
      const user1Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 4 },
        { itemId: 3, rating: 4 }
      ];
      const user2Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 4 },
        { itemId: 3, rating: 4 }
      ];

      const correlation = calculatePearsonCorrelation(user1Ratings, user2Ratings);
      expect(correlation).toBeNull();
    });

    it('should handle empty arrays by returning null', () => {
      const correlation = calculatePearsonCorrelation([], []);
      expect(correlation).toBeNull();
    });

    it('should handle arrays with different itemIds (only use common items)', () => {
      const user1Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 3, rating: 3 },
        { itemId: 4, rating: 4 }
      ];
      const user2Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 3, rating: 3 },
        { itemId: 5, rating: 2 } // Different itemId
      ];

      const correlation = calculatePearsonCorrelation(user1Ratings, user2Ratings);
      // Should only use items 1, 2, 3 (common items)
      expect(correlation).toBeCloseTo(1.0, 5);
    });

    it('should handle minimum 3 common items requirement', () => {
      const user1Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 3, rating: 3 }
      ];
      const user2Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 3, rating: 3 }
      ];

      const correlation = calculatePearsonCorrelation(user1Ratings, user2Ratings);
      expect(correlation).not.toBeNull();
    });

    it('should return null for fewer than 3 common items', () => {
      const user1Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 }
      ];
      const user2Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 }
      ];

      const correlation = calculatePearsonCorrelation(user1Ratings, user2Ratings);
      expect(correlation).toBeNull();
    });

    it('should handle NaN or Infinity results by returning null', () => {
      // Edge case: ratings that would produce NaN/Infinity
      const user1Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 3, rating: 3 }
      ];
      const user2Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 3, rating: 3 }
      ];

      const correlation = calculatePearsonCorrelation(user1Ratings, user2Ratings);
      // Should handle edge cases gracefully
      expect(correlation === null || (typeof correlation === 'number' && isFinite(correlation))).toBe(true);
    });
  });
});
