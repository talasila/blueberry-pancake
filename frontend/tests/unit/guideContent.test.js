import { describe, it, expect } from 'vitest';
import { guideContent } from '../../src/data/guideContent.js';

describe('guideContent data integrity', () => {
  it('host path has exactly 8 steps', () => {
    expect(guideContent.host).toHaveLength(8);
  });

  it('guest path has exactly 4 steps', () => {
    expect(guideContent.guest).toHaveLength(4);
  });

  const requiredFields = ['id', 'heading', 'description', 'icon'];

  it.each(guideContent.host.map((s, i) => [s.id, s, i]))(
    'host step "%s" has all required fields with non-empty values',
    (_id, step) => {
      for (const field of requiredFields) {
        expect(step).toHaveProperty(field);
        expect(typeof step[field]).toBe('string');
        expect(step[field].trim().length).toBeGreaterThan(0);
      }
    },
  );

  it.each(guideContent.guest.map((s, i) => [s.id, s, i]))(
    'guest step "%s" has all required fields with non-empty values',
    (_id, step) => {
      for (const field of requiredFields) {
        expect(step).toHaveProperty(field);
        expect(typeof step[field]).toBe('string');
        expect(step[field].trim().length).toBeGreaterThan(0);
      }
    },
  );

  it('all step IDs are unique', () => {
    const allIds = [...guideContent.host, ...guideContent.guest].map((s) => s.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
