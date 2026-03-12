import { describe, it, expect } from 'vitest';
import {
  detectPersonality,
  getMinimumThreshold,
  calculateStdDev,
  calculateInterRatingMinutes,
} from '../../src/services/PersonalityService.js';

const makeInput = (overrides = {}) => ({
  ratings: [3, 3, 3, 3],
  ratingDistribution: { 1: 0, 2: 0, 3: 4, 4: 0 },
  averageRating: 3,
  totalRatings: 4,
  totalItems: 8,
  maxRating: 4,
  noteCount: 0,
  noteLengths: [],
  earliestTimestamp: '2026-01-01T12:00:00Z',
  latestTimestamp: '2026-01-01T13:00:00Z',
  ...overrides,
});

describe('PersonalityService', () => {
  describe('getMinimumThreshold', () => {
    it('returns 3 for 3-item event (clamped to totalItems)', () => {
      expect(getMinimumThreshold(3)).toBe(3);
    });

    it('returns 4 for 8-item event', () => {
      expect(getMinimumThreshold(8)).toBe(4);
    });

    it('returns 5 for 10-item event', () => {
      expect(getMinimumThreshold(10)).toBe(5);
    });

    it('returns 4 for 5-item event (minimum floor)', () => {
      expect(getMinimumThreshold(5)).toBe(4);
    });

    it('returns 1 for 1-item event (clamped to totalItems)', () => {
      expect(getMinimumThreshold(1)).toBe(1);
    });

    it('returns 50 for 100-item event', () => {
      expect(getMinimumThreshold(100)).toBe(50);
    });
  });

  describe('calculateStdDev', () => {
    it('returns 0 for empty array', () => {
      expect(calculateStdDev([])).toBe(0);
    });

    it('returns correct population stddev for [1,2,3,4,5]', () => {
      const stddev = calculateStdDev([1, 2, 3, 4, 5]);
      const mean = 3;
      const variance = ((1 - 3) ** 2 + (2 - 3) ** 2 + (3 - 3) ** 2 + (4 - 3) ** 2 + (5 - 3) ** 2) / 5;
      expect(stddev).toBeCloseTo(Math.sqrt(variance), 5);
      expect(stddev).toBeCloseTo(1.414213562, 4);
    });

    it('returns 0 for single repeated value', () => {
      expect(calculateStdDev([3, 3, 3, 3])).toBe(0);
    });
  });

  describe('calculateInterRatingMinutes', () => {
    it('returns null for single rating (totalRatings <= 1)', () => {
      expect(
        calculateInterRatingMinutes('2026-01-01T12:00:00Z', '2026-01-01T13:00:00Z', 1),
      ).toBe(null);
    });

    it('returns null for totalRatings 0', () => {
      expect(
        calculateInterRatingMinutes('2026-01-01T12:00:00Z', '2026-01-01T13:00:00Z', 0),
      ).toBe(null);
    });

    it('returns correct avg minutes for 4 ratings over 60 minutes', () => {
      const result = calculateInterRatingMinutes(
        '2026-01-01T12:00:00Z',
        '2026-01-01T13:00:00Z',
        4,
      );
      expect(result).toBe(20); // 60 min / 3 gaps
    });

    it('returns ~1.33 min for 4 ratings over 4 minutes (speedrun range)', () => {
      const result = calculateInterRatingMinutes(
        '2026-01-01T12:00:00Z',
        '2026-01-01T12:04:00Z',
        4,
      );
      expect(result).toBeCloseTo(4 / 3, 4);
    });
  });

  describe('Threshold and null below threshold', () => {
    it('returns null when totalRatings < threshold (4 ratings, 10 items → threshold 5)', () => {
      const input = makeInput({ totalItems: 10, totalRatings: 4 });
      expect(detectPersonality(input)).toBe(null);
    });

    it('returns null when totalRatings equals threshold minus 1', () => {
      const input = makeInput({ totalItems: 8, totalRatings: 3 });
      expect(detectPersonality(input)).toBe(null);
    });

    it('passes threshold for 3-item event when totalRatings >= 3', () => {
      const input = makeInput({
        totalItems: 3,
        totalRatings: 3,
        ratings: [1, 2, 3],
        ratingDistribution: { 1: 1, 2: 1, 3: 1 },
      });
      expect(detectPersonality(input)).not.toBe(null);
    });

    it('passes threshold for 8 items when totalRatings >= 4', () => {
      const input = makeInput();
      expect(detectPersonality(input)).not.toBe(null);
    });

    it('passes threshold for 10 items when totalRatings >= 5', () => {
      const input = makeInput({ totalItems: 10, totalRatings: 5, ratings: [3, 3, 3, 3, 3] });
      expect(detectPersonality(input)).not.toBe(null);
    });
  });

  describe('broken-record', () => {
    it('detects when 75%+ of ratings are same value', () => {
      const input = makeInput({
        ratings: [4, 4, 4, 4],
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 4 },
        averageRating: 4,
      });
      expect(detectPersonality(input)).toBe('broken-record');
    });

    it('matches with exactly 75% same value (e.g. 3 of 4)', () => {
      const input = makeInput({
        totalRatings: 4,
        totalItems: 5,
        ratings: [3, 3, 3, 1],
        ratingDistribution: { 1: 1, 2: 0, 3: 3, 4: 0 },
        averageRating: 2.5,
      });
      expect(detectPersonality(input)).toBe('broken-record');
    });
  });

  describe('love-hate-critic', () => {
    it('detects when 70%+ ratings are min or max and <15% middle', () => {
      const input = makeInput({
        totalRatings: 10,
        totalItems: 12,
        ratings: [1, 1, 1, 1, 1, 4, 4, 4, 4, 4],
        ratingDistribution: { 1: 5, 2: 0, 3: 0, 4: 5 },
        averageRating: 2.5,
      });
      expect(detectPersonality(input)).toBe('love-hate-critic');
    });

    it('does not match when middle is >= 15%', () => {
      const input = makeInput({
        totalRatings: 10,
        totalItems: 12,
        ratings: [1, 1, 1, 2, 2, 4, 4, 4, 4, 4],
        ratingDistribution: { 1: 3, 2: 2, 3: 0, 4: 5 },
        averageRating: 2.7,
      });
      expect(detectPersonality(input)).not.toBe('love-hate-critic');
    });
  });

  describe('speedrun', () => {
    it('detects when avg inter-rating < 2 min and rated 75%+ of items', () => {
      // 6 ratings over 6 minutes = 1 min avg; 6/8 = 75%. Use mixed distribution so broken-record (75%+ same) does not match
      const input = makeInput({
        totalRatings: 6,
        totalItems: 8,
        ratings: [3, 4, 3, 4, 3, 4],
        ratingDistribution: { 1: 0, 2: 0, 3: 3, 4: 3 },
        averageRating: 3.5,
        earliestTimestamp: '2026-01-01T12:00:00Z',
        latestTimestamp: '2026-01-01T12:06:00Z',
      });
      expect(detectPersonality(input)).toBe('speedrun');
    });

    it('is excluded when totalRatings <= 1', () => {
      const input = makeInput({
        totalRatings: 1,
        totalItems: 10,
        ratings: [4],
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 1 },
        earliestTimestamp: '2026-01-01T12:00:00Z',
        latestTimestamp: '2026-01-01T12:01:00Z',
      });
      expect(detectPersonality(input)).toBe(null);
    });
  });

  describe('golden-retriever', () => {
    it('detects when averageRating >= maxRating - 0.5', () => {
      const input = makeInput({
        ratings: [4, 4, 3, 3],
        ratingDistribution: { 1: 0, 2: 0, 3: 2, 4: 2 },
        averageRating: 3.5,
      });
      expect(detectPersonality(input)).toBe('golden-retriever');
    });

    it('does not match when averageRating just below threshold', () => {
      const input = makeInput({
        averageRating: 3.4,
        ratings: [3, 3, 4, 3],
        ratingDistribution: { 1: 0, 2: 0, 3: 3, 4: 1 },
      });
      expect(detectPersonality(input)).not.toBe('golden-retriever');
    });
  });

  describe('simon-cowell', () => {
    it('detects when averageRating <= 1 + (maxRating-1)*0.25', () => {
      // For maxRating=4: threshold = 1.75. Use mixed distribution so broken-record does not match
      const input = makeInput({
        ratings: [1, 1, 2, 2],
        ratingDistribution: { 1: 2, 2: 2, 3: 0, 4: 0 },
        averageRating: 1.5,
      });
      expect(detectPersonality(input)).toBe('simon-cowell');
    });
  });

  describe('novelist', () => {
    it('detects when 70%+ have notes and avg note length > 60', () => {
      const input = makeInput({
        noteCount: 4,
        totalRatings: 5,
        totalItems: 6,
        ratings: [2, 3, 4, 3, 2],
        ratingDistribution: { 1: 0, 2: 2, 3: 2, 4: 1 },
        noteLengths: [70, 80, 90, 65],
      });
      expect(detectPersonality(input)).toBe('novelist');
    });

    it('does not match when note ratio < 70%', () => {
      const input = makeInput({
        noteCount: 2,
        totalRatings: 4,
        noteLengths: [100, 100],
      });
      expect(detectPersonality(input)).not.toBe('novelist');
    });

    it('does not match when avg note length <= 60', () => {
      const input = makeInput({
        noteCount: 4,
        totalRatings: 4,
        noteLengths: [50, 50, 50, 50],
      });
      expect(detectPersonality(input)).not.toBe('novelist');
    });
  });

  describe('rollercoaster', () => {
    it('detects when stddev > 35% of range and 3+ distinct values', () => {
      const input = makeInput({
        ratings: [1, 2, 3, 4],
        ratingDistribution: { 1: 1, 2: 1, 3: 1, 4: 1 },
        averageRating: 2.5,
      });
      expect(detectPersonality(input)).toBe('rollercoaster');
    });

    it('is excluded when maxRating <= 2', () => {
      const input = makeInput({
        maxRating: 2,
        totalItems: 4,
        totalRatings: 4,
        ratings: [1, 2, 1, 2],
        ratingDistribution: { 1: 2, 2: 2 },
        averageRating: 1.5,
      });
      expect(detectPersonality(input)).not.toBe('rollercoaster');
    });
  });

  describe('diplomat', () => {
    it('detects when 65%+ middle values and stddev < 20% of range', () => {
      const input = makeInput({
        ratings: [2, 3, 2, 3],
        ratingDistribution: { 1: 0, 2: 2, 3: 2, 4: 0 },
        averageRating: 2.5,
      });
      expect(detectPersonality(input)).toBe('diplomat');
    });

    it('is excluded when maxRating <= 2', () => {
      const input = makeInput({
        maxRating: 2,
        totalItems: 4,
        totalRatings: 4,
        ratings: [1, 2, 1, 2],
        ratingDistribution: { 1: 2, 2: 2 },
      });
      expect(detectPersonality(input)).not.toBe('diplomat');
    });
  });

  describe('ghost', () => {
    it('detects when noteCount === 0 and rated 50%+ of items', () => {
      // Only 2 distinct values so rollercoaster (needs 3+) fails; 50% middle so love-hate fails
      const input = makeInput({
        noteCount: 0,
        totalRatings: 6,
        totalItems: 10,
        ratings: [2, 4, 2, 4, 2, 4],
        ratingDistribution: { 1: 0, 2: 3, 3: 0, 4: 3 },
        averageRating: 3,
      });
      expect(detectPersonality(input)).toBe('ghost');
    });
  });

  describe('philosopher', () => {
    it('detects when avg inter-rating > 8 min and rated 50%+ of items', () => {
      // noteCount>0 to avoid ghost; only 2 distinct to avoid rollercoaster; 30 min/3 = 10 min avg
      const input = makeInput({
        totalRatings: 4,
        totalItems: 6,
        ratings: [2, 4, 2, 4],
        ratingDistribution: { 1: 0, 2: 2, 3: 0, 4: 2 },
        averageRating: 3,
        noteCount: 1,
        noteLengths: [10],
        earliestTimestamp: '2026-01-01T12:00:00Z',
        latestTimestamp: '2026-01-01T12:30:00Z', // 30 min / 3 = 10 min avg
      });
      expect(detectPersonality(input)).toBe('philosopher');
    });

    it('is excluded when totalRatings <= 1', () => {
      const input = makeInput({
        totalRatings: 1,
        totalItems: 10,
        ratings: [4],
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 1 },
      });
      expect(detectPersonality(input)).toBe(null);
    });
  });

  describe('explorer (fallback)', () => {
    it('matches when 2+ distinct values and no other rule matches', () => {
      // [2,4,2,4,3]: 2+ distinct, avoid love-hate (<70% extreme), diplomat (<65% middle),
      // ghost (noteCount>0), philosopher (short span), novelist (<70% notes)
      const input = makeInput({
        ratings: [2, 4, 2, 4, 3],
        ratingDistribution: { 1: 0, 2: 2, 3: 1, 4: 2 },
        averageRating: 3,
        totalRatings: 5,
        totalItems: 10,
        noteCount: 1,
        noteLengths: [10],
        earliestTimestamp: '2026-01-01T12:00:00Z',
        latestTimestamp: '2026-01-01T12:02:00Z',
      });
      expect(detectPersonality(input)).toBe('explorer');
    });

    it('returns null when only 1 distinct value and below threshold', () => {
      const input = makeInput({
        ratings: [2, 2, 2],
        ratingDistribution: { 1: 0, 2: 3, 3: 0, 4: 0 },
        averageRating: 2,
        totalRatings: 3,
        totalItems: 10,
      });
      expect(detectPersonality(input)).toBe(null);
    });
  });

  describe('Priority ordering', () => {
    it('broken-record wins over golden-retriever when both match (all 4s)', () => {
      const input = makeInput({
        ratings: [4, 4, 4, 4],
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 4 },
        averageRating: 4,
      });
      expect(detectPersonality(input)).toBe('broken-record');
    });

    it('love-hate-critic wins over explorer when both match', () => {
      const input = makeInput({
        totalRatings: 10,
        totalItems: 12,
        ratings: [1, 1, 1, 1, 1, 4, 4, 4, 4, 4],
        ratingDistribution: { 1: 5, 2: 0, 3: 0, 4: 5 },
        averageRating: 2.5,
      });
      expect(detectPersonality(input)).toBe('love-hate-critic');
    });
  });

  describe('2-point scale exclusions', () => {
    it('diplomat and rollercoaster excluded when maxRating=2; other rules can match', () => {
      const input = makeInput({
        maxRating: 2,
        totalItems: 4,
        totalRatings: 4,
        ratings: [1, 1, 1, 1],
        ratingDistribution: { 1: 4, 2: 0 },
        averageRating: 1,
      });
      expect(detectPersonality(input)).toBe('broken-record');
    });
  });

  describe('Single-rating speed skip', () => {
    it('speedrun and philosopher excluded when totalRatings=1 (below threshold)', () => {
      const input = makeInput({
        totalRatings: 1,
        totalItems: 10,
        ratings: [4],
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 1 },
      });
      expect(detectPersonality(input)).toBe(null);
    });

    it('speedrun and philosopher excluded when totalRatings=2 with 2-item event', () => {
      const input = makeInput({
        totalRatings: 2,
        totalItems: 2,
        ratings: [4, 4],
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 2 },
        earliestTimestamp: '2026-01-01T12:00:00Z',
        latestTimestamp: '2026-01-01T12:20:00Z',
      });
      expect(detectPersonality(input)).toBe('broken-record');
    });
  });
});
