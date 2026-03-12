import { describe, it, expect } from 'vitest';
import { deriveItemRaterCounts } from '../../src/utils/participationCounts.js';

describe('deriveItemRaterCounts', () => {
  it('returns empty object for empty ratings array', () => {
    expect(deriveItemRaterCounts([])).toEqual({});
  });

  it('returns empty object for undefined input', () => {
    expect(deriveItemRaterCounts(undefined)).toEqual({});
    expect(deriveItemRaterCounts(null)).toEqual({});
  });

  it('counts a single rater for a single item', () => {
    const ratings = [{ itemId: '3', email: 'alice@example.com', rating: '4' }];
    expect(deriveItemRaterCounts(ratings)).toEqual({ 3: 1 });
  });

  it('counts multiple raters across multiple items', () => {
    const ratings = [
      { itemId: '1', email: 'alice@example.com', rating: '4' },
      { itemId: '1', email: 'bob@example.com', rating: '3' },
      { itemId: '2', email: 'alice@example.com', rating: '2' },
      { itemId: '3', email: 'carol@example.com', rating: '1' },
    ];
    expect(deriveItemRaterCounts(ratings)).toEqual({ 1: 2, 2: 1, 3: 1 });
  });

  it('counts duplicate emails for same item only once (re-rating)', () => {
    const ratings = [
      { itemId: '5', email: 'alice@example.com', rating: '4' },
      { itemId: '5', email: 'alice@example.com', rating: '2' },
    ];
    expect(deriveItemRaterCounts(ratings)).toEqual({ 5: 1 });
  });

  it('treats emails as case-insensitive', () => {
    const ratings = [
      { itemId: '1', email: 'Alice@Example.COM', rating: '4' },
      { itemId: '1', email: 'alice@example.com', rating: '3' },
    ];
    expect(deriveItemRaterCounts(ratings)).toEqual({ 1: 1 });
  });

  it('trims whitespace from emails', () => {
    const ratings = [
      { itemId: '2', email: '  bob@example.com  ', rating: '4' },
      { itemId: '2', email: 'bob@example.com', rating: '3' },
    ];
    expect(deriveItemRaterCounts(ratings)).toEqual({ 2: 1 });
  });

  it('parses itemId as integer', () => {
    const ratings = [
      { itemId: '07', email: 'alice@example.com', rating: '4' },
    ];
    expect(deriveItemRaterCounts(ratings)).toEqual({ 7: 1 });
  });

  it('skips ratings with missing email', () => {
    const ratings = [
      { itemId: '1', email: 'alice@example.com', rating: '4' },
      { itemId: '1', rating: '3' },
      { itemId: '1', email: '', rating: '2' },
    ];
    expect(deriveItemRaterCounts(ratings)).toEqual({ 1: 1 });
  });

  it('handles large number of items and raters', () => {
    const ratings = [];
    for (let item = 1; item <= 20; item++) {
      for (let user = 1; user <= 10; user++) {
        ratings.push({ itemId: String(item), email: `user${user}@test.com`, rating: '3' });
      }
    }
    const counts = deriveItemRaterCounts(ratings);
    expect(Object.keys(counts)).toHaveLength(20);
    for (let item = 1; item <= 20; item++) {
      expect(counts[item]).toBe(10);
    }
  });
});
