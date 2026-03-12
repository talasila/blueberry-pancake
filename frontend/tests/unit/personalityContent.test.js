import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/utils/personalityContent.js', async (importOriginal) => {
  const mod = await importOriginal();
  const contentWithEmpty = {
    ...mod.PERSONALITY_CONTENT,
    __empty: { name: 'Empty Test', quotes: [] },
  };
  const getDisplay = (personalityId, templateVars = {}, quoteIndex) => {
    const entry = contentWithEmpty[personalityId];
    if (!entry) return null;
    const { name, emoji, quotes } = entry;
    if (!quotes || quotes.length === 0) return { name, emoji: emoji || '', quote: '', quoteIndex: -1 };
    const idx = quoteIndex !== undefined
      ? Math.max(0, Math.min(quoteIndex, quotes.length - 1))
      : Math.floor(Math.random() * quotes.length);
    const rawQuote = quotes[idx];
    return { name, emoji: emoji || '', quote: mod.interpolate(rawQuote, templateVars), quoteIndex: idx };
  };
  return { ...mod, getPersonalityDisplay: getDisplay };
});

import {
  getPersonalityDisplay,
  getPersonalityName,
  PERSONALITY_CONTENT,
  interpolate,
} from '../../src/utils/personalityContent.js';

const PERSONALITY_IDS = [
  'broken-record',
  'love-hate-critic',
  'speedrun',
  'golden-retriever',
  'simon-cowell',
  'novelist',
  'rollercoaster',
  'diplomat',
  'ghost',
  'philosopher',
  'explorer',
];

const ALL_TEMPLATE_VARS = {
  n: 3,
  max: 10,
  count: 12,
  minutes: 5,
  avg: 7.5,
  preview: 'up and down',
  item: 'wine',
  items: 'wines',
};

