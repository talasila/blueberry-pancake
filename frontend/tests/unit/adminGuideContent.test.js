import { describe, it, expect } from 'vitest';
import * as icons from 'lucide-react';
import { adminGuideContent } from '../../src/data/adminGuideContent';

const EXPECTED_COUNTS = {
  created: 8,
  started: 5,
  paused: 3,
  completed: 4,
};

const REQUIRED_FIELDS = ['id', 'heading', 'description', 'icon'];

describe('adminGuideContent', () => {
  it('exports an object with all four event states', () => {
    expect(Object.keys(adminGuideContent).sort()).toEqual(
      ['completed', 'created', 'paused', 'started'],
    );
  });

  describe.each(Object.entries(EXPECTED_COUNTS))(
    '%s state',
    (state, expectedCount) => {
      it(`has exactly ${expectedCount} steps`, () => {
        expect(adminGuideContent[state]).toHaveLength(expectedCount);
      });

      it('each step has all required fields as non-empty strings', () => {
        for (const step of adminGuideContent[state]) {
          for (const field of REQUIRED_FIELDS) {
            expect(step).toHaveProperty(field);
            expect(typeof step[field]).toBe('string');
            expect(step[field].trim().length).toBeGreaterThan(0);
          }
        }
      });

      it('each step icon is a valid lucide-react export', () => {
        for (const step of adminGuideContent[state]) {
          expect(icons).toHaveProperty(step.icon);
        }
      });
    },
  );

  it('all step IDs are globally unique across all states', () => {
    const allIds = Object.values(adminGuideContent).flat().map((s) => s.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('total step count is 20', () => {
    const total = Object.values(adminGuideContent).flat().length;
    expect(total).toBe(20);
  });
});
