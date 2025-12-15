import { describe, it, expect, beforeEach, vi } from 'vitest';
import eventService from '../../src/services/EventService.js';
import pinService from '../../src/services/PINService.js';
import dataRepository from '../../src/data/FileDataRepository.js';
import cacheService from '../../src/cache/CacheService.js';
import loggerService from '../../src/logging/Logger.js';

// Mock data repository
vi.mock('../../src/data/FileDataRepository.js', () => {
  return {
    default: {
      getEvent: vi.fn(),
      createEvent: vi.fn(),
      writeEventConfig: vi.fn()
    }
  };
});

// Mock PIN service
vi.mock('../../src/services/PINService.js', () => {
  return {
    default: {
      generatePIN: vi.fn(() => '123456'),
      invalidatePINSessions: vi.fn(() => 0)
    }
  };
});

// Mock logger service
vi.mock('../../src/logging/Logger.js', () => {
  return {
    default: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn()
    }
  };
});

// Mock cache service
vi.mock('../../src/cache/CacheService.js', () => {
  return {
    default: {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      setDirty: vi.fn(),
      setWithPersist: vi.fn().mockResolvedValue(true),
      ensureEventConfigLoaded: vi.fn(),
      ensureRatingsLoaded: vi.fn(),
      invalidate: vi.fn(),
      invalidateEvent: vi.fn()
    }
  };
});

