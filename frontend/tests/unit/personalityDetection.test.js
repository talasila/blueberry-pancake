import { describe, it, expect } from 'vitest';
import {
  detectPersonality,
  getMinimumThreshold,
  calculateStdDev,
  calculateInterRatingMinutes,
} from '../../src/utils/personalityDetection.js';

function makeInput(overrides = {}) {
  const defaults = {
    ratings: [1, 2, 3, 4, 5, 5, 5, 5],
    ratingDistribution: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 4 },
    averageRating: 3.75,
    totalRatings: 8,
    totalItems: 10,
    maxRating: 5,
    noteCount: 0,
    noteLengths: [],
    earliestTimestamp: '2024-01-01T10:00:00Z',
    latestTimestamp: '2024-01-01T11:00:00Z',
  };
  return { ...defaults, ...overrides };
}

describe('personalityDetection', () => {
  describe('getMinimumThreshold', () => {
    it('returns min(max(4, ceil(totalItems*0.5)), totalItems)', () => {
      expect(getMinimumThreshold(10)).toBe(5);
      expect(getMinimumThreshold(3)).toBe(3);
    });
  });

  describe('calculateStdDev', () => {
    it('returns 0 for empty or identical ratings, computes correctly for varying', () => {
      expect(calculateStdDev([])).toBe(0);
      expect(calculateStdDev([5, 5, 5])).toBe(0);
      expect(calculateStdDev([1, 5])).toBeCloseTo(2, 5);
    });
  });

  describe('calculateInterRatingMinutes', () => {
    it('returns null when totalRatings<=1 or timestamps missing, else computes avg gap', () => {
      expect(calculateInterRatingMinutes('2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z', 1)).toBe(null);
      expect(calculateInterRatingMinutes(null, '2024-01-01T11:00:00Z', 5)).toBe(null);
      expect(calculateInterRatingMinutes('2024-01-01T10:00:00Z', '2024-01-01T10:14:00Z', 8)).toBeCloseTo(2, 1);
    });
  });

  describe('detectPersonality', () => {
    it('returns null when below threshold', () => {
      expect(detectPersonality(makeInput({ totalRatings: 2, totalItems: 10 }))).toBe(null);
      expect(detectPersonality(makeInput({ totalRatings: 4, totalItems: 10 }))).toBe(null);
    });

    it('detects broken-record when 75%+ same value', () => {
      const input = makeInput({
        ratings: [5, 5, 5, 5, 5, 5, 4, 3],
        ratingDistribution: { 3: 1, 4: 1, 5: 6 },
        averageRating: 4.625,
        totalRatings: 8,
      });
      expect(detectPersonality(input)).toBe('broken-record');
    });

    it('detects love-hate-critic when 70%+ extremes and <15% middle', () => {
      const input = makeInput({
        ratings: [1, 1, 1, 1, 5, 5, 5, 5],
        ratingDistribution: { 1: 4, 5: 4 },
        averageRating: 3,
        totalRatings: 8,
      });
      expect(detectPersonality(input)).toBe('love-hate-critic');
    });

    it('detects speedrun when avg inter-rating < 2min and 75%+ rated', () => {
      const input = makeInput({
        earliestTimestamp: '2024-01-01T10:00:00Z',
        latestTimestamp: '2024-01-01T10:10:00Z',
        totalRatings: 8,
        totalItems: 10,
      });
      expect(detectPersonality(input)).toBe('speedrun');
    });

    it('detects golden-retriever when avg >= maxRating - 0.5', () => {
      const input = makeInput({
        ratings: [4, 4, 5, 5, 5, 5],
        ratingDistribution: { 4: 2, 5: 4 },
        averageRating: 4.67,
        totalRatings: 6,
        totalItems: 8,
      });
      expect(detectPersonality(input)).toBe('golden-retriever');
    });

    it('detects simon-cowell when avg <= 1 + (maxRating-1)*0.25', () => {
      const input = makeInput({
        ratings: [1, 1, 2, 1, 2, 1],
        ratingDistribution: { 1: 4, 2: 2 },
        averageRating: 1.33,
        totalRatings: 6,
        totalItems: 8,
      });
      expect(detectPersonality(input)).toBe('simon-cowell');
    });

    it('detects novelist when 70%+ notes and avg note length > 60', () => {
      const input = makeInput({
        noteCount: 7,
        noteLengths: [70, 70, 70, 70, 70, 70, 70],
        totalRatings: 8,
      });
      expect(detectPersonality(input)).toBe('novelist');
    });

    it('detects rollercoaster when stddev > 35% of range and 3+ distinct values', () => {
      const input = makeInput({
        ratings: [1, 2, 5, 1, 2, 5, 1, 2],
        ratingDistribution: { 1: 3, 2: 3, 5: 2 },
        averageRating: 2.375,
        totalRatings: 8,
        maxRating: 5,
      });
      expect(detectPersonality(input)).toBe('rollercoaster');
    });

    it('detects diplomat when 65%+ middle and stddev < 20% of range', () => {
      const input = makeInput({
        ratings: [2, 2, 3, 3, 3, 4, 4, 4],
        ratingDistribution: { 2: 2, 3: 3, 4: 3 },
        averageRating: 3.125,
        totalRatings: 8,
        maxRating: 5,
      });
      expect(detectPersonality(input)).toBe('diplomat');
    });

    it('detects ghost when no notes and 50%+ rated', () => {
      const input = makeInput({
        ratings: [2, 2, 2, 2, 4, 4, 4, 4],
        ratingDistribution: { 2: 4, 4: 4 },
        noteCount: 0,
        totalRatings: 8,
        totalItems: 10,
      });
      expect(detectPersonality(input)).toBe('ghost');
    });

    it('detects philosopher when avg time > 8min and 50%+ rated', () => {
      const input = makeInput({
        ratings: [1, 4, 1, 4, 1, 4, 1, 4],
        ratingDistribution: { 1: 4, 4: 4 },
        noteCount: 1,
        noteLengths: [5],
        earliestTimestamp: '2024-01-01T10:00:00Z',
        latestTimestamp: '2024-01-01T12:00:00Z',
        totalRatings: 8,
        totalItems: 10,
      });
      expect(detectPersonality(input)).toBe('philosopher');
    });

    it('detects explorer when 2+ distinct values (fallback)', () => {
      const input = makeInput({
        ratings: [1, 2, 4, 1, 2, 4],
        ratingDistribution: { 1: 2, 2: 2, 4: 2 },
        noteCount: 1,
        noteLengths: [5],
        averageRating: 2.33,
        totalRatings: 6,
        totalItems: 10,
        earliestTimestamp: '2024-01-01T10:00:00Z',
        latestTimestamp: '2024-01-01T10:20:00Z',
      });
      expect(detectPersonality(input)).toBe('explorer');
    });

    it('broken-record wins over golden-retriever when both match', () => {
      const input = makeInput({
        ratings: [5, 5, 5, 5, 5, 5, 5, 5],
        ratingDistribution: { 5: 8 },
        averageRating: 5,
        totalRatings: 8,
      });
      expect(detectPersonality(input)).toBe('broken-record');
    });

    it('threshold clamps for small events (3 items → threshold 3)', () => {
      expect(detectPersonality(makeInput({ totalItems: 3, totalRatings: 2 }))).toBe(null);
      expect(detectPersonality(makeInput({ totalItems: 3, totalRatings: 3 }))).not.toBe(null);
    });

    it('excludes diplomat and rollercoaster on 2-point scale', () => {
      const input = makeInput({
        maxRating: 2,
        ratingDistribution: { 1: 5, 2: 5 },
        totalRatings: 10,
        totalItems: 12,
      });
      expect(detectPersonality(input)).toBe('love-hate-critic');
    });

    it('explorer fallback when no other rule matches', () => {
      const input = makeInput({
        ratings: [1, 2, 4, 1, 2, 4],
        ratingDistribution: { 1: 2, 2: 2, 4: 2 },
        noteCount: 1,
        noteLengths: [5],
        averageRating: 2.33,
        totalRatings: 6,
        totalItems: 10,
        earliestTimestamp: '2024-01-01T10:00:00Z',
        latestTimestamp: '2024-01-01T10:20:00Z',
      });
      expect(detectPersonality(input)).toBe('explorer');
    });

    it('returns null when single rating (speedrun and philosopher excluded)', () => {
      const input = makeInput({
        totalRatings: 1,
        totalItems: 2,
        ratingDistribution: { 5: 1 },
      });
      expect(detectPersonality(input)).toBe(null);
    });
  });
});
