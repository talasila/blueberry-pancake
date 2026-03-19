import { describe, it, expect, beforeEach, vi } from 'vitest';
import eventAdminService from '../../src/services/EventAdminService.js';
import eventService from '../../src/services/EventService.js';
import dataRepository from '../../src/data/DynamoDBRepository.js';
import pinService from '../../src/services/PINService.js';

// Mock dependencies
vi.mock('../../src/services/EventService.js', () => ({
  default: {
    getEvent: vi.fn(),
    isAdministrator: vi.fn(),
    isOwner: vi.fn(),
    isValidEmail: vi.fn(),
    updateEvent: vi.fn()
  }
}));

vi.mock('../../src/data/DynamoDBRepository.js', () => ({
  default: {
    addAdministratorAtomic: vi.fn(),
    deleteRating: vi.fn(),
    deleteBookmarks: vi.fn(),
    deleteDashboardCache: vi.fn(),
    deleteAllSimilarUsersCache: vi.fn(),
    deleteAllBookmarks: vi.fn()
  }
}));

vi.mock('../../src/services/PINService.js', () => ({
  default: {
    generatePIN: vi.fn(() => '999888'),
    invalidatePINSessions: vi.fn()
  }
}));

vi.mock('../../src/logging/Logger.js', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock RatingService (dynamically imported)
vi.mock('../../src/services/RatingService.js', () => ({
  default: {
    getRatings: vi.fn().mockResolvedValue([]),
    deleteAllRatings: vi.fn().mockResolvedValue()
  }
}));

const VALID_EVENT_ID = 'ABCD1234';
const OWNER_EMAIL = 'owner@example.com';
const ADMIN_EMAIL = 'admin@example.com';
const USER_EMAIL = 'user@example.com';

function mockEvent(overrides = {}) {
  return {
    eventId: VALID_EVENT_ID,
    name: 'Test Event',
    state: 'started',
    administrators: {
      [OWNER_EMAIL]: { addedAt: '2024-01-01T00:00:00Z' },
      [ADMIN_EMAIL]: { addedAt: '2024-01-02T00:00:00Z' }
    },
    users: {
      [OWNER_EMAIL]: { name: 'Owner' },
      [ADMIN_EMAIL]: { name: 'Admin' },
      [USER_EMAIL]: { name: 'User' }
    },
    items: [],
    ...overrides
  };
}

describe('EventAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventService.isAdministrator.mockReturnValue(true);
    eventService.isOwner.mockReturnValue(false);
    eventService.isValidEmail.mockReturnValue(true);
    eventService.updateEvent.mockResolvedValue();
  });

  describe('getAdministrators', () => {
    it('should return administrators for a valid admin requester', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventAdminService.getAdministrators(VALID_EVENT_ID, ADMIN_EMAIL);
      expect(result).toEqual(event.administrators);
    });

    it('should reject when requester is not an administrator', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.isAdministrator.mockReturnValue(false);

      await expect(
        eventAdminService.getAdministrators(VALID_EVENT_ID, 'stranger@example.com')
      ).rejects.toThrow('Only administrators can view');
    });

    it('should reject invalid event ID', async () => {
      await expect(
        eventAdminService.getAdministrators('bad', ADMIN_EMAIL)
      ).rejects.toThrow('Invalid event ID');
    });

    it('should reject missing requester email', async () => {
      await expect(
        eventAdminService.getAdministrators(VALID_EVENT_ID, '')
      ).rejects.toThrow('Requester email is required');
    });

    it('should return empty object when no administrators exist', async () => {
      const event = mockEvent({ administrators: undefined });
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventAdminService.getAdministrators(VALID_EVENT_ID, ADMIN_EMAIL);
      expect(result).toEqual({});
    });
  });

  describe('addAdministrator', () => {
    it('should add a new administrator when requester is owner', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);
      eventService.isOwner.mockReturnValue(true);
      dataRepository.addAdministratorAtomic.mockResolvedValue({ added: true, alreadyExists: false });
      // Second getEvent call returns updated event
      eventService.getEvent.mockResolvedValueOnce(event).mockResolvedValueOnce({
        ...event,
        administrators: {
          ...event.administrators,
          'new@example.com': { addedAt: expect.any(String) }
        }
      });

      const result = await eventAdminService.addAdministrator(VALID_EVENT_ID, 'new@example.com', OWNER_EMAIL);
      expect(dataRepository.addAdministratorAtomic).toHaveBeenCalledWith(
        VALID_EVENT_ID,
        'new@example.com',
        expect.any(String)
      );
    });

    it('should reject when requester is a non-owner admin', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.isOwner.mockReturnValue(false);

      await expect(
        eventAdminService.addAdministrator(VALID_EVENT_ID, 'new@example.com', ADMIN_EMAIL)
      ).rejects.toThrow('Only the event owner can add administrators');
    });

    it('should reject when administrator already exists', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.isOwner.mockReturnValue(true);
      dataRepository.addAdministratorAtomic.mockResolvedValue({ added: false, alreadyExists: true });

      await expect(
        eventAdminService.addAdministrator(VALID_EVENT_ID, ADMIN_EMAIL, OWNER_EMAIL)
      ).rejects.toThrow('already exists');
    });

    it('should reject when requester is not an admin at all', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.isOwner.mockReturnValue(false);

      await expect(
        eventAdminService.addAdministrator(VALID_EVENT_ID, 'new@example.com', 'nobody@example.com')
      ).rejects.toThrow('Only the event owner can add administrators');
    });

    it('should reject invalid email format', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.isOwner.mockReturnValue(true);
      eventService.isValidEmail.mockReturnValue(false);

      await expect(
        eventAdminService.addAdministrator(VALID_EVENT_ID, 'not-valid', OWNER_EMAIL)
      ).rejects.toThrow('Invalid email address format');
    });

    it('should reject empty email', async () => {
      await expect(
        eventAdminService.addAdministrator(VALID_EVENT_ID, '  ', OWNER_EMAIL)
      ).rejects.toThrow('Email address cannot be empty');
    });

    it('should trim email before processing', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.isOwner.mockReturnValue(true);
      dataRepository.addAdministratorAtomic.mockResolvedValue({ added: true, alreadyExists: false });
      eventService.getEvent.mockResolvedValue(mockEvent());

      await eventAdminService.addAdministrator(VALID_EVENT_ID, '  new@example.com  ', OWNER_EMAIL);
      expect(dataRepository.addAdministratorAtomic).toHaveBeenCalledWith(
        VALID_EVENT_ID,
        'new@example.com',
        expect.any(String)
      );
    });
  });

  describe('deleteAdministrator', () => {
    it('should delete a non-owner administrator', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      await eventAdminService.deleteAdministrator(VALID_EVENT_ID, ADMIN_EMAIL, OWNER_EMAIL);
      expect(eventService.updateEvent).toHaveBeenCalled();
    });

    it('should reject deleting the owner', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.isOwner.mockImplementation((event, email) => email === OWNER_EMAIL);

      await expect(
        eventAdminService.deleteAdministrator(VALID_EVENT_ID, OWNER_EMAIL, ADMIN_EMAIL)
      ).rejects.toThrow('Cannot delete owner');
    });

    it('should reject deleting the last administrator', async () => {
      const event = mockEvent({
        administrators: { [ADMIN_EMAIL]: { addedAt: '2024-01-01T00:00:00Z' } }
      });
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventAdminService.deleteAdministrator(VALID_EVENT_ID, ADMIN_EMAIL, ADMIN_EMAIL)
      ).rejects.toThrow('Cannot delete last administrator');
    });

    it('should reject when target admin does not exist', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());

      await expect(
        eventAdminService.deleteAdministrator(VALID_EVENT_ID, 'ghost@example.com', OWNER_EMAIL)
      ).rejects.toThrow('not found');
    });

    it('should also remove admin from users section', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      await eventAdminService.deleteAdministrator(VALID_EVENT_ID, ADMIN_EMAIL, OWNER_EMAIL);

      // The event passed to updateEvent should not contain the deleted admin in users
      const updatedEvent = eventService.updateEvent.mock.calls[0][1];
      expect(updatedEvent.users[ADMIN_EMAIL]).toBeUndefined();
      expect(updatedEvent.administrators[ADMIN_EMAIL]).toBeUndefined();
    });
  });

  describe('regeneratePIN', () => {
    it('should generate a new PIN for authorized admin', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.updateEvent.mockResolvedValue();
      pinService.invalidatePINSessions.mockResolvedValue();

      const result = await eventAdminService.regeneratePIN(VALID_EVENT_ID, ADMIN_EMAIL);
      expect(result.pin).toBe('999888');
      expect(result.eventId).toBe(VALID_EVENT_ID);
      expect(result.message).toBe('PIN regenerated successfully');
    });

    it('should invalidate existing PIN sessions', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.updateEvent.mockResolvedValue();
      pinService.invalidatePINSessions.mockResolvedValue();

      await eventAdminService.regeneratePIN(VALID_EVENT_ID, ADMIN_EMAIL);
      expect(pinService.invalidatePINSessions).toHaveBeenCalledWith(VALID_EVENT_ID);
    });

    it('should reject non-admin requester', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.isAdministrator.mockReturnValue(false);

      await expect(
        eventAdminService.regeneratePIN(VALID_EVENT_ID, 'nobody@example.com')
      ).rejects.toThrow('administrator');
    });

    it('should throw event not found for missing events', async () => {
      eventService.getEvent.mockRejectedValue(new Error('Event not found'));

      await expect(
        eventAdminService.regeneratePIN(VALID_EVENT_ID, ADMIN_EMAIL)
      ).rejects.toThrow('Event not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete a regular user and their data', async () => {
      const event = mockEvent({
        items: [
          { ownerEmail: USER_EMAIL, name: 'Wine A' },
          { ownerEmail: ADMIN_EMAIL, name: 'Wine B' }
        ]
      });
      eventService.getEvent.mockResolvedValue(event);

      const ratingService = (await import('../../src/services/RatingService.js')).default;
      ratingService.getRatings.mockResolvedValue([
        { email: USER_EMAIL, itemId: 1, rating: 3 },
        { email: ADMIN_EMAIL, itemId: 1, rating: 4 }
      ]);
      dataRepository.deleteRating.mockResolvedValue();
      dataRepository.deleteBookmarks.mockResolvedValue();

      const result = await eventAdminService.deleteUser(VALID_EVENT_ID, USER_EMAIL, ADMIN_EMAIL);

      expect(result.success).toBe(true);
      expect(result.itemsDeleted).toBe(1);
      expect(result.ratingsDeleted).toBe(1);
    });

    it('should reject deleting the owner', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.isOwner.mockImplementation((event, email) => email === OWNER_EMAIL);

      await expect(
        eventAdminService.deleteUser(VALID_EVENT_ID, OWNER_EMAIL, ADMIN_EMAIL)
      ).rejects.toThrow('Cannot delete owner');
    });

    it('should reject when user does not exist', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());

      await expect(
        eventAdminService.deleteUser(VALID_EVENT_ID, 'ghost@example.com', ADMIN_EMAIL)
      ).rejects.toThrow('not found');
    });

    it('should reject when requester is not admin', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.isAdministrator.mockReturnValue(false);

      await expect(
        eventAdminService.deleteUser(VALID_EVENT_ID, USER_EMAIL, 'nobody@example.com')
      ).rejects.toThrow('Only event administrators');
    });

    it('should prevent deleting the last administrator', async () => {
      const event = mockEvent({
        administrators: { [ADMIN_EMAIL]: { addedAt: '2024-01-01T00:00:00Z' } },
        users: { [ADMIN_EMAIL]: { name: 'Admin' }, [USER_EMAIL]: { name: 'User' } }
      });
      eventService.getEvent.mockResolvedValue(event);

      await expect(
        eventAdminService.deleteUser(VALID_EVENT_ID, ADMIN_EMAIL, ADMIN_EMAIL)
      ).rejects.toThrow('Cannot delete last administrator');
    });

    it('should invalidate caches when ratings were deleted', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      const ratingService = (await import('../../src/services/RatingService.js')).default;
      ratingService.getRatings.mockResolvedValue([
        { email: USER_EMAIL, itemId: 1, rating: 3 }
      ]);
      dataRepository.deleteRating.mockResolvedValue();
      dataRepository.deleteBookmarks.mockResolvedValue();
      dataRepository.deleteDashboardCache.mockResolvedValue();
      dataRepository.deleteAllSimilarUsersCache.mockResolvedValue();

      await eventAdminService.deleteUser(VALID_EVENT_ID, USER_EMAIL, ADMIN_EMAIL);

      expect(dataRepository.deleteDashboardCache).toHaveBeenCalledWith(VALID_EVENT_ID);
      expect(dataRepository.deleteAllSimilarUsersCache).toHaveBeenCalledWith(VALID_EVENT_ID);
    });
  });

  describe('deleteAllUsers', () => {
    it('should delete all non-admin users', async () => {
      const event = mockEvent();
      eventService.getEvent.mockResolvedValue(event);

      const ratingService = (await import('../../src/services/RatingService.js')).default;
      ratingService.getRatings.mockResolvedValue([
        { email: USER_EMAIL, itemId: 1, rating: 3 }
      ]);
      dataRepository.deleteRating.mockResolvedValue();
      dataRepository.deleteBookmarks.mockResolvedValue();

      const result = await eventAdminService.deleteAllUsers(VALID_EVENT_ID, ADMIN_EMAIL);

      expect(result.success).toBe(true);
      expect(result.usersDeleted).toBe(1); // Only USER_EMAIL, admins excluded
    });

    it('should return zero when no non-admin users exist', async () => {
      const event = mockEvent({
        users: {
          [OWNER_EMAIL]: { name: 'Owner' },
          [ADMIN_EMAIL]: { name: 'Admin' }
        }
      });
      eventService.getEvent.mockResolvedValue(event);

      const result = await eventAdminService.deleteAllUsers(VALID_EVENT_ID, ADMIN_EMAIL);
      expect(result.usersDeleted).toBe(0);
      expect(result.message).toBe('No users to delete');
    });

    it('should reject when requester is not admin', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.isAdministrator.mockReturnValue(false);

      await expect(
        eventAdminService.deleteAllUsers(VALID_EVENT_ID, 'nobody@example.com')
      ).rejects.toThrow('Only event administrators');
    });
  });

  describe('deleteAllRatingsAndBookmarks', () => {
    it('should delete all ratings and bookmarks', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      dataRepository.deleteAllBookmarks.mockResolvedValue();

      const result = await eventAdminService.deleteAllRatingsAndBookmarks(VALID_EVENT_ID, ADMIN_EMAIL);
      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
    });

    it('should reject when requester is not admin', async () => {
      eventService.getEvent.mockResolvedValue(mockEvent());
      eventService.isAdministrator.mockReturnValue(false);

      await expect(
        eventAdminService.deleteAllRatingsAndBookmarks(VALID_EVENT_ID, 'nobody@example.com')
      ).rejects.toThrow('Only event administrators');
    });
  });

  describe('deleteAllBookmarks', () => {
    it('should delete all bookmarks for an event', async () => {
      dataRepository.deleteAllBookmarks.mockResolvedValue();
      await eventAdminService.deleteAllBookmarks(VALID_EVENT_ID);
      expect(dataRepository.deleteAllBookmarks).toHaveBeenCalledWith(VALID_EVENT_ID);
    });

    it('should reject invalid event ID', async () => {
      await expect(eventAdminService.deleteAllBookmarks('bad')).rejects.toThrow('Invalid event ID');
    });
  });

  describe('normalizeEmail', () => {
    it('should lowercase and trim email', () => {
      expect(eventAdminService.normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    });
  });
});
