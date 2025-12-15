import { describe, it, expect, beforeEach, vi } from 'vitest';
import itemService from '../../src/services/ItemService.js';
import dataRepository from '../../src/data/FileDataRepository.js';
import eventService from '../../src/services/EventService.js';
import cacheService from '../../src/cache/CacheService.js';
import loggerService from '../../src/logging/Logger.js';

// Mock dependencies
vi.mock('../../src/data/FileDataRepository.js', () => ({
  default: {
    writeEventConfig: vi.fn()
  }
}));

vi.mock('../../src/services/EventService.js', () => ({
  default: {
    validateEventId: vi.fn(),
    getEvent: vi.fn(),
    isAdministrator: vi.fn()
  }
}));

vi.mock('../../src/cache/CacheService.js', () => ({
  default: {
    del: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    setDirty: vi.fn(),
    setWithPersist: vi.fn().mockResolvedValue(true),
    ensureEventConfigLoaded: vi.fn(),
    ensureRatingsLoaded: vi.fn()
  }
}));

vi.mock('../../src/logging/Logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('ItemService', () => {
  describe('normalizePrice', () => {
    it('should return null for null input', () => {
      expect(itemService.normalizePrice(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(itemService.normalizePrice(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(itemService.normalizePrice('')).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      expect(itemService.normalizePrice('   ')).toBeNull();
    });

    it('should return number for valid number input', () => {
      expect(itemService.normalizePrice(50)).toBe(50);
      expect(itemService.normalizePrice(50.99)).toBe(50.99);
      expect(itemService.normalizePrice(0)).toBe(0);
    });

    it('should parse string with dollar sign', () => {
      expect(itemService.normalizePrice('$50')).toBe(50);
      expect(itemService.normalizePrice('$50.99')).toBe(50.99);
    });

    it('should parse string with decimal format', () => {
      expect(itemService.normalizePrice('50.00')).toBe(50);
      expect(itemService.normalizePrice('50.99')).toBe(50.99);
    });

    it('should parse plain number string', () => {
      expect(itemService.normalizePrice('50')).toBe(50);
      expect(itemService.normalizePrice('50.5')).toBe(50.5);
    });

    it('should handle strings with commas', () => {
      expect(itemService.normalizePrice('1,000')).toBe(1000);
      expect(itemService.normalizePrice('$1,000.50')).toBe(1000.5);
    });

    it('should handle strings with whitespace', () => {
      expect(itemService.normalizePrice('  50  ')).toBe(50);
      expect(itemService.normalizePrice('  $50.99  ')).toBe(50.99);
    });

    it('should allow zero', () => {
      expect(itemService.normalizePrice(0)).toBe(0);
      expect(itemService.normalizePrice('0')).toBe(0);
      expect(itemService.normalizePrice('$0')).toBe(0);
    });

    it('should throw error for negative numbers', () => {
      expect(() => itemService.normalizePrice(-50)).toThrow('Price cannot be negative');
      expect(() => itemService.normalizePrice('-50')).toThrow('Price cannot be negative');
      expect(() => itemService.normalizePrice('-$50')).toThrow('Price cannot be negative');
    });

    it('should throw error for invalid format', () => {
      expect(() => itemService.normalizePrice('abc')).toThrow('Invalid price format');
      expect(() => itemService.normalizePrice('$abc')).toThrow('Invalid price format');
    });

    it('should throw error for invalid type', () => {
      expect(() => itemService.normalizePrice({})).toThrow('Invalid price type');
      expect(() => itemService.normalizePrice([])).toThrow('Invalid price type');
      expect(() => itemService.normalizePrice(true)).toThrow('Invalid price type');
    });
  });

  describe('validateItemRegistration', () => {
    it('should return error for missing itemData', () => {
      const result = itemService.validateItemRegistration(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item data is required');
    });

    it('should return error for non-object itemData', () => {
      const result = itemService.validateItemRegistration('invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item data is required');
    });

    it('should return error for missing name', () => {
      const result = itemService.validateItemRegistration({});
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item name is required');
    });

    it('should return error for empty name', () => {
      const result = itemService.validateItemRegistration({ name: '   ' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item name cannot be empty');
    });

    it('should return error for name exceeding 200 characters', () => {
      const longName = 'a'.repeat(201);
      const result = itemService.validateItemRegistration({ name: longName });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item name must be 200 characters or less');
    });

    it('should accept valid name with 200 characters', () => {
      const name = 'a'.repeat(200);
      const result = itemService.validateItemRegistration({ name });
      expect(result.valid).toBe(true);
      expect(result.normalized.name).toBe(name);
    });

    it('should trim name whitespace', () => {
      const result = itemService.validateItemRegistration({ name: '  Test Item  ' });
      expect(result.valid).toBe(true);
      expect(result.normalized.name).toBe('Test Item');
    });

    it('should return error for description exceeding 1000 characters', () => {
      const longDescription = 'a'.repeat(1001);
      const result = itemService.validateItemRegistration({
        name: 'Test Item',
        description: longDescription
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item description must be 1000 characters or less');
    });

    it('should accept valid description with 1000 characters', () => {
      const description = 'a'.repeat(1000);
      const result = itemService.validateItemRegistration({
        name: 'Test Item',
        description
      });
      expect(result.valid).toBe(true);
      expect(result.normalized.description).toBe(description);
    });

    it('should return null for empty description', () => {
      const result = itemService.validateItemRegistration({
        name: 'Test Item',
        description: ''
      });
      expect(result.valid).toBe(true);
      expect(result.normalized.description).toBeNull();
    });

    it('should return null for null description', () => {
      const result = itemService.validateItemRegistration({
        name: 'Test Item',
        description: null
      });
      expect(result.valid).toBe(true);
      expect(result.normalized.description).toBeNull();
    });

    it('should return error for non-string description', () => {
      const result = itemService.validateItemRegistration({
        name: 'Test Item',
        description: 123
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item description must be a string');
    });

    it('should normalize price from various formats', () => {
      const testCases = [
        { price: '$50', expected: 50 },
        { price: '50.00', expected: 50 },
        { price: '50', expected: 50 },
        { price: 50, expected: 50 },
        { price: null, expected: null },
        { price: undefined, expected: null }
      ];

      testCases.forEach(({ price, expected }) => {
        const result = itemService.validateItemRegistration({
          name: 'Test Item',
          price
        });
        expect(result.valid).toBe(true);
        expect(result.normalized.price).toBe(expected);
      });
    });

    it('should return error for negative price', () => {
      const result = itemService.validateItemRegistration({
        name: 'Test Item',
        price: -50
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Price cannot be negative');
    });

    it('should accept valid item registration with all fields', () => {
      const result = itemService.validateItemRegistration({
        name: 'Test Item',
        price: '$50.99',
        description: 'Test description'
      });
      expect(result.valid).toBe(true);
      expect(result.normalized.name).toBe('Test Item');
      expect(result.normalized.price).toBe(50.99);
      expect(result.normalized.description).toBe('Test description');
    });

    it('should accept valid item registration with only name', () => {
      const result = itemService.validateItemRegistration({
        name: 'Test Item'
      });
      expect(result.valid).toBe(true);
      expect(result.normalized.name).toBe('Test Item');
      expect(result.normalized.price).toBeNull();
      expect(result.normalized.description).toBeNull();
    });
  });

  describe('validateItemIdAssignment', () => {
    it('should return error for non-integer itemId', () => {
      const result = itemService.validateItemIdAssignment(5.5, 10, [], []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item ID must be an integer');
    });

    it('should return error for itemId less than 1', () => {
      const result = itemService.validateItemIdAssignment(0, 10, [], []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item ID must be between 1 and 10');
    });

    it('should return error for itemId greater than numberOfItems', () => {
      const result = itemService.validateItemIdAssignment(11, 10, [], []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item ID must be between 1 and 10');
    });

    it('should return error for itemId in excludedItemIds', () => {
      const result = itemService.validateItemIdAssignment(5, 10, [5, 7], []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item ID 5 is excluded and cannot be assigned');
    });

    it('should return error for itemId already assigned', () => {
      const result = itemService.validateItemIdAssignment(5, 10, [], [3, 5, 7]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item ID 5 is already assigned to another item');
    });

    it('should accept valid itemId at minimum range', () => {
      const result = itemService.validateItemIdAssignment(1, 10, [], []);
      expect(result.valid).toBe(true);
    });

    it('should accept valid itemId at maximum range', () => {
      const result = itemService.validateItemIdAssignment(10, 10, [], []);
      expect(result.valid).toBe(true);
    });

    it('should accept valid itemId in middle range', () => {
      const result = itemService.validateItemIdAssignment(5, 10, [], []);
      expect(result.valid).toBe(true);
    });

    it('should accept valid itemId when excludedItemIds is empty', () => {
      const result = itemService.validateItemIdAssignment(5, 10, [], []);
      expect(result.valid).toBe(true);
    });

    it('should accept valid itemId when excludedItemIds contains other values', () => {
      const result = itemService.validateItemIdAssignment(5, 10, [7, 8], []);
      expect(result.valid).toBe(true);
    });

    it('should accept valid itemId when existingAssignments is empty', () => {
      const result = itemService.validateItemIdAssignment(5, 10, [], []);
      expect(result.valid).toBe(true);
    });

    it('should accept valid itemId when existingAssignments contains other values', () => {
      const result = itemService.validateItemIdAssignment(5, 10, [], [3, 7, 9]);
      expect(result.valid).toBe(true);
    });

    it('should handle null excludedItemIds', () => {
      const result = itemService.validateItemIdAssignment(5, 10, null, []);
      expect(result.valid).toBe(true);
    });

    it('should handle null existingAssignments', () => {
      const result = itemService.validateItemIdAssignment(5, 10, [], null);
      expect(result.valid).toBe(true);
    });
  });

  describe('registerItem', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      eventService.validateEventId.mockReturnValue({ valid: true });
    });

    it('should register item successfully', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started',
        items: [],
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);

      const itemData = {
        name: 'Test Item',
        price: '50.99',
        description: 'Test description'
      };

      const result = await itemService.registerItem('A5ohYrHe', itemData, 'user@example.com');

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Test Item');
      expect(result.price).toBe(50.99);
      expect(result.description).toBe('Test description');
      expect(result.ownerEmail).toBe('user@example.com');
      expect(result).toHaveProperty('registeredAt');
      expect(result.itemId).toBeNull();
      expect(cacheService.setWithPersist).toHaveBeenCalled();
    });

    it('should initialize items array if it does not exist', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started',
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);

      const itemData = { name: 'Test Item' };
      await itemService.registerItem('A5ohYrHe', itemData, 'user@example.com');

      expect(mockEvent.items).toBeDefined();
      expect(Array.isArray(mockEvent.items)).toBe(true);
    });

    it('should throw error for invalid event ID', async () => {
      eventService.validateEventId.mockReturnValue({ valid: false, error: 'Invalid event ID' });

      await expect(
        itemService.registerItem('invalid', { name: 'Test' }, 'user@example.com')
      ).rejects.toThrow('Invalid event ID');
    });

    it('should throw error for missing owner email', async () => {
      await expect(
        itemService.registerItem('A5ohYrHe', { name: 'Test' }, '')
      ).rejects.toThrow('Owner email is required');
    });

    it('should throw error for invalid item data', async () => {
      eventService.getEvent.mockResolvedValue({
        eventId: 'A5ohYrHe',
        state: 'started',
        items: []
      });

      await expect(
        itemService.registerItem('A5ohYrHe', {}, 'user@example.com')
      ).rejects.toThrow('Item name is required');
    });

    it('should throw error when event is in paused state', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'paused',
        items: []
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      await expect(
        itemService.registerItem('A5ohYrHe', { name: 'Test' }, 'user@example.com')
      ).rejects.toThrow('not allowed when event is in "paused" state');
    });

    it('should throw error when event is in completed state', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'completed',
        items: []
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      await expect(
        itemService.registerItem('A5ohYrHe', { name: 'Test' }, 'user@example.com')
      ).rejects.toThrow('not allowed when event is in "completed" state');
    });

    it('should allow registration when event is in created state', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'created',
        items: [],
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);

      const result = await itemService.registerItem('A5ohYrHe', { name: 'Test' }, 'user@example.com');

      expect(result).toHaveProperty('id');
      expect(cacheService.setWithPersist).toHaveBeenCalled();
    });

    it('should generate unique item ID', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started',
        items: [],
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);

      const item1 = await itemService.registerItem('A5ohYrHe', { name: 'Item 1' }, 'user@example.com');
      const item2 = await itemService.registerItem('A5ohYrHe', { name: 'Item 2' }, 'user@example.com');

      expect(item1.id).not.toBe(item2.id);
      expect(item1.id).toHaveLength(12);
      expect(item2.id).toHaveLength(12);
    });

    it('should set owner email to lowercase', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started',
        items: [],
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);

      const result = await itemService.registerItem('A5ohYrHe', { name: 'Test' }, 'User@Example.com');

      expect(result.ownerEmail).toBe('user@example.com');
    });
  });

  describe('getItems', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      eventService.validateEventId.mockReturnValue({ valid: true });
    });

    it('should return all items for administrators', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        items: [
          { id: 'item1', name: 'Item 1', ownerEmail: 'user1@example.com' },
          { id: 'item2', name: 'Item 2', ownerEmail: 'user2@example.com' }
        ]
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.isAdministrator.mockReturnValue(true);

      const result = await itemService.getItems('A5ohYrHe', 'admin@example.com', true);

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockEvent.items);
    });

    it('should return only user\'s items for regular users', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        items: [
          { id: 'item1', name: 'Item 1', ownerEmail: 'user1@example.com' },
          { id: 'item2', name: 'Item 2', ownerEmail: 'user2@example.com' },
          { id: 'item3', name: 'Item 3', ownerEmail: 'user1@example.com' }
        ]
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      const result = await itemService.getItems('A5ohYrHe', 'user1@example.com', false);

      expect(result).toHaveLength(2);
      expect(result.every(item => item.ownerEmail === 'user1@example.com')).toBe(true);
    });

    it('should initialize items array if it does not exist', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe'
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      const result = await itemService.getItems('A5ohYrHe', 'user@example.com', false);

      expect(mockEvent.items).toBeDefined();
      expect(Array.isArray(mockEvent.items)).toBe(true);
      expect(result).toEqual([]);
    });

    it('should throw error for invalid event ID', async () => {
      eventService.validateEventId.mockReturnValue({ valid: false, error: 'Invalid event ID' });

      await expect(
        itemService.getItems('invalid', 'user@example.com', false)
      ).rejects.toThrow('Invalid event ID');
    });

    it('should handle empty items array', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        items: []
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      const result = await itemService.getItems('A5ohYrHe', 'user@example.com', false);

      expect(result).toEqual([]);
    });
  });

  describe('assignItemId', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      eventService.validateEventId.mockReturnValue({ valid: true });
    });

    it('should assign item ID successfully', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'paused',
        items: [
          { id: 'item1', name: 'Item 1', ownerEmail: 'user@example.com', itemId: null }
        ],
        itemConfiguration: {
          numberOfItems: 10,
          excludedItemIds: [7, 8]
        },
        administrators: {
          'admin@example.com': { owner: true }
        },
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.isAdministrator.mockReturnValue(true);
      cacheService.setWithPersist.mockResolvedValue(true);

      const result = await itemService.assignItemId('A5ohYrHe', 'item1', 5, 'admin@example.com');

      expect(result.itemId).toBe(5);
      expect(cacheService.setWithPersist).toHaveBeenCalled();
    });

    it('should throw error when event is not in paused state', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started',
        items: [],
        itemConfiguration: { numberOfItems: 10 }
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      await expect(
        itemService.assignItemId('A5ohYrHe', 'item1', 5, 'admin@example.com')
      ).rejects.toThrow('not allowed when event is in "started" state');
    });

    it('should throw error when user is not administrator', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'paused',
        items: [],
        itemConfiguration: { numberOfItems: 10 },
        administrators: {}
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.isAdministrator.mockReturnValue(false);

      await expect(
        itemService.assignItemId('A5ohYrHe', 'item1', 5, 'user@example.com')
      ).rejects.toThrow('Only event administrators can assign item IDs');
    });

    it('should throw error for item ID out of range', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'paused',
        items: [{ id: 'item1', name: 'Item 1', itemId: null }],
        itemConfiguration: { numberOfItems: 10, excludedItemIds: [] },
        administrators: { 'admin@example.com': { owner: true } }
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.isAdministrator.mockReturnValue(true);

      await expect(
        itemService.assignItemId('A5ohYrHe', 'item1', 15, 'admin@example.com')
      ).rejects.toThrow('Item ID must be between 1 and 10');
    });

    it('should throw error for item ID in excludedItemIds', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'paused',
        items: [{ id: 'item1', name: 'Item 1', itemId: null }],
        itemConfiguration: { numberOfItems: 10, excludedItemIds: [5, 7] },
        administrators: { 'admin@example.com': { owner: true } }
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.isAdministrator.mockReturnValue(true);

      await expect(
        itemService.assignItemId('A5ohYrHe', 'item1', 5, 'admin@example.com')
      ).rejects.toThrow('Item ID 5 is excluded and cannot be assigned');
    });

    it('should throw error for duplicate item ID', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'paused',
        items: [
          { id: 'item1', name: 'Item 1', itemId: null },
          { id: 'item2', name: 'Item 2', itemId: 5 }
        ],
        itemConfiguration: { numberOfItems: 10, excludedItemIds: [] },
        administrators: { 'admin@example.com': { owner: true } }
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.isAdministrator.mockReturnValue(true);

      await expect(
        itemService.assignItemId('A5ohYrHe', 'item1', 5, 'admin@example.com')
      ).rejects.toThrow('Item ID 5 is already assigned to another item');
    });
  });

  describe('updateItem', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      eventService.validateEventId.mockReturnValue({ valid: true });
    });

    it('should update item successfully', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started',
        items: [
          { id: 'item1', name: 'Item 1', price: 50, description: 'Old', ownerEmail: 'user@example.com', itemId: null }
        ],
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);

      const result = await itemService.updateItem('A5ohYrHe', 'item1', {
        name: 'Updated Item',
        price: 60,
        description: 'New description'
      }, 'user@example.com');

      expect(result.name).toBe('Updated Item');
      expect(result.price).toBe(60);
      expect(result.description).toBe('New description');
      expect(cacheService.setWithPersist).toHaveBeenCalled();
    });

    it('should throw error when user is not owner', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started',
        items: [
          { id: 'item1', name: 'Item 1', ownerEmail: 'owner@example.com', itemId: null }
        ]
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      await expect(
        itemService.updateItem('A5ohYrHe', 'item1', { name: 'Updated' }, 'other@example.com')
      ).rejects.toThrow('Only the item owner can update this item');
    });

    it('should throw error when event is not in created/started state', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'paused',
        items: [
          { id: 'item1', name: 'Item 1', ownerEmail: 'user@example.com', itemId: null }
        ]
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      await expect(
        itemService.updateItem('A5ohYrHe', 'item1', { name: 'Updated' }, 'user@example.com')
      ).rejects.toThrow('not allowed when event is in "paused" state');
    });
  });

  describe('deleteItem', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      eventService.validateEventId.mockReturnValue({ valid: true });
    });

    it('should delete item successfully', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started',
        items: [
          { id: 'item1', name: 'Item 1', ownerEmail: 'user@example.com', itemId: null }
        ],
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);

      const result = await itemService.deleteItem('A5ohYrHe', 'item1', 'user@example.com');

      expect(result.message).toBe('Item deleted successfully');
      expect(mockEvent.items).toHaveLength(0);
      expect(cacheService.setWithPersist).toHaveBeenCalled();
    });

    it('should handle itemId reassignment when item with assigned itemId is deleted', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started',
        items: [
          { id: 'item1', name: 'Item 1', ownerEmail: 'user@example.com', itemId: 5 }
        ],
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);

      await itemService.deleteItem('A5ohYrHe', 'item1', 'user@example.com');

      // Item is deleted, itemId 5 becomes available for reassignment
      // (no special handling needed - itemId is removed with the item)
      expect(mockEvent.items).toHaveLength(0);
    });

    it('should throw error when user is not owner', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started',
        items: [
          { id: 'item1', name: 'Item 1', ownerEmail: 'owner@example.com', itemId: null }
        ]
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      await expect(
        itemService.deleteItem('A5ohYrHe', 'item1', 'other@example.com')
      ).rejects.toThrow('Only the item owner can delete this item');
    });
  });

  describe('getItemByItemId', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      eventService.validateEventId.mockReturnValue({ valid: true });
    });

    it('should get item by assigned itemId successfully', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'completed',
        items: [
          { id: 'item1', name: 'Item 1', price: 50, description: 'Desc', ownerEmail: 'user@example.com', itemId: 5 }
        ]
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      const result = await itemService.getItemByItemId('A5ohYrHe', 5);

      expect(result).toEqual(mockEvent.items[0]);
    });

    it('should throw error when event is not in completed state (non-admin)', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started',
        items: []
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      await expect(
        itemService.getItemByItemId('A5ohYrHe', 5, false)
      ).rejects.toThrow('only available when event is in "completed" state');
    });

    it('should allow admin to view item details in any event state', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started', // Not completed
        items: [
          { id: 'item1', name: 'Item 1', itemId: 5 }
        ]
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      // Admin should be able to view regardless of state
      const result = await itemService.getItemByItemId('A5ohYrHe', 5, true);
      expect(result).toEqual(mockEvent.items[0]);
    });

    it('should throw error when item not found', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'completed',
        items: [
          { id: 'item1', name: 'Item 1', itemId: 3 }
        ]
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      await expect(
        itemService.getItemByItemId('A5ohYrHe', 5)
      ).rejects.toThrow('Item with ID 5 not found');
    });
  });
});
