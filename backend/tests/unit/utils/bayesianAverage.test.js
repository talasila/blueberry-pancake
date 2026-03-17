import { describe, it, expect } from 'vitest';
import { calculateWeightedAverage } from '../../../src/utils/bayesianAverage.js';

describe('calculateWeightedAverage', () => {
  it('should calculate Bayesian weighted average correctly', () => {
    // C = floor(10 * 0.4) = 4
    // Formula: (4 * 3.0 + 15) / (4 + 5) = (12 + 15) / 9 = 3.0
    const result = calculateWeightedAverage(3.0, 10, 5, 15);
    expect(result).toBe(3);
  });

  it('should pull items with few ratings toward the global average', () => {
    // Item with 1 rater who gave 4, global avg is 2.5, 10 users
    // C = 4, (4 * 2.5 + 4) / (4 + 1) = 14 / 5 = 2.8
    const result = calculateWeightedAverage(2.5, 10, 1, 4);
    expect(result).toBe(2.8);
  });

  it('should converge to simple average with many raters', () => {
    // 100 users, C = 40, item has 1000 raters with sum 3500 (avg 3.5), global avg 3.0
    // (40 * 3.0 + 3500) / (40 + 1000) = 3620 / 1040 ≈ 3.48
    const result = calculateWeightedAverage(3.0, 100, 1000, 3500);
    // Should be close to 3.5 (the item's simple average)
    expect(result).toBeCloseTo(3.48, 1);
  });

  it('should return global average when item has 0 raters', () => {
    const result = calculateWeightedAverage(3.0, 10, 0, 0);
    expect(result).toBe(3.0);
  });

  it('should return null when C is 0 (no users)', () => {
    // C = floor(0 * 0.4) = 0
    const result = calculateWeightedAverage(3.0, 0, 5, 15);
    expect(result).toBeNull();
  });

  it('should return null when C is 0 (1 user, rounds to 0)', () => {
    // C = floor(1 * 0.4) = 0
    const result = calculateWeightedAverage(3.0, 1, 1, 3);
    expect(result).toBeNull();
  });

  it('should return null when globalAvg is null', () => {
    const result = calculateWeightedAverage(null, 10, 5, 15);
    expect(result).toBeNull();
  });

  it('should return null when globalAvg is undefined', () => {
    const result = calculateWeightedAverage(undefined, 10, 5, 15);
    expect(result).toBeNull();
  });

  it('should return null when globalAvg is NaN', () => {
    const result = calculateWeightedAverage(NaN, 10, 5, 15);
    expect(result).toBeNull();
  });

  it('should handle globalAvg of 0', () => {
    // C = 4, (4 * 0 + 10) / (4 + 5) = 10/9 ≈ 1.11
    const result = calculateWeightedAverage(0, 10, 5, 10);
    expect(result).toBeCloseTo(1.111, 2);
  });

  it('should handle large numbers without overflow', () => {
    const result = calculateWeightedAverage(3.5, 1000, 500, 1750);
    expect(result).not.toBeNull();
    expect(isFinite(result)).toBe(true);
  });
});