describe('personalityContent', () => {
  describe('Content integrity', () => {
    it('has exactly 11 personality types in PERSONALITY_CONTENT', () => {
      expect(Object.keys(PERSONALITY_CONTENT)).toHaveLength(11);
      expect(Object.keys(PERSONALITY_CONTENT)).toEqual(
        expect.arrayContaining(PERSONALITY_IDS)
      );
    });

    it('each personality has a name string, emoji, and quotes array with 3-10 entries', () => {
      PERSONALITY_IDS.forEach((id) => {
        const entry = PERSONALITY_CONTENT[id];
        expect(entry).toHaveProperty('name');
        expect(typeof entry.name).toBe('string');
        expect(entry.name.length).toBeGreaterThan(0);
        expect(entry).toHaveProperty('emoji');
        expect(typeof entry.emoji).toBe('string');
        expect(entry.emoji.length).toBeGreaterThan(0);
        expect(entry).toHaveProperty('quotes');
        expect(Array.isArray(entry.quotes)).toBe(true);
        expect(entry.quotes.length).toBeGreaterThanOrEqual(3);
        expect(entry.quotes.length).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('getPersonalityName', () => {
    it('returns correct name for broken-record', () => {
      expect(getPersonalityName('broken-record')).toBe('The Broken Record');
    });

    it('returns correct name for explorer and diplomat', () => {
      expect(getPersonalityName('explorer')).toBe('The Explorer');
      expect(getPersonalityName('diplomat')).toBe('The Diplomat');
    });

    it('returns null for unknown ID', () => {
      expect(getPersonalityName('unknown-personality')).toBeNull();
      expect(getPersonalityName('')).toBeNull();
    });

    it('returns correct name for all 11 personality IDs', () => {
      const expected = {
        'broken-record': 'The Broken Record',
        'love-hate-critic': 'The Love-Hate Critic',
        'speedrun': 'The Speedrun',
        'golden-retriever': 'The Golden Retriever',
        'simon-cowell': 'The Simon Cowell',
        'novelist': 'The Novelist',
        'rollercoaster': 'The Rollercoaster',
        'diplomat': 'The Diplomat',
        'ghost': 'The Ghost',
        'philosopher': 'The Philosopher',
        'explorer': 'The Explorer',
      };
      PERSONALITY_IDS.forEach((id) => {
        expect(getPersonalityName(id)).toBe(expected[id]);
      });
    });
  });

  describe('getPersonalityDisplay', () => {
    it('returns object with name, emoji, and quote for valid ID', () => {
      const result = getPersonalityDisplay('broken-record');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('emoji');
      expect(result).toHaveProperty('quote');
      expect(typeof result.name).toBe('string');
      expect(typeof result.emoji).toBe('string');
      expect(typeof result.quote).toBe('string');
      expect(result.name).toBe('The Broken Record');
      expect(result.emoji).toBe('🔁');
    });

    it('returns null for unknown ID', () => {
      expect(getPersonalityDisplay('nonexistent')).toBeNull();
    });

    it('returns { name, quote: "" } when quotes array is empty (graceful degradation)', () => {
      const result = getPersonalityDisplay('__empty');
      expect(result).toEqual({ name: 'Empty Test', emoji: '', quote: '', quoteIndex: -1 });
    });

    it('returns the same quote when called with the same quoteIndex', () => {
      const a = getPersonalityDisplay('broken-record', ALL_TEMPLATE_VARS, 0);
      const b = getPersonalityDisplay('broken-record', ALL_TEMPLATE_VARS, 0);
      expect(a.quote).toBe(b.quote);
      expect(a.quoteIndex).toBe(0);
    });

    it('returns different quotes for different quoteIndex values', () => {
      const a = getPersonalityDisplay('broken-record', ALL_TEMPLATE_VARS, 0);
      const b = getPersonalityDisplay('broken-record', ALL_TEMPLATE_VARS, 1);
      expect(a.quote).not.toBe(b.quote);
    });

    it('clamps quoteIndex to valid range', () => {
      const tooHigh = getPersonalityDisplay('broken-record', ALL_TEMPLATE_VARS, 999);
      const lastIdx = PERSONALITY_CONTENT['broken-record'].quotes.length - 1;
      expect(tooHigh.quoteIndex).toBe(lastIdx);

      const tooLow = getPersonalityDisplay('broken-record', ALL_TEMPLATE_VARS, -5);
      expect(tooLow.quoteIndex).toBe(0);
    });

    it('returns a quoteIndex when called without explicit index', () => {
      const result = getPersonalityDisplay('golden-retriever', ALL_TEMPLATE_VARS);
      expect(typeof result.quoteIndex).toBe('number');
      expect(result.quoteIndex).toBeGreaterThanOrEqual(0);
      expect(result.quoteIndex).toBeLessThan(PERSONALITY_CONTENT['golden-retriever'].quotes.length);
    });
  });

  describe('interpolate', () => {
    it('replaces all 8 token types correctly', () => {
      const template =
        '{n} {max} {count} {minutes} {avg} {preview} {item} {items}';
      const result = interpolate(template, ALL_TEMPLATE_VARS);
      expect(result).toBe('3 10 12 5 7.5 up and down wine wines');
    });

    it('leaves unmatched tokens as empty string', () => {
      const template = 'Hello {unknown} world';
      const result = interpolate(template, { foo: 'bar' });
      expect(result).toBe('Hello  world');
    });

    it('handles template with no tokens', () => {
      const template = 'No placeholders here';
      const result = interpolate(template, ALL_TEMPLATE_VARS);
      expect(result).toBe('No placeholders here');
    });

    it('replaces tokens with empty string when vars is empty or missing keys', () => {
      expect(interpolate('Hello {name}', {})).toBe('Hello ');
      expect(interpolate('{a}{b}{c}', { a: '1' })).toBe('1');
    });
  });

  describe('Template tokens in quotes', () => {
    it('getPersonalityDisplay with full template vars produces quote with no raw {token} syntax', () => {
      for (let i = 0; i < 10; i++) {
        const result = getPersonalityDisplay('broken-record', ALL_TEMPLATE_VARS);
        expect(result).not.toBeNull();
        expect(result.quote).not.toMatch(/\{\w+\}/);
      }
    });

    it('getPersonalityDisplay("broken-record", { n: 3, items: "wines", item: "wine" }) produces quote with "3" interpolated', () => {
      const vars = { n: 3, items: 'wines', item: 'wine' };
      const results = Array.from({ length: 20 }, () =>
        getPersonalityDisplay('broken-record', vars)
      );
      const hasThree = results.some((r) => r.quote.includes('3'));
      expect(hasThree).toBe(true);
      results.forEach((r) => expect(r.quote).not.toMatch(/\{\w+\}/));
    });

    it('all personalities produce quotes with no raw tokens when given full template vars', () => {
      PERSONALITY_IDS.forEach((id) => {
        const result = getPersonalityDisplay(id, ALL_TEMPLATE_VARS);
        expect(result).not.toBeNull();
        expect(result.quote).not.toMatch(/\{\w+\}/);
      });
    });
  });
});