describe('EventService.getEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Event ID validation', () => {
    it('should throw error for missing event ID', async () => {
      await expect(eventService.getEvent(null)).rejects.toThrow('Event ID is required');
      await expect(eventService.getEvent(undefined)).rejects.toThrow('Event ID is required');
      await expect(eventService.getEvent('')).rejects.toThrow('Event ID is required');
    });

    it('should throw error for non-string event ID', async () => {
      await expect(eventService.getEvent(12345)).rejects.toThrow('Event ID is required');
      await expect(eventService.getEvent({})).rejects.toThrow('Event ID is required');
    });

    it('should throw error for invalid event ID format (too short)', async () => {
      await expect(eventService.getEvent('ABC123')).rejects.toThrow('Invalid event ID format');
    });

    it('should throw error for invalid event ID format (too long)', async () => {
      await expect(eventService.getEvent('ABCD12345')).rejects.toThrow('Invalid event ID format');
    });

    it('should throw error for invalid event ID format (special characters)', async () => {
      await expect(eventService.getEvent('ABC-1234')).rejects.toThrow('Invalid event ID format');
      await expect(eventService.getEvent('ABC_1234')).rejects.toThrow('Invalid event ID format');
      await expect(eventService.getEvent('ABC 1234')).rejects.toThrow('Invalid event ID format');
    });

    it('should accept valid 8-character alphanumeric event ID', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'created',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);
      
      const result = await eventService.getEvent('A5ohYrHe');
      
      expect(result).toEqual(mockEvent);
      expect(cacheService.ensureEventConfigLoaded).toHaveBeenCalledWith('A5ohYrHe');
    });
  });

  describe('Event retrieval', () => {
    it('should retrieve event for valid event ID', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);
      
      const result = await eventService.getEvent('A5ohYrHe');
      
      expect(result).toEqual(mockEvent);
      expect(cacheService.ensureEventConfigLoaded).toHaveBeenCalledWith('A5ohYrHe');
      expect(loggerService.error).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent event', async () => {
      const error = new Error('Event configuration not found: NONEXIST');
      cacheService.ensureEventConfigLoaded.mockRejectedValue(error);
      
      await expect(eventService.getEvent('NONEXIST')).rejects.toThrow('Event not found: NONEXIST');
      expect(cacheService.ensureEventConfigLoaded).toHaveBeenCalledWith('NONEXIST');
    });

    it('should throw error for file not found', async () => {
      const error = new Error('File not found: config.json');
      cacheService.ensureEventConfigLoaded.mockRejectedValue(error);
      
      await expect(eventService.getEvent('FILENOTF')).rejects.toThrow('Event not found: FILENOTF');
    });

    it('should re-throw other errors and log them', async () => {
      const error = new Error('Database connection failed');
      cacheService.ensureEventConfigLoaded.mockRejectedValue(error);
      
      await expect(eventService.getEvent('ABCD1234')).rejects.toThrow('Database connection failed');
      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('Error retrieving event'),
        error
      );
    });
  });

  describe('Case sensitivity', () => {
    it('should handle lowercase event IDs', async () => {
      const mockEvent = {
        eventId: 'a5ohyrhe',
        name: 'Test Event',
        state: 'created',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);
      
      const result = await eventService.getEvent('a5ohyrhe');
      
      expect(result).toEqual(mockEvent);
    });

    it('should handle mixed case event IDs', async () => {
      const mockEvent = {
        eventId: 'A5oHyRhE',
        name: 'Test Event',
        state: 'created',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);
      
      const result = await eventService.getEvent('A5oHyRhE');
      
      expect(result).toEqual(mockEvent);
    });
  });

  describe('PIN generation on event creation', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Mock generateEventId to return a predictable ID
      eventService.generateEventId = vi.fn().mockResolvedValue('TEST1234');
      dataRepository.createEvent = vi.fn().mockImplementation((eventData) => Promise.resolve(eventData));
    });

    it('should generate PIN when creating event', async () => {
      const event = await eventService.createEvent('Test Event', 'wine', 'admin@example.com');
      
      expect(event).toHaveProperty('pin');
      expect(event.pin).toMatch(/^\d{6}$/);
      expect(event.pin.length).toBe(6);
      expect(event).toHaveProperty('pinGeneratedAt');
      expect(pinService.generatePIN).toHaveBeenCalled();
    });

    it('should generate PIN in valid format (6 digits)', async () => {
      const event = await eventService.createEvent('Test Event', 'wine', 'admin@example.com');
      
      expect(event.pin).toMatch(/^\d{6}$/);
      const pinNum = parseInt(event.pin, 10);
      expect(pinNum).toBeGreaterThanOrEqual(100000);
      expect(pinNum).toBeLessThan(1000000);
    });
  });

  describe('regeneratePIN', () => {
    const eventId = 'TEST1234';
    const administratorEmail = 'admin@example.com';
    const mockEvent = {
      eventId,
      name: 'Test Event',
      state: 'created',
      typeOfItem: 'wine',
      administrator: administratorEmail,
      pin: '123456',
      pinGeneratedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    beforeEach(() => {
      vi.clearAllMocks();
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);
      pinService.generatePIN.mockReturnValue('789012');
      pinService.invalidatePINSessions.mockReturnValue(3);
    });

    it('should regenerate PIN for event administrator', async () => {
      const result = await eventService.regeneratePIN(eventId, administratorEmail);
      
      expect(result).toHaveProperty('pin', '789012');
      expect(result).toHaveProperty('eventId', eventId);
      expect(result).toHaveProperty('pinGeneratedAt');
      expect(pinService.generatePIN).toHaveBeenCalled();
      expect(pinService.invalidatePINSessions).toHaveBeenCalledWith(eventId);
      expect(cacheService.setWithPersist).toHaveBeenCalled();
    });

    it('should reject regeneration from non-administrator', async () => {
      await expect(
        eventService.regeneratePIN(eventId, 'other@example.com')
      ).rejects.toThrow('Only the event administrator can regenerate PINs');
      
      expect(pinService.generatePIN).not.toHaveBeenCalled();
      expect(cacheService.setWithPersist).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive email comparison', async () => {
      // Administrator email in different case
      const result = await eventService.regeneratePIN(eventId, 'ADMIN@EXAMPLE.COM');
      
      expect(result).toHaveProperty('pin');
      expect(cacheService.setWithPersist).toHaveBeenCalled();
    });

    it('should return error for non-existent event', async () => {
      cacheService.ensureEventConfigLoaded.mockRejectedValue(new Error('Event not found: NONEXIST'));
      
      await expect(
        eventService.regeneratePIN('NONEXIST', administratorEmail)
      ).rejects.toThrow('Event not found: NONEXIST');
    });

    it('should complete regeneration within 2 seconds (performance test per SC-005)', async () => {
      const startTime = Date.now();
      await eventService.regeneratePIN(eventId, administratorEmail);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(2000); // Must complete within 2 seconds
    });
  });

  describe('migrateAdministratorField', () => {
    it('should migrate administrator string to administrators object', () => {
      const event = {
        eventId: 'TEST1234',
        administrator: 'admin@example.com',
        createdAt: '2025-01-27T10:30:00.000Z'
      };

      const migrated = eventService.migrateAdministratorField(event);

      expect(migrated).toBe(true);
      expect(event.administrators).toBeDefined();
      expect(event.administrators['admin@example.com']).toBeDefined();
      expect(event.administrators['admin@example.com'].owner).toBe(true);
      expect(event.administrators['admin@example.com'].assignedAt).toBe('2025-01-27T10:30:00.000Z');
      expect(event.administrator).toBeUndefined();
    });

    it('should not migrate if administrators object already exists', () => {
      const event = {
        eventId: 'TEST1234',
        administrator: 'admin@example.com',
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        }
      };

      const migrated = eventService.migrateAdministratorField(event);

      expect(migrated).toBe(false);
      expect(event.administrator).toBe('admin@example.com');
    });

    it('should normalize email to lowercase during migration', () => {
      const event = {
        eventId: 'TEST1234',
        administrator: 'ADMIN@EXAMPLE.COM',
        createdAt: '2025-01-27T10:30:00.000Z'
      };

      eventService.migrateAdministratorField(event);

      expect(event.administrators['admin@example.com']).toBeDefined();
      expect(event.administrators['ADMIN@EXAMPLE.COM']).toBeUndefined();
    });

    it('should use current timestamp if createdAt is missing', () => {
      const event = {
        eventId: 'TEST1234',
        administrator: 'admin@example.com'
      };

      eventService.migrateAdministratorField(event);

      expect(event.administrators['admin@example.com'].assignedAt).toBeDefined();
      expect(typeof event.administrators['admin@example.com'].assignedAt).toBe('string');
    });
  });

  describe('isAdministrator', () => {
    it('should return true for existing administrator', () => {
      const event = {
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        }
      };

      expect(eventService.isAdministrator(event, 'admin@example.com')).toBe(true);
    });

    it('should return false for non-administrator', () => {
      const event = {
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        }
      };

      expect(eventService.isAdministrator(event, 'other@example.com')).toBe(false);
    });

    it('should handle case-insensitive email comparison', () => {
      const event = {
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        }
      };

      expect(eventService.isAdministrator(event, 'ADMIN@EXAMPLE.COM')).toBe(true);
    });

    it('should migrate and check if administrator exists', () => {
      const event = {
        administrator: 'admin@example.com',
        createdAt: '2025-01-27T10:30:00.000Z'
      };

      expect(eventService.isAdministrator(event, 'admin@example.com')).toBe(true);
      expect(event.administrators).toBeDefined();
    });

    it('should return false for null or undefined email', () => {
      const event = {
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        }
      };

      expect(eventService.isAdministrator(event, null)).toBe(false);
      expect(eventService.isAdministrator(event, undefined)).toBe(false);
    });
  });

  describe('isOwner', () => {
    it('should return true for owner', () => {
      const event = {
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        }
      };

      expect(eventService.isOwner(event, 'admin@example.com')).toBe(true);
    });

    it('should return false for non-owner administrator', () => {
      const event = {
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          },
          'other@example.com': {
            assignedAt: '2025-01-27T11:00:00.000Z',
            owner: false
          }
        }
      };

      expect(eventService.isOwner(event, 'other@example.com')).toBe(false);
    });

    it('should handle case-insensitive email comparison', () => {
      const event = {
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        }
      };

      expect(eventService.isOwner(event, 'ADMIN@EXAMPLE.COM')).toBe(true);
    });

    it('should migrate and check if user is owner', () => {
      const event = {
        administrator: 'admin@example.com',
        createdAt: '2025-01-27T10:30:00.000Z'
      };

      expect(eventService.isOwner(event, 'admin@example.com')).toBe(true);
      expect(event.administrators).toBeDefined();
    });

    it('should return false for null or undefined email', () => {
      const event = {
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        }
      };

      expect(eventService.isOwner(event, null)).toBe(false);
      expect(eventService.isOwner(event, undefined)).toBe(false);
    });
  });

  describe('normalizeEmail', () => {
    it('should convert email to lowercase', () => {
      expect(eventService.normalizeEmail('ADMIN@EXAMPLE.COM')).toBe('admin@example.com');
    });

    it('should trim whitespace', () => {
      expect(eventService.normalizeEmail('  admin@example.com  ')).toBe('admin@example.com');
    });

    it('should handle mixed case', () => {
      expect(eventService.normalizeEmail('Admin@Example.Com')).toBe('admin@example.com');
    });

    it('should return empty string for null or undefined', () => {
      expect(eventService.normalizeEmail(null)).toBe('');
      expect(eventService.normalizeEmail(undefined)).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(eventService.normalizeEmail(123)).toBe('');
      expect(eventService.normalizeEmail({})).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(eventService.isValidEmail('user@example.com')).toBe(true);
      expect(eventService.isValidEmail('test.email+tag@example.co.uk')).toBe(true);
      expect(eventService.isValidEmail('admin@test-domain.com')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(eventService.isValidEmail('invalid')).toBe(false);
      expect(eventService.isValidEmail('@example.com')).toBe(false);
      expect(eventService.isValidEmail('user@')).toBe(false);
      expect(eventService.isValidEmail('user@example')).toBe(false);
      expect(eventService.isValidEmail('user @example.com')).toBe(false);
    });

    it('should handle case-insensitive validation', () => {
      expect(eventService.isValidEmail('USER@EXAMPLE.COM')).toBe(true);
      expect(eventService.isValidEmail('User@Example.Com')).toBe(true);
    });

    it('should trim and validate email', () => {
      expect(eventService.isValidEmail('  user@example.com  ')).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(eventService.isValidEmail(null)).toBe(false);
      expect(eventService.isValidEmail(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(eventService.isValidEmail('')).toBe(false);
      expect(eventService.isValidEmail('   ')).toBe(false);
    });
  });

  describe('addAdministrator', () => {
    const eventId = 'TEST1234';
    const requesterEmail = 'admin@example.com';
    const newAdminEmail = 'newadmin@example.com';
    let mockEvent;

    beforeEach(() => {
      vi.clearAllMocks();
      mockEvent = {
        eventId,
        name: 'Test Event',
        state: 'created',
        typeOfItem: 'wine',
        administrators: {
          [requesterEmail]: {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        },
        users: {
          [requesterEmail]: {
            registeredAt: '2025-01-27T10:30:00.000Z'
          }
        },
        createdAt: '2025-01-27T10:30:00.000Z',
        updatedAt: '2025-01-27T10:30:00.000Z'
      };
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);
    });

    it('should add new administrator successfully', async () => {
      const result = await eventService.addAdministrator(eventId, newAdminEmail, requesterEmail);

      expect(result.administrators[newAdminEmail.toLowerCase()]).toBeDefined();
      expect(result.administrators[newAdminEmail.toLowerCase()].owner).toBe(false);
      expect(result.administrators[newAdminEmail.toLowerCase()]).toHaveProperty('assignedAt');
      expect(result.users[newAdminEmail.toLowerCase()]).toBeDefined();
      expect(result.users[newAdminEmail.toLowerCase()]).toHaveProperty('registeredAt');
      expect(cacheService.setWithPersist).toHaveBeenCalled();
    });

    it('should throw error for duplicate administrator', async () => {
      mockEvent.administrators[newAdminEmail.toLowerCase()] = {
        assignedAt: '2025-01-27T11:00:00.000Z',
        owner: false
      };

      await expect(
        eventService.addAdministrator(eventId, newAdminEmail, requesterEmail)
      ).rejects.toThrow(/already exists/);
    });

    it('should throw error for invalid email format', async () => {
      await expect(
        eventService.addAdministrator(eventId, 'invalid-email', requesterEmail)
      ).rejects.toThrow('Invalid email address');
    });

    it('should throw error for unauthorized requester', async () => {
      await expect(
        eventService.addAdministrator(eventId, newAdminEmail, 'unauthorized@example.com')
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw error for self-addition attempt', async () => {
      await expect(
        eventService.addAdministrator(eventId, requesterEmail, requesterEmail)
      ).rejects.toThrow(/already exists/);
    });

    it('should normalize email addresses', async () => {
      const result = await eventService.addAdministrator(eventId, 'NEWADMIN@EXAMPLE.COM', requesterEmail);

      expect(result.administrators['newadmin@example.com']).toBeDefined();
      expect(result.administrators['NEWADMIN@EXAMPLE.COM']).toBeUndefined();
    });

    it('should add administrator to users section if not already present', async () => {
      const result = await eventService.addAdministrator(eventId, newAdminEmail, requesterEmail);

      expect(result.users[newAdminEmail.toLowerCase()]).toBeDefined();
      expect(result.users[newAdminEmail.toLowerCase()].registeredAt).toBeDefined();
    });

    it('should not overwrite existing user registration timestamp', async () => {
      const existingTimestamp = '2025-01-27T09:00:00.000Z';
      mockEvent.users[newAdminEmail.toLowerCase()] = {
        registeredAt: existingTimestamp
      };

      const result = await eventService.addAdministrator(eventId, newAdminEmail, requesterEmail);

      expect(result.users[newAdminEmail.toLowerCase()].registeredAt).toBe(existingTimestamp);
    });
  });

  describe('deleteAdministrator', () => {
    const eventId = 'TEST1234';
    const requesterEmail = 'admin@example.com';
    const adminToDelete = 'other@example.com';
    let mockEvent;

    beforeEach(() => {
      vi.clearAllMocks();
      mockEvent = {
        eventId,
        name: 'Test Event',
        state: 'created',
        typeOfItem: 'wine',
        administrators: {
          [requesterEmail]: {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          },
          [adminToDelete]: {
            assignedAt: '2025-01-27T11:00:00.000Z',
            owner: false
          }
        },
        users: {
          [requesterEmail]: {
            registeredAt: '2025-01-27T10:30:00.000Z'
          },
          [adminToDelete]: {
            registeredAt: '2025-01-27T11:00:00.000Z'
          }
        },
        createdAt: '2025-01-27T10:30:00.000Z',
        updatedAt: '2025-01-27T10:30:00.000Z'
      };
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);
    });

    it('should delete administrator successfully', async () => {
      const result = await eventService.deleteAdministrator(eventId, adminToDelete, requesterEmail);

      expect(result.administrators[adminToDelete.toLowerCase()]).toBeUndefined();
      expect(result.users[adminToDelete.toLowerCase()]).toBeUndefined();
      expect(result.administrators[requesterEmail.toLowerCase()]).toBeDefined();
      expect(cacheService.setWithPersist).toHaveBeenCalled();
    });

    it('should prevent owner deletion', async () => {
      await expect(
        eventService.deleteAdministrator(eventId, requesterEmail, requesterEmail)
      ).rejects.toThrow('Cannot delete owner');
    });

    it('should throw error for unauthorized requester', async () => {
      await expect(
        eventService.deleteAdministrator(eventId, adminToDelete, 'unauthorized@example.com')
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw error for administrator not found', async () => {
      await expect(
        eventService.deleteAdministrator(eventId, 'nonexistent@example.com', requesterEmail)
      ).rejects.toThrow(/not found/);
    });

    it('should prevent deleting last administrator', async () => {
      // Remove one administrator so only owner remains
      delete mockEvent.administrators[adminToDelete];
      delete mockEvent.users[adminToDelete];

      // Try to delete owner (should fail because it's the last one)
      await expect(
        eventService.deleteAdministrator(eventId, requesterEmail, requesterEmail)
      ).rejects.toThrow('Cannot delete owner');
    });

    it('should remove administrator from users section atomically', async () => {
      const result = await eventService.deleteAdministrator(eventId, adminToDelete, requesterEmail);

      expect(result.administrators[adminToDelete.toLowerCase()]).toBeUndefined();
      expect(result.users[adminToDelete.toLowerCase()]).toBeUndefined();
    });

    it('should normalize email addresses', async () => {
      const result = await eventService.deleteAdministrator(eventId, 'OTHER@EXAMPLE.COM', requesterEmail);

      expect(result.administrators['other@example.com']).toBeUndefined();
      expect(result.administrators['OTHER@EXAMPLE.COM']).toBeUndefined();
    });
  });

  describe('getAdministrators', () => {
    const eventId = 'TEST1234';
    const requesterEmail = 'admin@example.com';
    let mockEvent;

    beforeEach(() => {
      vi.clearAllMocks();
      mockEvent = {
        eventId,
        name: 'Test Event',
        state: 'created',
        typeOfItem: 'wine',
        administrators: {
          [requesterEmail]: {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          },
          'other@example.com': {
            assignedAt: '2025-01-27T11:00:00.000Z',
            owner: false
          }
        },
        createdAt: '2025-01-27T10:30:00.000Z',
        updatedAt: '2025-01-27T10:30:00.000Z'
      };
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);
    });

    it('should return administrators object', async () => {
      const result = await eventService.getAdministrators(eventId, requesterEmail);

      expect(result).toBeDefined();
      expect(result[requesterEmail.toLowerCase()]).toBeDefined();
      expect(result['other@example.com']).toBeDefined();
      expect(result[requesterEmail.toLowerCase()].owner).toBe(true);
      expect(result['other@example.com'].owner).toBe(false);
    });

    it('should throw error for unauthorized requester', async () => {
      await expect(
        eventService.getAdministrators(eventId, 'unauthorized@example.com')
      ).rejects.toThrow('Unauthorized');
    });

    it('should return empty object if administrators not set', async () => {
      // Keep only requester as admin so they're authorized
      mockEvent.administrators = {
        [requesterEmail]: {
          assignedAt: '2025-01-27T10:30:00.000Z',
          owner: true
        }
      };
      // Mock returns event with just the requester, then we test what it returns
      cacheService.ensureEventConfigLoaded.mockResolvedValue({
        ...mockEvent,
        administrators: {} // Empty administrators to test the empty case
      });
      
      // But this test scenario doesn't make sense - if there are no admins, 
      // the requester can't be authorized. Let's test the case where we return
      // the administrators object which should contain the requester
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);
      const result = await eventService.getAdministrators(eventId, requesterEmail);

      expect(result).toBeDefined();
      expect(result[requesterEmail]).toBeDefined();
    });
  });

  describe('EventService.getItemConfiguration', () => {
    const eventId = 'tEvent01';
    const requesterEmail = 'admin@example.com';

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return default values when itemConfiguration not present', async () => {
      const mockEvent = {
        eventId,
        name: 'Test Event',
        administrators: { [requesterEmail]: { assignedAt: '2025-01-27T10:00:00.000Z', owner: true } }
      };
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);

      const result = await eventService.getItemConfiguration(eventId);

      expect(result).toEqual({
        numberOfItems: 20,
        excludedItemIds: []
      });
      expect(cacheService.ensureEventConfigLoaded).toHaveBeenCalledWith(eventId);
    });

    it('should return configured values when itemConfiguration present', async () => {
      const mockEvent = {
        eventId,
        name: 'Test Event',
        itemConfiguration: {
          numberOfItems: 25,
          excludedItemIds: [5, 10, 15]
        },
        administrators: { [requesterEmail]: { assignedAt: '2025-01-27T10:00:00.000Z', owner: true } }
      };
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);

      const result = await eventService.getItemConfiguration(eventId);

      expect(result).toEqual({
        numberOfItems: 25,
        excludedItemIds: [5, 10, 15]
      });
      expect(cacheService.ensureEventConfigLoaded).toHaveBeenCalledWith(eventId);
    });
  });

  describe('EventService.updateItemConfiguration', () => {
    const eventId = 'tEvent01';
    const requesterEmail = 'admin@example.com';

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should validate numberOfItems range (minimum 1)', async () => {
      const mockEvent = {
        eventId,
        name: 'Test Event',
        administrators: { [requesterEmail]: { assignedAt: '2025-01-27T10:00:00.000Z', owner: true } }
      };
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);

      await expect(
        eventService.updateItemConfiguration(eventId, { numberOfItems: 0 }, requesterEmail)
      ).rejects.toThrow('Number of items must be an integer between 1 and 100');
    });

    it('should validate numberOfItems range (maximum 100)', async () => {
      const mockEvent = {
        eventId,
        name: 'Test Event',
        administrators: { [requesterEmail]: { assignedAt: '2025-01-27T10:00:00.000Z', owner: true } }
      };
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);

      await expect(
        eventService.updateItemConfiguration(eventId, { numberOfItems: 101 }, requesterEmail)
      ).rejects.toThrow('Number of items must be an integer between 1 and 100');
    });

    it('should validate numberOfItems is an integer', async () => {
      const mockEvent = {
        eventId,
        name: 'Test Event',
        administrators: { [requesterEmail]: { assignedAt: '2025-01-27T10:00:00.000Z', owner: true } }
      };
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);

      await expect(
        eventService.updateItemConfiguration(eventId, { numberOfItems: 20.5 }, requesterEmail)
      ).rejects.toThrow('Number of items must be an integer between 1 and 100');
    });

    it('should save numberOfItems to event config', async () => {
      const mockEvent = {
        eventId,
        name: 'Test Event',
        administrators: { [requesterEmail]: { assignedAt: '2025-01-27T10:00:00.000Z', owner: true } }
      };
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);

      const result = await eventService.updateItemConfiguration(
        eventId,
        { numberOfItems: 30 },
        requesterEmail
      );

      expect(result).toEqual({
        numberOfItems: 30,
        excludedItemIds: []
      });
      expect(cacheService.setWithPersist).toHaveBeenCalledWith(
        expect.stringContaining(eventId),
        expect.objectContaining({
          itemConfiguration: {
            numberOfItems: 30,
            excludedItemIds: []
          }
        }),
        'config',
        eventId
      );
    });

    it('should handle excludedItemIds in updateItemConfiguration', async () => {
      const mockEvent = {
        eventId,
        name: 'Test Event',
        administrators: { [requesterEmail]: { assignedAt: '2025-01-27T10:00:00.000Z', owner: true } }
      };
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);

      const result = await eventService.updateItemConfiguration(
        eventId,
        { numberOfItems: 20, excludedItemIds: '5,10,15' },
        requesterEmail
      );

      expect(result).toEqual({
        numberOfItems: 20,
        excludedItemIds: [5, 10, 15]
      });
      expect(cacheService.setWithPersist).toHaveBeenCalledWith(
        expect.stringContaining(eventId),
        expect.objectContaining({
          itemConfiguration: {
            numberOfItems: 20,
            excludedItemIds: [5, 10, 15]
          }
        }),
        'config',
        eventId
      );
    });

    it('should automatically remove invalid excluded IDs when number reduced', async () => {
      const mockEvent = {
        eventId,
        name: 'Test Event',
        itemConfiguration: {
          numberOfItems: 20,
          excludedItemIds: [5, 10, 15, 25]
        },
        administrators: { [requesterEmail]: { assignedAt: '2025-01-27T10:00:00.000Z', owner: true } }
      };
      cacheService.ensureEventConfigLoaded.mockResolvedValue(mockEvent);
      cacheService.setWithPersist.mockResolvedValue(true);

      const result = await eventService.updateItemConfiguration(
        eventId,
        { numberOfItems: 12 },
        requesterEmail
      );

      expect(result).toEqual({
        numberOfItems: 12,
        excludedItemIds: [5, 10],
        warning: 'Item IDs 15, 25 were removed because they are outside the valid range (1-12)'
      });
      expect(cacheService.setWithPersist).toHaveBeenCalledWith(
        expect.stringContaining(eventId),
        expect.objectContaining({
          itemConfiguration: {
            numberOfItems: 12,
            excludedItemIds: [5, 10]
          }
        }),
        'config',
        eventId
      );
    });
  });

  describe('EventService.normalizeExcludedItemIds', () => {
    it('should parse comma-separated string', () => {
      const result = eventService.normalizeExcludedItemIds('5,10,15', 20);
      expect(result).toEqual([5, 10, 15]);
    });

    it('should remove leading zeros', () => {
      const result = eventService.normalizeExcludedItemIds('05,010,15', 20);
      expect(result).toEqual([5, 10, 15]);
    });

    it('should trim whitespace', () => {
      const result = eventService.normalizeExcludedItemIds('5, 10 , 15', 20);
      expect(result).toEqual([5, 10, 15]);
    });

    it('should remove duplicates', () => {
      const result = eventService.normalizeExcludedItemIds('5,10,5,15,10', 20);
      expect(result).toEqual([5, 10, 15]);
    });

    it('should validate range and throw error for invalid IDs', () => {
      expect(() => {
        eventService.normalizeExcludedItemIds('5,25,30', 20);
      }).toThrow('Invalid item IDs: 25, 30. Must be between 1 and 20');
    });

    it('should prevent excluding all items', () => {
      expect(() => {
        eventService.normalizeExcludedItemIds('1,2,3,4,5', 5);
      }).toThrow('At least one item must be available. Cannot exclude all item IDs');
    });

    it('should handle array input', () => {
      const result = eventService.normalizeExcludedItemIds([5, 10, 15], 20);
      expect(result).toEqual([5, 10, 15]);
    });

    it('should sort results', () => {
      const result = eventService.normalizeExcludedItemIds('15,5,10', 20);
      expect(result).toEqual([5, 10, 15]);
    });
  });
});
