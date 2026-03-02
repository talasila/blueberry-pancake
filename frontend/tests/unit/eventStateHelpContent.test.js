import { describe, it, expect } from 'vitest';
import { eventStateHelpContent } from '../../src/data/eventStateHelpContent';

const STATE_KEYS = ['created', 'started', 'paused', 'completed'];

describe('eventStateHelpContent', () => {
  it('exports an object with all four event states', () => {
    for (const key of STATE_KEYS) {
      expect(eventStateHelpContent).toHaveProperty(key);
    }
  });

  describe.each(STATE_KEYS)('per-state %s', (stateKey) => {
    it('has adminCan and guestCan non-empty', () => {
      const block = eventStateHelpContent[stateKey];
      expect(block).toHaveProperty('adminCan');
      expect(block).toHaveProperty('guestCan');
      const adminCan = block.adminCan;
      const guestCan = block.guestCan;
      if (Array.isArray(adminCan)) {
        expect(adminCan.length).toBeGreaterThan(0);
        adminCan.forEach((s) => expect(typeof s).toBe('string'));
      } else {
        expect(typeof adminCan).toBe('string');
        expect(adminCan.trim().length).toBeGreaterThan(0);
      }
      if (Array.isArray(guestCan)) {
        guestCan.forEach((s) => expect(typeof s).toBe('string'));
      } else {
        expect(typeof guestCan).toBe('string');
        expect(guestCan.trim().length).toBeGreaterThan(0);
      }
    });
  });
});
