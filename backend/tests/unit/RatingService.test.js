import { describe, it, expect, beforeEach, vi } from 'vitest';
import ratingService from '../../src/services/RatingService.js';
import eventService from '../../src/services/EventService.js';
import eventConfigService from '../../src/services/EventConfigService.js';
import dataRepository from '../../src/data/DynamoDBRepository.js';

// Mock dependencies
vi.mock('../../src/services/EventService.js', () => ({
  default: {
    getEvent: vi.fn()
  }
}));

vi.mock('../../src/services/EventConfigService.js', () => ({
  default: {
    getItemConfiguration: vi.fn(),
    getRatingConfiguration: vi.fn()
  }
}));

vi.mock('../../src/data/DynamoDBRepository.js', () => ({
  default: {
    getRatings: vi.fn(),
    getRating: vi.fn(),
    getUserRatings: vi.fn(),
    addRating: vi.fn(),
    deleteRating: vi.fn(),
    deleteAllRatings: vi.fn()
  }
}));

vi.mock('../../src/logging/Logger.js', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

const VALID_EVENT_ID = 'ABCD1234';
const VALID_EMAIL = 'user@example.com';

function mockStartedEvent() {
  return { state: 'started', eventId: VALID_EVENT_ID };
}

describe('RatingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRatings', () => {
    it('should return ratings from repository', async () => {
      const ratings = [
        { email: 'a@b.com', itemId: 1, rating: 3 },
        { email: 'c@d.com', itemId: 2, rating: 4 }
      ];
      dataRepository.getRatings.mockResolvedValue(ratings);

      const result = await ratingService.getRatings(VALID_EVENT_ID);
      expect(result).toEqual(ratings);
      expect(dataRepository.getRatings).toHaveBeenCalledWith(VALID_EVENT_ID);
    });

    it('should propagate repository errors', async () => {
      dataRepository.getRatings.mockRejectedValue(new Error('DB error'));
      await expect(ratingService.getRatings(VALID_EVENT_ID)).rejects.toThrow('DB error');
    });
  });

  describe('getRating', () => {
    it('should return a specific rating', async () => {
      const rating = { email: VALID_EMAIL, itemId: 1, rating: 4, note: '' };
      dataRepository.getRating.mockResolvedValue(rating);

      const result = await ratingService.getRating(VALID_EVENT_ID, 1, VALID_EMAIL);
      expect(result).toEqual(rating);
      expect(dataRepository.getRating).toHaveBeenCalledWith(VALID_EVENT_ID, VALID_EMAIL, 1);
    });

    it('should return null when rating does not exist', async () => {
      dataRepository.getRating.mockResolvedValue(null);
      const result = await ratingService.getRating(VALID_EVENT_ID, 99, VALID_EMAIL);
      expect(result).toBeNull();
    });
  });

  describe('getUserRatings', () => {
    it('should return all ratings for a user', async () => {
      const ratings = [
        { email: VALID_EMAIL, itemId: 1, rating: 3 },
        { email: VALID_EMAIL, itemId: 2, rating: 4 }
      ];
      dataRepository.getUserRatings.mockResolvedValue(ratings);

      const result = await ratingService.getUserRatings(VALID_EVENT_ID, VALID_EMAIL);
      expect(result).toEqual(ratings);
    });
  });

  describe('submitRating', () => {
    beforeEach(() => {
      eventConfigService.getItemConfiguration.mockResolvedValue({
        numberOfItems: 10,
        excludedItemIds: []
      });
      eventConfigService.getRatingConfiguration.mockResolvedValue({
        maxRating: 4
      });
      dataRepository.addRating.mockResolvedValue();
    });

    it('should submit a valid rating with preloaded event', async () => {
      const event = mockStartedEvent();
      const result = await ratingService.submitRating(VALID_EVENT_ID, 1, 4, 'Great!', VALID_EMAIL, event);

      expect(result).toMatchObject({
        email: VALID_EMAIL,
        itemId: 1,
        rating: 4,
        note: 'Great!'
      });
      expect(result.timestamp).toBeDefined();
      expect(dataRepository.addRating).toHaveBeenCalledWith(VALID_EVENT_ID, expect.objectContaining({
        email: VALID_EMAIL,
        itemId: 1,
        rating: 4
      }));
    });

    it('should fetch event when preloaded event is not provided', async () => {
      eventService.getEvent.mockResolvedValue(mockStartedEvent());
      await ratingService.submitRating(VALID_EVENT_ID, 1, 3, '', VALID_EMAIL);
      expect(eventService.getEvent).toHaveBeenCalledWith(VALID_EVENT_ID);
    });

    it('should reject rating when event is not started', async () => {
      const event = { state: 'created', eventId: VALID_EVENT_ID };
      await expect(
        ratingService.submitRating(VALID_EVENT_ID, 1, 3, '', VALID_EMAIL, event)
      ).rejects.toThrow('Event is not in started state');
    });

    it('should reject rating when event is completed', async () => {
      const event = { state: 'completed', eventId: VALID_EVENT_ID };
      await expect(
        ratingService.submitRating(VALID_EVENT_ID, 1, 3, '', VALID_EMAIL, event)
      ).rejects.toThrow('Event is not in started state');
    });

    it('should trim note whitespace', async () => {
      const event = mockStartedEvent();
      const result = await ratingService.submitRating(VALID_EVENT_ID, 1, 3, '  nice wine  ', VALID_EMAIL, event);
      expect(result.note).toBe('nice wine');
    });

    it('should handle empty note as empty string', async () => {
      const event = mockStartedEvent();
      const result = await ratingService.submitRating(VALID_EVENT_ID, 1, 3, null, VALID_EMAIL, event);
      expect(result.note).toBe('');
    });

    it('should store itemId and rating as integers', async () => {
      const event = mockStartedEvent();
      const result = await ratingService.submitRating(VALID_EVENT_ID, 3, 2, '', VALID_EMAIL, event);
      expect(result.itemId).toBe(3);
      expect(typeof result.itemId).toBe('number');
      expect(result.rating).toBe(2);
      expect(typeof result.rating).toBe('number');
    });

    it('should normalize email to lowercase', async () => {
      const event = mockStartedEvent();
      const result = await ratingService.submitRating(VALID_EVENT_ID, 1, 3, '', 'User@Example.COM', event);
      expect(result.email).toBe('user@example.com');
    });

    it('should propagate repository errors', async () => {
      const event = mockStartedEvent();
      dataRepository.addRating.mockRejectedValue(new Error('Write failed'));
      await expect(
        ratingService.submitRating(VALID_EVENT_ID, 1, 3, '', VALID_EMAIL, event)
      ).rejects.toThrow('Write failed');
    });
  });

  describe('validateRatingInputAsync', () => {
    const event = mockStartedEvent();

    beforeEach(() => {
      eventConfigService.getItemConfiguration.mockResolvedValue({
        numberOfItems: 10,
        excludedItemIds: [5]
      });
      eventConfigService.getRatingConfiguration.mockResolvedValue({
        maxRating: 4
      });
    });

    it('should reject invalid email', async () => {
      await expect(
        ratingService.validateRatingInputAsync(VALID_EVENT_ID, 1, 3, '', 'not-an-email', event)
      ).rejects.toThrow('Valid email is required');
    });

    it('should reject itemId below 1', async () => {
      await expect(
        ratingService.validateRatingInputAsync(VALID_EVENT_ID, 0, 3, '', VALID_EMAIL, event)
      ).rejects.toThrow('Invalid item ID');
    });

    it('should reject itemId above numberOfItems', async () => {
      await expect(
        ratingService.validateRatingInputAsync(VALID_EVENT_ID, 11, 3, '', VALID_EMAIL, event)
      ).rejects.toThrow('Invalid item ID');
    });

    it('should reject non-integer itemId', async () => {
      await expect(
        ratingService.validateRatingInputAsync(VALID_EVENT_ID, 1.5, 3, '', VALID_EMAIL, event)
      ).rejects.toThrow('Invalid item ID');
    });

    it('should reject excluded item', async () => {
      await expect(
        ratingService.validateRatingInputAsync(VALID_EVENT_ID, 5, 3, '', VALID_EMAIL, event)
      ).rejects.toThrow('Item 5 is excluded');
    });

    it('should reject rating below 1', async () => {
      await expect(
        ratingService.validateRatingInputAsync(VALID_EVENT_ID, 1, 0, '', VALID_EMAIL, event)
      ).rejects.toThrow('Rating must be between 1 and 4');
    });

    it('should reject rating above maxRating', async () => {
      await expect(
        ratingService.validateRatingInputAsync(VALID_EVENT_ID, 1, 5, '', VALID_EMAIL, event)
      ).rejects.toThrow('Rating must be between 1 and 4');
    });

    it('should reject non-integer rating', async () => {
      await expect(
        ratingService.validateRatingInputAsync(VALID_EVENT_ID, 1, 2.5, '', VALID_EMAIL, event)
      ).rejects.toThrow('Rating must be between 1 and 4');
    });

    it('should reject note exceeding 500 characters', async () => {
      const longNote = 'x'.repeat(501);
      await expect(
        ratingService.validateRatingInputAsync(VALID_EVENT_ID, 1, 3, longNote, VALID_EMAIL, event)
      ).rejects.toThrow('Note must not exceed 500 characters');
    });

    it('should accept note at exactly 500 characters', async () => {
      const note = 'x'.repeat(500);
      await expect(
        ratingService.validateRatingInputAsync(VALID_EVENT_ID, 1, 3, note, VALID_EMAIL, event)
      ).resolves.toBeUndefined();
    });

    it('should accept valid inputs', async () => {
      await expect(
        ratingService.validateRatingInputAsync(VALID_EVENT_ID, 1, 4, 'Good stuff', VALID_EMAIL, event)
      ).resolves.toBeUndefined();
    });
  });

  describe('deleteRating', () => {
    beforeEach(() => {
      eventConfigService.getItemConfiguration.mockResolvedValue({
        numberOfItems: 10,
        excludedItemIds: []
      });
    });

    it('should delete an existing rating and return true', async () => {
      const event = mockStartedEvent();
      dataRepository.getRating.mockResolvedValue({ email: VALID_EMAIL, itemId: 1, rating: 3 });
      dataRepository.deleteRating.mockResolvedValue();

      const result = await ratingService.deleteRating(VALID_EVENT_ID, 1, VALID_EMAIL, event);
      expect(result).toBe(true);
      expect(dataRepository.deleteRating).toHaveBeenCalledWith(VALID_EVENT_ID, VALID_EMAIL, 1);
    });

    it('should return false when rating does not exist', async () => {
      const event = mockStartedEvent();
      dataRepository.getRating.mockResolvedValue(null);

      const result = await ratingService.deleteRating(VALID_EVENT_ID, 1, VALID_EMAIL, event);
      expect(result).toBe(false);
      expect(dataRepository.deleteRating).not.toHaveBeenCalled();
    });

    it('should reject when event is not started', async () => {
      const event = { state: 'completed', eventId: VALID_EVENT_ID };
      await expect(
        ratingService.deleteRating(VALID_EVENT_ID, 1, VALID_EMAIL, event)
      ).rejects.toThrow('Event is not in started state');
    });

    it('should reject invalid email', async () => {
      const event = mockStartedEvent();
      await expect(
        ratingService.deleteRating(VALID_EVENT_ID, 1, 'bad', event)
      ).rejects.toThrow('Valid email is required');
    });

    it('should reject invalid itemId', async () => {
      const event = mockStartedEvent();
      await expect(
        ratingService.deleteRating(VALID_EVENT_ID, 0, VALID_EMAIL, event)
      ).rejects.toThrow('Invalid item ID');
    });

    it('should fetch event when preloaded event not provided', async () => {
      eventService.getEvent.mockResolvedValue(mockStartedEvent());
      dataRepository.getRating.mockResolvedValue({ email: VALID_EMAIL, itemId: 1, rating: 3 });
      dataRepository.deleteRating.mockResolvedValue();

      await ratingService.deleteRating(VALID_EVENT_ID, 1, VALID_EMAIL);
      expect(eventService.getEvent).toHaveBeenCalledWith(VALID_EVENT_ID);
    });
  });

  describe('deleteAllRatings', () => {
    it('should delete all ratings for an event', async () => {
      dataRepository.deleteAllRatings.mockResolvedValue();
      await ratingService.deleteAllRatings(VALID_EVENT_ID);
      expect(dataRepository.deleteAllRatings).toHaveBeenCalledWith(VALID_EVENT_ID);
    });

    it('should propagate repository errors', async () => {
      dataRepository.deleteAllRatings.mockRejectedValue(new Error('Delete failed'));
      await expect(ratingService.deleteAllRatings(VALID_EVENT_ID)).rejects.toThrow('Delete failed');
    });
  });

  describe('invalidateCache', () => {
    it('should be a no-op (deprecated)', () => {
      expect(() => ratingService.invalidateCache()).not.toThrow();
    });
  });
});
