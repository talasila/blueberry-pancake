import { describe, it, expect } from 'vitest';
import { generateUserId, isValidUserId } from '../../src/utils/userIdUtils.js';

describe('generateUserId', () => {
  it('returns a string with u_ prefix and 10 alphanumeric characters', () => {
    const id = generateUserId();
    expect(id).toMatch(/^u_[a-zA-Z0-9]{10}$/);
    expect(id.length).toBe(12);
  });

  it('generates unique IDs across 1000 calls', () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateUserId());
    }
    expect(ids.size).toBe(1000);
  });

  it('always starts with u_ prefix', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateUserId().startsWith('u_')).toBe(true);
    }
  });
});

describe('isValidUserId', () => {
  it('accepts valid userIds', () => {
    expect(isValidUserId('u_aBcDeFgHiJ')).toBe(true);
    expect(isValidUserId('u_0123456789')).toBe(true);
    expect(isValidUserId('u_ABCDEFGHIJ')).toBe(true);
    expect(isValidUserId('u_abcdefghij')).toBe(true);
  });

  it('rejects strings without u_ prefix', () => {
    expect(isValidUserId('aBcDeFgHiJkL')).toBe(false);
    expect(isValidUserId('x_aBcDeFgHiJ')).toBe(false);
  });

  it('rejects strings with wrong length', () => {
    expect(isValidUserId('u_abc')).toBe(false);
    expect(isValidUserId('u_aBcDeFgHiJkL')).toBe(false);
    expect(isValidUserId('u_')).toBe(false);
  });

  it('rejects non-alphanumeric characters', () => {
    expect(isValidUserId('u_aBcDe-gHiJ')).toBe(false);
    expect(isValidUserId('u_aBcDe_gHiJ')).toBe(false);
    expect(isValidUserId('u_aBcDe gHiJ')).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isValidUserId(null)).toBe(false);
    expect(isValidUserId(undefined)).toBe(false);
    expect(isValidUserId(123)).toBe(false);
    expect(isValidUserId({})).toBe(false);
  });
});
