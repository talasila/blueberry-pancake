import { describe, it, expect } from 'vitest';
import { generateUserId, isValidUserId, resolveEmailFromUserId, resolveRequestEmail } from '../../src/utils/userIdUtils.js';

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

describe('resolveEmailFromUserId', () => {
  const event = {
    users: {
      'alice@example.com': { userId: 'u_alice12345', name: 'Alice' },
      'bob@example.com': { userId: 'u_bob1234567', name: 'Bob' },
    }
  };

  it('returns email for a matching userId', () => {
    expect(resolveEmailFromUserId(event, 'u_alice12345')).toBe('alice@example.com');
    expect(resolveEmailFromUserId(event, 'u_bob1234567')).toBe('bob@example.com');
  });

  it('returns null for unknown userId', () => {
    expect(resolveEmailFromUserId(event, 'u_unknown000')).toBeNull();
  });

  it('returns null for null/undefined userId', () => {
    expect(resolveEmailFromUserId(event, null)).toBeNull();
    expect(resolveEmailFromUserId(event, undefined)).toBeNull();
  });

  it('returns null for null/undefined event', () => {
    expect(resolveEmailFromUserId(null, 'u_alice12345')).toBeNull();
    expect(resolveEmailFromUserId(undefined, 'u_alice12345')).toBeNull();
  });

  it('returns null for event with no users', () => {
    expect(resolveEmailFromUserId({ users: {} }, 'u_alice12345')).toBeNull();
    expect(resolveEmailFromUserId({}, 'u_alice12345')).toBeNull();
  });
});

describe('resolveRequestEmail', () => {
  const event = {
    users: {
      'alice@example.com': { userId: 'u_alice12345', name: 'Alice' },
    }
  };

  it('returns email directly for OTP user', () => {
    expect(resolveRequestEmail({ email: 'alice@example.com' }, event)).toBe('alice@example.com');
  });

  it('returns resolvedEmail when present', () => {
    expect(resolveRequestEmail({ resolvedEmail: 'alice@example.com' }, event)).toBe('alice@example.com');
  });

  it('prefers email over resolvedEmail', () => {
    expect(resolveRequestEmail({ email: 'direct@test.com', resolvedEmail: 'resolved@test.com' }, event)).toBe('direct@test.com');
  });

  it('resolves from userId via event users map', () => {
    expect(resolveRequestEmail({ userId: 'u_alice12345' }, event)).toBe('alice@example.com');
  });

  it('returns null for unknown userId', () => {
    expect(resolveRequestEmail({ userId: 'u_unknown000' }, event)).toBeNull();
  });

  it('returns null for empty reqUser', () => {
    expect(resolveRequestEmail({}, event)).toBeNull();
    expect(resolveRequestEmail(null, event)).toBeNull();
  });
});
