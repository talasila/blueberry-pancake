import { describe, it, expect } from 'vitest';
import { normalizeEventId, isValidEventId } from '../../src/utils/eventIdValidation.js';

describe('eventIdValidation', () => {
  describe('isValidEventId', () => {
    it('returns true for a valid 8-char alphanumeric ID', () => {
      expect(isValidEventId('A5ohYrHe')).toBe(true);
    });

    it('returns true for all-uppercase IDs', () => {
      expect(isValidEventId('ABCD1234')).toBe(true);
    });

    it('returns true for all-lowercase IDs', () => {
      expect(isValidEventId('abcd1234')).toBe(true);
    });

    it('returns true for all-digit IDs', () => {
      expect(isValidEventId('12345678')).toBe(true);
    });

    it('returns true for IDs with leading/trailing whitespace (trimmed internally)', () => {
      expect(isValidEventId('  A5ohYrHe  ')).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidEventId(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidEventId(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidEventId('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isValidEventId('   ')).toBe(false);
    });

    it('returns false for too-short IDs', () => {
      expect(isValidEventId('ABC1234')).toBe(false);
    });

    it('returns false for too-long IDs', () => {
      expect(isValidEventId('ABCD12345')).toBe(false);
    });

    it('returns false for IDs with special characters', () => {
      expect(isValidEventId('A5oh-rHe')).toBe(false);
      expect(isValidEventId('A5oh_rHe')).toBe(false);
      expect(isValidEventId('A5oh.rHe')).toBe(false);
      expect(isValidEventId('A5oh@rHe')).toBe(false);
    });

    it('returns false for the string "undefined"', () => {
      expect(isValidEventId('undefined')).toBe(false);
    });

    it('returns false for the string "null"', () => {
      expect(isValidEventId('null')).toBe(false);
    });

    it('returns false for non-string types', () => {
      expect(isValidEventId(12345678)).toBe(false);
      expect(isValidEventId({})).toBe(false);
      expect(isValidEventId([])).toBe(false);
    });
  });

  describe('normalizeEventId', () => {
    it('returns uppercase version of a valid ID', () => {
      expect(normalizeEventId('a5ohyrhe')).toBe('A5OHYRHE');
    });

    it('trims whitespace before normalizing', () => {
      expect(normalizeEventId('  A5ohYrHe  ')).toBe('A5OHYRHE');
    });

    it('returns null for null input', () => {
      expect(normalizeEventId(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(normalizeEventId(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(normalizeEventId('')).toBeNull();
    });

    it('returns null for invalid format (too short)', () => {
      expect(normalizeEventId('ABC123')).toBeNull();
    });

    it('returns null for invalid format (too long)', () => {
      expect(normalizeEventId('ABCDE12345')).toBeNull();
    });

    it('returns null for IDs with special characters', () => {
      expect(normalizeEventId('A5oh-rHe')).toBeNull();
    });

    it('returns null for non-string types', () => {
      expect(normalizeEventId(12345678)).toBeNull();
    });

    it('preserves digits in the normalized output', () => {
      expect(normalizeEventId('12345678')).toBe('12345678');
    });
  });
});
