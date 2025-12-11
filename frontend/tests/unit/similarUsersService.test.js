import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSimilarUsers } from '../../src/services/similarUsersService.js';
import apiClient from '../../src/services/apiClient.js';

// Mock API client
vi.mock('../../src/services/apiClient.js', () => ({
  default: {
    get: vi.fn()
  }
}));

describe('similarUsersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSimilarUsers', () => {
    it('should fetch and return similar users', async () => {
      const eventId = 'testEvent';
      const mockResponse = {
        similarUsers: [
          {
            email: 'similar@example.com',
            name: 'Alice Smith',
            similarityScore: 0.87,
            commonItemsCount: 12,
            commonItems: [
              { itemId: 1, userRating: 4, similarUserRating: 4 }
            ]
          }
        ],
        currentUserEmail: 'user@example.com',
        eventId
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await getSimilarUsers(eventId);

      expect(apiClient.get).toHaveBeenCalledWith(`/events/${eventId}/similar-users`);
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty similar users list', async () => {
      const eventId = 'testEvent';
      const mockResponse = {
        similarUsers: [],
        currentUserEmail: 'user@example.com',
        eventId
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await getSimilarUsers(eventId);

      expect(result.similarUsers).toEqual([]);
    });

    it('should handle API errors', async () => {
      const eventId = 'testEvent';
      const errorMessage = 'You need to rate at least 3 items before similar users can be found';

      apiClient.get.mockRejectedValue(new Error(errorMessage));

      await expect(getSimilarUsers(eventId)).rejects.toThrow(errorMessage);
    });

    it('should handle 400 error (insufficient ratings)', async () => {
      const eventId = 'testEvent';
      const error = new Error('You need to rate at least 3 items before similar users can be found');
      error.status = 400;

      apiClient.get.mockRejectedValue(error);

      await expect(getSimilarUsers(eventId)).rejects.toThrow();
    });

    it('should handle 404 error (event not found)', async () => {
      const eventId = 'nonexistent';
      const error = new Error('Event not found');
      error.status = 404;

      apiClient.get.mockRejectedValue(error);

      await expect(getSimilarUsers(eventId)).rejects.toThrow('Event not found');
    });

    it('should handle 500 error (server error)', async () => {
      const eventId = 'testEvent';
      const error = new Error('Failed to retrieve similar users. Please try again.');
      error.status = 500;

      apiClient.get.mockRejectedValue(error);

      await expect(getSimilarUsers(eventId)).rejects.toThrow();
    });

    it('should return maximum 5 similar users', async () => {
      const eventId = 'testEvent';
      const mockResponse = {
        similarUsers: Array.from({ length: 5 }, (_, i) => ({
          email: `user${i}@example.com`,
          name: null,
          similarityScore: 0.8 - i * 0.1,
          commonItemsCount: 10,
          commonItems: []
        })),
        currentUserEmail: 'user@example.com',
        eventId
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await getSimilarUsers(eventId);

      expect(result.similarUsers.length).toBeLessThanOrEqual(5);
    });
  });
});
