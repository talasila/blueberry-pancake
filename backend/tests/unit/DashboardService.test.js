import { describe, it, expect, beforeEach, vi } from 'vitest';
import dashboardService from '../../src/services/DashboardService.js';
import { detectPersonality } from '../../src/services/PersonalityService.js';

vi.mock('../../src/services/EventService.js', () => ({
  default: { getEvent: vi.fn(), updateEvent: vi.fn().mockResolvedValue(undefined) }
}));
vi.mock('../../src/services/RatingService.js', () => ({
  default: { getRatings: vi.fn() }
}));
vi.mock('../../src/data/DynamoDBRepository.js', () => ({
  default: {
    getDashboardCache: vi.fn().mockResolvedValue(null),
    setDashboardCache: vi.fn().mockResolvedValue(true)
  }
}));
vi.mock('../../src/logging/Logger.js', () => ({
  default: {
    debug: vi.fn().mockResolvedValue(undefined),
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined)
  }
}));
vi.mock('../../src/services/PersonalityService.js', () => ({
  detectPersonality: vi.fn()
}));

describe('DashboardService', () => {
  describe('calculateUserSummaries', () => {
    const baseEvent = {
      eventId: 'TESTEVNT',
      typeOfItem: 'wine',
      users: { 'user1@test.com': { name: 'User1' }, 'user2@test.com': { name: 'User2' } },
      itemConfiguration: { numberOfItems: 8, excludedItemIds: [] },
      ratingConfiguration: { maxRating: 4 }
    };

    const baseRatings = [
      { email: 'user1@test.com', itemId: '1', rating: '4', note: 'Great wine', timestamp: '2026-01-01T12:00:00Z' },
      { email: 'user1@test.com', itemId: '2', rating: '4', note: '', timestamp: '2026-01-01T12:01:00Z' },
      { email: 'user1@test.com', itemId: '3', rating: '3', note: '', timestamp: '2026-01-01T12:02:00Z' },
      { email: 'user1@test.com', itemId: '4', rating: '4', note: 'Nice', timestamp: '2026-01-01T12:03:00Z' },
      { email: 'user2@test.com', itemId: '1', rating: '1', note: '', timestamp: '2026-01-01T12:00:00Z' }
    ];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('includes noteCount in summaries', async () => {
      const event = JSON.parse(JSON.stringify(baseEvent));
      const result = await dashboardService.calculateUserSummaries(event, baseRatings, 8);

      const user1 = result.find(s => s.name === 'User1');
      const user2 = result.find(s => s.name === 'User2');

      expect(user1.noteCount).toBe(2); // 'Great wine' and 'Nice'
      expect(user2.noteCount).toBe(0);
      // Summaries should have userId, not email
      expect(user1.userId).toBeDefined();
      expect(user1.email).toBeUndefined();
    });

    it('includes personality field for wine events when detectPersonality is mocked', async () => {
      detectPersonality
        .mockReturnValueOnce('golden-retriever')
        .mockReturnValueOnce(null);

      const event = JSON.parse(JSON.stringify(baseEvent));
      const result = await dashboardService.calculateUserSummaries(event, baseRatings, 8);

      const user1 = result.find(s => s.name === 'User1');
      const user2 = result.find(s => s.name === 'User2');

      expect(user1.personality).toBe('golden-retriever');
      expect(user2.personality).toBe(null);
    });

    it('sets personality to null for non-wine events and does not call detectPersonality', async () => {
      const event = { ...JSON.parse(JSON.stringify(baseEvent)), typeOfItem: 'beer' };

      const result = await dashboardService.calculateUserSummaries(event, baseRatings, 8);

      expect(result.every(s => s.personality === null)).toBe(true);
      expect(detectPersonality).not.toHaveBeenCalled();
    });

    it('passes correct input to detectPersonality', async () => {
      const capturedInputs = [];
      detectPersonality.mockImplementation((input) => {
        capturedInputs.push(input);
        return null;
      });

      const event = JSON.parse(JSON.stringify(baseEvent));
      await dashboardService.calculateUserSummaries(event, baseRatings, 8);

      expect(capturedInputs.length).toBeGreaterThanOrEqual(1);
      const input = capturedInputs[0];

      expect(input).toMatchObject({
        totalItems: 8,
        maxRating: 4,
        noteCount: 2,
        earliestTimestamp: '2026-01-01T12:00:00Z',
        latestTimestamp: '2026-01-01T12:03:00Z'
      });
      expect(Array.isArray(input.ratings)).toBe(true);
      expect(input.ratings.every(n => typeof n === 'number')).toBe(true);
      expect(typeof input.ratingDistribution).toBe('object');
      expect(typeof input.averageRating).toBe('number');
      expect(typeof input.totalRatings).toBe('number');
      expect(Array.isArray(input.noteLengths)).toBe(true);
      expect(input.noteLengths).toEqual([10, 4]); // 'Great wine'.length, 'Nice'.length
    });
  });
});
