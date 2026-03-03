import { describe, it, expect } from 'vitest';
import { getGapType } from '../../src/utils/eventGuardrail.js';

describe('getGapType', () => {
  it('returns zero-registrations when registeredCount is 0', () => {
    expect(getGapType(0, 10)).toBe('zero-registrations');
    expect(getGapType(0, 0)).toBe('zero-registrations');
  });

  it('returns more-slots when registeredCount > 0 and availableSlots > registeredCount', () => {
    expect(getGapType(3, 20)).toBe('more-slots');
    expect(getGapType(1, 5)).toBe('more-slots');
  });

  it('returns fewer-slots when availableSlots < registeredCount', () => {
    expect(getGapType(8, 5)).toBe('fewer-slots');
    expect(getGapType(10, 10)).not.toBe('fewer-slots');
  });

  it('returns match when registeredCount equals availableSlots', () => {
    expect(getGapType(5, 5)).toBe('match');
    expect(getGapType(0, 0)).toBe('zero-registrations'); // 0 is special-cased
    expect(getGapType(20, 20)).toBe('match');
  });

  it('handles edge cases', () => {
    expect(getGapType(1, 1)).toBe('match');
    expect(getGapType(1, 2)).toBe('more-slots');
    expect(getGapType(2, 1)).toBe('fewer-slots');
  });
});
