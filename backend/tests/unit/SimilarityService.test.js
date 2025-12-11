import { describe, it, expect, beforeEach, vi } from 'vitest';
import similarityService from '../../../src/services/SimilarityService.js';
import ratingService from '../../../src/services/RatingService.js';
import eventService from '../../../src/services/EventService.js';
import cacheService from '../../../src/cache/CacheService.js';

// Mock dependencies
vi.mock('../../../src/services/RatingService.js', () => ({
  default: {
    getRatings: vi.fn()
  }
}));

vi.mock('../../../src/services/EventService.js', () => ({
  default: {
    getEvent: vi.fn()
  }
}));

vi.mock('../../../src/cache/CacheService.js', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn()
  }
}));

describe('SimilarityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findSimilarUsers', () => {
    it('should return empty array when current user has fewer than 3 ratings', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      
      ratingService.getRatings.mockResolvedValue([
        { email: 'user@example.com', itemId: 1, rating: 4 },
        { email: 'user@example.com', itemId: 2, rating: 5 }
      ]);

      const result = await similarityService.findSimilarUsers(eventId, currentUserEmail);
      expect(result).toEqual([]);
    });

    it('should return empty array when no other users have 3+ common items', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      
      ratingService.getRatings.mockResolvedValue([
        { email: 'user@example.com', itemId: 1, rating: 4 },
        { email: 'user@example.com', itemId: 2, rating: 5 },
        { email: 'user@example.com', itemId: 3, rating: 3 },
        { email: 'other@example.com', itemId: 4, rating: 4 },
        { email: 'other@example.com', itemId: 5, rating: 5 }
      ]);

      const result = await similarityService.findSimilarUsers(eventId, currentUserEmail);
      expect(result).toEqual([]);
    });

    it('should find similar users with 3+ common items', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      
      ratingService.getRatings.mockResolvedValue([
        { email: 'user@example.com', itemId: 1, rating: 4 },
        { email: 'user@example.com', itemId: 2, rating: 5 },
        { email: 'user@example.com', itemId: 3, rating: 3 },
        { email: 'similar@example.com', itemId: 1, rating: 4 },
        { email: 'similar@example.com', itemId: 2, rating: 5 },
        { email: 'similar@example.com', itemId: 3, rating: 3 }
      ]);

      const result = await similarityService.findSimilarUsers(eventId, currentUserEmail);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].email).toBe('similar@example.com');
      expect(result[0].similarityScore).toBeCloseTo(1.0, 5);
      expect(result[0].commonItemsCount).toBe(3);
    });

    it('should return maximum 5 similar users', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      
      const ratings = [
        { email: 'user@example.com', itemId: 1, rating: 4 },
        { email: 'user@example.com', itemId: 2, rating: 5 },
        { email: 'user@example.com', itemId: 3, rating: 3 }
      ];

      // Add 7 similar users
      for (let i = 1; i <= 7; i++) {
        ratings.push(
          { email: `user${i}@example.com`, itemId: 1, rating: 4 },
          { email: `user${i}@example.com`, itemId: 2, rating: 5 },
          { email: `user${i}@example.com`, itemId: 3, rating: 3 }
        );
      }

      ratingService.getRatings.mockResolvedValue(ratings);

      const result = await similarityService.findSimilarUsers(eventId, currentUserEmail);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should sort users by similarity score (descending)', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      
      ratingService.getRatings.mockResolvedValue([
        { email: 'user@example.com', itemId: 1, rating: 4 },
        { email: 'user@example.com', itemId: 2, rating: 5 },
        { email: 'user@example.com', itemId: 3, rating: 3 },
        { email: 'high@example.com', itemId: 1, rating: 4 },
        { email: 'high@example.com', itemId: 2, rating: 5 },
        { email: 'high@example.com', itemId: 3, rating: 3 },
        { email: 'low@example.com', itemId: 1, rating: 1 },
        { email: 'low@example.com', itemId: 2, rating: 2 },
        { email: 'low@example.com', itemId: 3, rating: 1 }
      ]);

      const result = await similarityService.findSimilarUsers(eventId, currentUserEmail);
      expect(result.length).toBe(2);
      expect(result[0].similarityScore).toBeGreaterThan(result[1].similarityScore);
    });

    it('should break ties by common items count (descending), then alphabetically', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      
      ratingService.getRatings.mockResolvedValue([
        { email: 'user@example.com', itemId: 1, rating: 4 },
        { email: 'user@example.com', itemId: 2, rating: 5 },
        { email: 'user@example.com', itemId: 3, rating: 3 },
        { email: 'alice@example.com', itemId: 1, rating: 4 },
        { email: 'alice@example.com', itemId: 2, rating: 5 },
        { email: 'alice@example.com', itemId: 3, rating: 3 },
        { email: 'bob@example.com', itemId: 1, rating: 4 },
        { email: 'bob@example.com', itemId: 2, rating: 5 },
        { email: 'bob@example.com', itemId: 3, rating: 3 }
      ]);

      const result = await similarityService.findSimilarUsers(eventId, currentUserEmail);
      // Both have same similarity and common items count, should be sorted alphabetically
      if (result.length >= 2) {
        expect(result[0].email.localeCompare(result[1].email)).toBeLessThanOrEqual(0);
      }
    });

    it('should exclude users with null correlation scores', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      
      ratingService.getRatings.mockResolvedValue([
        { email: 'user@example.com', itemId: 1, rating: 4 },
        { email: 'user@example.com', itemId: 2, rating: 5 },
        { email: 'user@example.com', itemId: 3, rating: 3 },
        { email: 'novariance@example.com', itemId: 1, rating: 4 },
        { email: 'novariance@example.com', itemId: 2, rating: 4 },
        { email: 'novariance@example.com', itemId: 3, rating: 4 }
      ]);

      const result = await similarityService.findSimilarUsers(eventId, currentUserEmail);
      // User with no variance should be excluded
      expect(result.find(u => u.email === 'novariance@example.com')).toBeUndefined();
    });

    it('should use cache when available', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      const cacheKey = `similarUsers:${eventId}:${currentUserEmail}`;
      
      const cachedResult = [
        { email: 'cached@example.com', similarityScore: 0.9, commonItemsCount: 5 }
      ];
      
      cacheService.get.mockReturnValue(cachedResult);

      const result = await similarityService.findSimilarUsers(eventId, currentUserEmail);
      expect(result).toEqual(cachedResult);
      expect(ratingService.getRatings).not.toHaveBeenCalled();
    });

    it('should cache results after calculation', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      const cacheKey = `similarUsers:${eventId}:${currentUserEmail}`;
      
      cacheService.get.mockReturnValue(undefined);
      ratingService.getRatings.mockResolvedValue([
        { email: 'user@example.com', itemId: 1, rating: 4 },
        { email: 'user@example.com', itemId: 2, rating: 5 },
        { email: 'user@example.com', itemId: 3, rating: 3 },
        { email: 'similar@example.com', itemId: 1, rating: 4 },
        { email: 'similar@example.com', itemId: 2, rating: 5 },
        { email: 'similar@example.com', itemId: 3, rating: 3 }
      ]);

      await similarityService.findSimilarUsers(eventId, currentUserEmail);
      expect(cacheService.set).toHaveBeenCalledWith(cacheKey, expect.any(Array), 30);
    });

    it('should include common items in response', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      
      ratingService.getRatings.mockResolvedValue([
        { email: 'user@example.com', itemId: 1, rating: 4 },
        { email: 'user@example.com', itemId: 2, rating: 5 },
        { email: 'user@example.com', itemId: 3, rating: 3 },
        { email: 'similar@example.com', itemId: 1, rating: 4 },
        { email: 'similar@example.com', itemId: 2, rating: 5 },
        { email: 'similar@example.com', itemId: 3, rating: 3 }
      ]);

      const result = await similarityService.findSimilarUsers(eventId, currentUserEmail);
      expect(result[0].commonItems).toBeDefined();
      expect(result[0].commonItems.length).toBe(3);
      expect(result[0].commonItems[0]).toHaveProperty('itemId');
      expect(result[0].commonItems[0]).toHaveProperty('userRating');
      expect(result[0].commonItems[0]).toHaveProperty('similarUserRating');
    });

    it('should handle empty results gracefully', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      
      ratingService.getRatings.mockResolvedValue([
        { email: 'user@example.com', itemId: 1, rating: 4 },
        { email: 'user@example.com', itemId: 2, rating: 5 },
        { email: 'user@example.com', itemId: 3, rating: 3 }
      ]);

      const result = await similarityService.findSimilarUsers(eventId, currentUserEmail);
      expect(result).toEqual([]);
    });

    it('should handle calculation failures gracefully', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      
      ratingService.getRatings.mockRejectedValue(new Error('Database error'));

      await expect(similarityService.findSimilarUsers(eventId, currentUserEmail)).rejects.toThrow('Database error');
    });

    it('should handle tie-breaking correctly with multiple users having identical scores', async () => {
      const eventId = 'testEvent';
      const currentUserEmail = 'user@example.com';
      
      // Create 3 users with identical similarity scores but different common items counts
      ratingService.getRatings.mockResolvedValue([
        { email: 'user@example.com', itemId: 1, rating: 4 },
        { email: 'user@example.com', itemId: 2, rating: 5 },
        { email: 'user@example.com', itemId: 3, rating: 3 },
        // User A: 3 common items, perfect match
        { email: 'usera@example.com', itemId: 1, rating: 4 },
        { email: 'usera@example.com', itemId: 2, rating: 5 },
        { email: 'usera@example.com', itemId: 3, rating: 3 },
        // User B: 4 common items, perfect match (should rank higher)
        { email: 'userb@example.com', itemId: 1, rating: 4 },
        { email: 'userb@example.com', itemId: 2, rating: 5 },
        { email: 'userb@example.com', itemId: 3, rating: 3 },
        { email: 'userb@example.com', itemId: 4, rating: 4 }
      ]);

      const result = await similarityService.findSimilarUsers(eventId, currentUserEmail, 5);
      // User B should rank higher due to more common items
      expect(result[0].email).toBe('userb@example.com');
      expect(result[0].commonItemsCount).toBe(4);
    });
  });

  describe('getCommonItems', () => {
    it('should return common items between two users', () => {
      const user1Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 3, rating: 3 }
      ];
      const user2Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 },
        { itemId: 4, rating: 2 }
      ];

      const commonItems = similarityService.getCommonItems(user1Ratings, user2Ratings);
      expect(commonItems.length).toBe(2);
      expect(commonItems[0].itemId).toBe(1);
      expect(commonItems[1].itemId).toBe(2);
    });

    it('should return empty array when no common items', () => {
      const user1Ratings = [
        { itemId: 1, rating: 4 },
        { itemId: 2, rating: 5 }
      ];
      const user2Ratings = [
        { itemId: 3, rating: 4 },
        { itemId: 4, rating: 5 }
      ];

      const commonItems = similarityService.getCommonItems(user1Ratings, user2Ratings);
      expect(commonItems).toEqual([]);
    });
  });
});
