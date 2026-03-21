import { describe, it, expect, beforeEach, vi } from 'vitest';
import eventConfigService from '../../src/services/EventConfigService.js';
import eventService from '../../src/services/EventService.js';
import dataRepository from '../../src/data/DynamoDBRepository.js';

// Mock dependencies
vi.mock('../../src/services/EventService.js', () => ({
  default: {
    getEvent: vi.fn(),
    isAdministrator: vi.fn(),
    updateEvent: vi.fn(),
    validateTheme: vi.fn()
  }
}));

vi.mock('../../src/data/DynamoDBRepository.js', () => ({
  default: {
    getBookmarks: vi.fn(),
    saveBookmarks: vi.fn()
  }
}));

vi.mock('../../src/logging/Logger.js', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

const VALID_EVENT_ID = 'ABCD1234';
const ADMIN_EMAIL = 'admin@example.com';

function mockEvent(overrides = {}) {
  return {
    eventId: VALID_EVENT_ID,
    state: 'created',
    typeOfItem: 'wine',
    administrators: { [ADMIN_EMAIL]: { addedAt: '2024-01-01T00:00:00Z' } },
    users: { [ADMIN_EMAIL]: { name: 'Admin' } },
    ratingConfiguration: {
      maxRating: 4,
      ratings: [
        { value: 1, label: 'What is this crap?', color: '#FF3B30' },
        { value: 2, label: 'Meh...', color: '#FFCC00' },
        { value: 3, label: 'Not bad...', color: '#34C759' },
        { value: 4, label: 'Give me more...', color: '#28A745' }
      ]
    },
    itemConfiguration: {
      numberOfItems: 20,
      excludedItemIds: []
    },
    items: [],
    ...overrides
  };
}

describe('EventConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventService.isAdministrator.mockReturnValue(true);
    eventService.updateEvent.mockResolvedValue();
  });

  describe('getRatingConfiguration', () => {
    it('should return existing rating configuration', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.getRatingConfiguration(VALID_EVENT_ID);
      expect(result.maxRating).toBe(4);
      expect(result.ratings).toHaveLength(4);
    });

    it('should return defaults when no configuration exists', async () => {
      const event = mockEvent({ ratingConfiguration: undefined });
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.getRatingConfiguration(VALID_EVENT_ID);
      expect(result.maxRating).toBe(4);
      expect(result.ratings).toHaveLength(4);
    });

    it('should include noteSuggestionsEnabled for wine events', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.getRatingConfiguration(VALID_EVENT_ID);
      expect(result.noteSuggestionsEnabled).toBe(true);
    });

    it('should not include noteSuggestionsEnabled for non-wine events', async () => {
      const event = mockEvent({ typeOfItem: 'beer' });
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.getRatingConfiguration(VALID_EVENT_ID);
      expect(result.noteSuggestionsEnabled).toBeUndefined();
    });

    it('should include personalityEnabled for wine events', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.getRatingConfiguration(VALID_EVENT_ID);
      expect(result.personalityEnabled).toBe(true);
    });

    it('should not include personalityEnabled for non-wine events', async () => {
      const event = mockEvent({ typeOfItem: 'beer' });
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.getRatingConfiguration(VALID_EVENT_ID);
      expect(result.personalityEnabled).toBeUndefined();
    });

    it('should return stored personalityEnabled value when set to false', async () => {
      const event = mockEvent({ ratingConfiguration: { maxRating: 4, ratings: eventConfigService.generateDefaultRatings(4), personalityEnabled: false } });
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.getRatingConfiguration(VALID_EVENT_ID);
      expect(result.personalityEnabled).toBe(false);
    });

    it('should reject invalid event ID', async () => {
      await expect(
        eventConfigService.getRatingConfiguration('bad')
      ).rejects.toThrow('Invalid event ID');
    });
  });

  describe('updateRatingConfiguration', () => {
    it('should update maxRating in created state', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.updateRatingConfiguration(
        VALID_EVENT_ID,
        { maxRating: 3 },
        ADMIN_EMAIL
      );
      expect(result.maxRating).toBe(3);
      expect(result.ratings).toHaveLength(3);
    });

    it('should reject maxRating change when event is started', async () => {
      const event = mockEvent({ state: 'started' });
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventConfigService.updateRatingConfiguration(VALID_EVENT_ID, { maxRating: 3 }, ADMIN_EMAIL)
      ).rejects.toThrow('created');
    });

    it('should reject maxRating below 2', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventConfigService.updateRatingConfiguration(VALID_EVENT_ID, { maxRating: 1 }, ADMIN_EMAIL)
      ).rejects.toThrow('between 2 and 4');
    });

    it('should reject maxRating above 4', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventConfigService.updateRatingConfiguration(VALID_EVENT_ID, { maxRating: 5 }, ADMIN_EMAIL)
      ).rejects.toThrow('between 2 and 4');
    });

    it('should reject non-admin requester', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);
      eventService.isAdministrator.mockReturnValue(false);

      await expect(
        eventConfigService.updateRatingConfiguration(VALID_EVENT_ID, { maxRating: 3 }, 'nobody@example.com')
      ).rejects.toThrow('Only administrators');
    });

    it('should detect optimistic locking conflicts', async () => {
      const event = mockEvent();
      event.updatedAt = '2024-01-01T00:00:00Z';
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventConfigService.updateRatingConfiguration(
          VALID_EVENT_ID,
          { maxRating: 3 },
          ADMIN_EMAIL,
          '2023-12-31T00:00:00Z' // stale timestamp
        )
      ).rejects.toThrow('modified by another administrator');
    });

    it('should reject noteSuggestionsEnabled change when not in created state', async () => {
      const event = mockEvent({ state: 'started' });
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventConfigService.updateRatingConfiguration(
          VALID_EVENT_ID,
          { noteSuggestionsEnabled: false },
          ADMIN_EMAIL
        )
      ).rejects.toThrow('created');
    });

    it('should reject noteSuggestionsEnabled for non-wine events', async () => {
      const event = mockEvent({ typeOfItem: 'beer' });
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventConfigService.updateRatingConfiguration(
          VALID_EVENT_ID,
          { noteSuggestionsEnabled: true },
          ADMIN_EMAIL
        )
      ).rejects.toThrow('wine events');
    });

    it('should reject personalityEnabled change when not in created state', async () => {
      const event = mockEvent({ state: 'started' });
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventConfigService.updateRatingConfiguration(
          VALID_EVENT_ID,
          { personalityEnabled: false },
          ADMIN_EMAIL
        )
      ).rejects.toThrow('created');
    });

    it('should reject personalityEnabled for non-wine events', async () => {
      const event = mockEvent({ typeOfItem: 'beer' });
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventConfigService.updateRatingConfiguration(
          VALID_EVENT_ID,
          { personalityEnabled: true },
          ADMIN_EMAIL
        )
      ).rejects.toThrow('wine events');
    });

    it('should reject non-boolean personalityEnabled', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventConfigService.updateRatingConfiguration(
          VALID_EVENT_ID,
          { personalityEnabled: 'yes' },
          ADMIN_EMAIL
        )
      ).rejects.toThrow('personalityEnabled must be a boolean');
    });

    it('should save personalityEnabled for wine events in created state', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);
      eventService.updateEvent.mockResolvedValue();

      const result = await eventConfigService.updateRatingConfiguration(
        VALID_EVENT_ID,
        { personalityEnabled: false },
        ADMIN_EMAIL
      );

      expect(result.personalityEnabled).toBe(false);
    });
  });

  describe('validateRatingConfiguration', () => {
    it('should accept valid configuration', () => {
      const result = eventConfigService.validateRatingConfiguration({
        maxRating: 3,
        ratings: [
          { value: 1, label: 'Bad', color: '#FF0000' },
          { value: 2, label: 'OK', color: '#FFCC00' },
          { value: 3, label: 'Good', color: '#00FF00' }
        ]
      });
      expect(result.valid).toBe(true);
    });

    it('should reject null config', () => {
      const result = eventConfigService.validateRatingConfiguration(null);
      expect(result.valid).toBe(false);
    });

    it('should reject ratings array length mismatch', () => {
      const result = eventConfigService.validateRatingConfiguration({
        maxRating: 3,
        ratings: [
          { value: 1, label: 'Bad', color: '#FF0000' },
          { value: 2, label: 'Good', color: '#00FF00' }
        ]
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exactly 3');
    });

    it('should reject wrong value sequence', () => {
      const result = eventConfigService.validateRatingConfiguration({
        maxRating: 2,
        ratings: [
          { value: 1, label: 'Bad', color: '#FF0000' },
          { value: 3, label: 'Good', color: '#00FF00' } // should be 2
        ]
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must have value 2');
    });

    it('should reject empty label', () => {
      const result = eventConfigService.validateRatingConfiguration({
        maxRating: 2,
        ratings: [
          { value: 1, label: '', color: '#FF0000' },
          { value: 2, label: 'Good', color: '#00FF00' }
        ]
      });
      expect(result.valid).toBe(false);
    });

    it('should reject label over 50 characters', () => {
      const result = eventConfigService.validateRatingConfiguration({
        maxRating: 2,
        ratings: [
          { value: 1, label: 'x'.repeat(51), color: '#FF0000' },
          { value: 2, label: 'Good', color: '#00FF00' }
        ]
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('50 characters');
    });
  });

  describe('validateMaxRatingChange', () => {
    it('should allow change in created state', () => {
      const event = mockEvent({ state: 'created' });
      const result = eventConfigService.validateMaxRatingChange(event, 3);
      expect(result.valid).toBe(true);
    });

    it('should reject change in started state', () => {
      const event = mockEvent({ state: 'started' });
      const result = eventConfigService.validateMaxRatingChange(event, 3);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('created');
    });

    it('should allow no-op change (same value)', () => {
      const event = mockEvent({ state: 'created' });
      const result = eventConfigService.validateMaxRatingChange(event, 4);
      expect(result.valid).toBe(true);
    });
  });

  describe('getItemConfiguration', () => {
    it('should return existing item configuration', async () => {
      const event = mockEvent({ itemConfiguration: { numberOfItems: 15, excludedItemIds: [3, 7] } });
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.getItemConfiguration(VALID_EVENT_ID);
      expect(result.numberOfItems).toBe(15);
      expect(result.excludedItemIds).toEqual([3, 7]);
    });

    it('should return defaults when no configuration exists', async () => {
      const event = mockEvent({ itemConfiguration: undefined });
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.getItemConfiguration(VALID_EVENT_ID);
      expect(result.numberOfItems).toBe(20);
      expect(result.excludedItemIds).toEqual([]);
    });
  });

  describe('updateItemConfiguration', () => {
    it('should update number of items', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.updateItemConfiguration(
        VALID_EVENT_ID,
        { numberOfItems: 30 },
        ADMIN_EMAIL
      );
      expect(result.numberOfItems).toBe(30);
    });

    it('should reject numberOfItems below 1', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      await expect(
        eventConfigService.updateItemConfiguration(VALID_EVENT_ID, { numberOfItems: 0 }, ADMIN_EMAIL)
      ).rejects.toThrow('between 1 and 100');
    });

    it('should reject numberOfItems above 100', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      await expect(
        eventConfigService.updateItemConfiguration(VALID_EVENT_ID, { numberOfItems: 101 }, ADMIN_EMAIL)
      ).rejects.toThrow('between 1 and 100');
    });

    it('should reject numberOfItems below registered count', async () => {
      const event = mockEvent({
        items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }]
      });
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventConfigService.updateItemConfiguration(VALID_EVENT_ID, { numberOfItems: 2 }, ADMIN_EMAIL)
      ).rejects.toThrow('less than the number of registered items');
    });

    it('should reject numberOfItems below highest assigned itemId', async () => {
      const event = mockEvent({
        items: [{ itemId: 8, name: 'A' }]
      });
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventConfigService.updateItemConfiguration(VALID_EVENT_ID, { numberOfItems: 5 }, ADMIN_EMAIL)
      ).rejects.toThrow('highest assigned item ID');
    });

    it('should strip invalid excluded IDs when numberOfItems shrinks', async () => {
      const event = mockEvent({
        itemConfiguration: { numberOfItems: 20, excludedItemIds: [5, 15, 18] }
      });
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.updateItemConfiguration(
        VALID_EVENT_ID,
        { numberOfItems: 10 },
        ADMIN_EMAIL
      );
      expect(result.excludedItemIds).toEqual([5]);
      expect(result.warning).toContain('removed');
    });
  });

  describe('normalizeExcludedItemIds', () => {
    it('should parse comma-separated string', () => {
      const result = eventConfigService.normalizeExcludedItemIds('1, 3, 5', 10);
      expect(result).toEqual([1, 3, 5]);
    });

    it('should handle array input', () => {
      const result = eventConfigService.normalizeExcludedItemIds([2, 4, 6], 10);
      expect(result).toEqual([2, 4, 6]);
    });

    it('should remove duplicates', () => {
      const result = eventConfigService.normalizeExcludedItemIds([1, 1, 3, 3], 10);
      expect(result).toEqual([1, 3]);
    });

    it('should sort results', () => {
      const result = eventConfigService.normalizeExcludedItemIds([5, 1, 3], 10);
      expect(result).toEqual([1, 3, 5]);
    });

    it('should strip leading zeros', () => {
      const result = eventConfigService.normalizeExcludedItemIds('01, 003', 10);
      expect(result).toEqual([1, 3]);
    });

    it('should reject IDs out of range', () => {
      expect(() => eventConfigService.normalizeExcludedItemIds([0, 11], 10)).toThrow('Invalid item IDs');
    });

    it('should reject excluding all items', () => {
      expect(() => eventConfigService.normalizeExcludedItemIds([1, 2, 3], 3)).toThrow('Cannot exclude all');
    });
  });

  describe('updateTheme', () => {
    it('should update theme in created state', async () => {
      const event = mockEvent({ state: 'created' });
      eventService.getEvent.mockResolvedValue(event);
      eventService.validateTheme.mockReturnValue({ valid: true });

      await eventConfigService.updateTheme(VALID_EVENT_ID, 'midnight', ADMIN_EMAIL);
      expect(eventService.updateEvent).toHaveBeenCalled();
    });

    it('should reject theme change in started state', async () => {
      const event = mockEvent({ state: 'started' });
      eventService.getEvent.mockResolvedValue(event);
      eventService.validateTheme.mockReturnValue({ valid: true });

      await expect(
        eventConfigService.updateTheme(VALID_EVENT_ID, 'midnight', ADMIN_EMAIL)
      ).rejects.toThrow('created or paused');
    });

    it('should reject invalid theme', async () => {
      eventService.validateTheme.mockReturnValue({ valid: false, error: 'Unknown theme' });

      await expect(
        eventConfigService.updateTheme(VALID_EVENT_ID, 'nope', ADMIN_EMAIL)
      ).rejects.toThrow('Unknown theme');
    });

    it('should reject missing theme', async () => {
      await expect(
        eventConfigService.updateTheme(VALID_EVENT_ID, '', ADMIN_EMAIL)
      ).rejects.toThrow('Theme is required');
    });
  });

  describe('getUserBookmarks', () => {
    it('should return bookmarks for a user', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      dataRepository.getBookmarks.mockResolvedValue([1, 3, 7]);

      const result = await eventConfigService.getUserBookmarks(VALID_EVENT_ID, ADMIN_EMAIL);
      expect(result).toEqual([1, 3, 7]);
    });

    it('should return empty array when no bookmarks exist', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      dataRepository.getBookmarks.mockResolvedValue(null);

      const result = await eventConfigService.getUserBookmarks(VALID_EVENT_ID, ADMIN_EMAIL);
      expect(result).toEqual([]);
    });

    it('should reject missing email', async () => {
      await expect(
        eventConfigService.getUserBookmarks(VALID_EVENT_ID, '')
      ).rejects.toThrow('Email is required');
    });
  });

  describe('saveUserBookmarks', () => {
    it('should save and deduplicate bookmarks', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      dataRepository.saveBookmarks.mockResolvedValue();

      const result = await eventConfigService.saveUserBookmarks(VALID_EVENT_ID, ADMIN_EMAIL, [3, 1, 3, 7]);
      expect(result.bookmarks).toEqual([1, 3, 7]); // sorted and deduped
    });

    it('should reject non-array bookmarks', async () => {
      await expect(
        eventConfigService.saveUserBookmarks(VALID_EVENT_ID, ADMIN_EMAIL, 'not-array')
      ).rejects.toThrow('must be an array');
    });

    it('should reject non-integer bookmark IDs', async () => {
      await expect(
        eventConfigService.saveUserBookmarks(VALID_EVENT_ID, ADMIN_EMAIL, [1.5, 2])
      ).rejects.toThrow('positive integers');
    });

    it('should reject negative bookmark IDs', async () => {
      await expect(
        eventConfigService.saveUserBookmarks(VALID_EVENT_ID, ADMIN_EMAIL, [-1, 2])
      ).rejects.toThrow('positive integers');
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile with name', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());

      const result = await eventConfigService.getUserProfile(VALID_EVENT_ID, ADMIN_EMAIL);
      expect(result.email).toBe(ADMIN_EMAIL);
      expect(result.name).toBe('Admin');
    });

    it('should return null name when user has no entry', async () => {
      const event = mockEvent({ users: {} });
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.getUserProfile(VALID_EVENT_ID, 'nobody@example.com');
      expect(result.name).toBeNull();
    });
  });

  describe('updateUserName', () => {
    it('should update user name', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.updateUserName(VALID_EVENT_ID, ADMIN_EMAIL, 'New Name');
      expect(result.name).toBe('New Name');
      expect(eventService.updateEvent).toHaveBeenCalled();
    });

    it('should remove name when set to empty string', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.updateUserName(VALID_EVENT_ID, ADMIN_EMAIL, '');
      expect(result.name).toBeNull();
    });

    it('should create user entry if not existing', async () => {
      const event = mockEvent({ users: {} });
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventConfigService.updateUserName(VALID_EVENT_ID, 'new@example.com', 'Newbie');
      expect(result.name).toBe('Newbie');
    });
  });

  describe('convertColorToHex', () => {
    it('should pass through 6-digit hex', () => {
      expect(eventConfigService.convertColorToHex('#FF3B30')).toBe('#FF3B30');
    });

    it('should expand 3-digit hex', () => {
      expect(eventConfigService.convertColorToHex('#F00')).toBe('#FF0000');
    });

    it('should convert RGB to hex', () => {
      expect(eventConfigService.convertColorToHex('rgb(255, 0, 0)')).toBe('#FF0000');
    });

    it('should convert HSL to hex', () => {
      const result = eventConfigService.convertColorToHex('hsl(0, 100%, 50%)');
      expect(result).toBe('#FF0000');
    });

    it('should reject invalid format', () => {
      expect(() => eventConfigService.convertColorToHex('red')).toThrow('Invalid color format');
    });

    it('should reject null input', () => {
      expect(() => eventConfigService.convertColorToHex(null)).toThrow('required');
    });

    it('should reject RGB values out of range', () => {
      expect(() => eventConfigService.convertColorToHex('rgb(256, 0, 0)')).toThrow('between 0 and 255');
    });
  });

  describe('generateDefaultRatings', () => {
    it('should generate 2-point scale', () => {
      const ratings = eventConfigService.generateDefaultRatings(2);
      expect(ratings).toHaveLength(2);
      expect(ratings[0].value).toBe(1);
      expect(ratings[1].value).toBe(2);
    });

    it('should generate 3-point scale', () => {
      const ratings = eventConfigService.generateDefaultRatings(3);
      expect(ratings).toHaveLength(3);
    });

    it('should generate 4-point scale', () => {
      const ratings = eventConfigService.generateDefaultRatings(4);
      expect(ratings).toHaveLength(4);
    });

    it('should reject invalid maxRating', () => {
      expect(() => eventConfigService.generateDefaultRatings(5)).toThrow('between 2 and 4');
      expect(() => eventConfigService.generateDefaultRatings(1)).toThrow('between 2 and 4');
    });

    it('should return deep copies (no mutation)', () => {
      const a = eventConfigService.generateDefaultRatings(4);
      const b = eventConfigService.generateDefaultRatings(4);
      a[0].label = 'mutated';
      expect(b[0].label).not.toBe('mutated');
    });
  });
});
