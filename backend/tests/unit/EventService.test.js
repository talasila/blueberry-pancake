import { describe, it, expect, beforeEach, vi } from 'vitest';
import eventService from '../../src/services/EventService.js';
import pinService from '../../src/services/PINService.js';
import dataRepository from '../../src/data/FileDataRepository.js';
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
      
      dataRepository.getEvent.mockResolvedValue(mockEvent);
      
      const result = await eventService.getEvent('A5ohYrHe');
      
      expect(result).toEqual(mockEvent);
      expect(dataRepository.getEvent).toHaveBeenCalledWith('A5ohYrHe');
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
      
      dataRepository.getEvent.mockResolvedValue(mockEvent);
      
      const result = await eventService.getEvent('A5ohYrHe');
      
      expect(result).toEqual(mockEvent);
      expect(dataRepository.getEvent).toHaveBeenCalledWith('A5ohYrHe');
      expect(loggerService.error).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent event', async () => {
      const error = new Error('Event configuration not found: NONEXIST');
      dataRepository.getEvent.mockRejectedValue(error);
      
      await expect(eventService.getEvent('NONEXIST')).rejects.toThrow('Event not found: NONEXIST');
      expect(dataRepository.getEvent).toHaveBeenCalledWith('NONEXIST');
    });

    it('should throw error for file not found', async () => {
      const error = new Error('File not found: config.json');
      dataRepository.getEvent.mockRejectedValue(error);
      
      await expect(eventService.getEvent('FILENOTF')).rejects.toThrow('Event not found: FILENOTF');
    });

    it('should re-throw other errors and log them', async () => {
      const error = new Error('Database connection failed');
      dataRepository.getEvent.mockRejectedValue(error);
      
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
      
      dataRepository.getEvent.mockResolvedValue(mockEvent);
      
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
      
      dataRepository.getEvent.mockResolvedValue(mockEvent);
      
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
      dataRepository.getEvent.mockResolvedValue(mockEvent);
      dataRepository.writeEventConfig.mockResolvedValue(undefined);
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
      expect(dataRepository.writeEventConfig).toHaveBeenCalled();
    });

    it('should reject regeneration from non-administrator', async () => {
      await expect(
        eventService.regeneratePIN(eventId, 'other@example.com')
      ).rejects.toThrow('Only the event administrator can regenerate PINs');
      
      expect(pinService.generatePIN).not.toHaveBeenCalled();
      expect(dataRepository.writeEventConfig).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive email comparison', async () => {
      // Administrator email in different case
      const result = await eventService.regeneratePIN(eventId, 'ADMIN@EXAMPLE.COM');
      
      expect(result).toHaveProperty('pin');
      expect(dataRepository.writeEventConfig).toHaveBeenCalled();
    });

    it('should return error for non-existent event', async () => {
      dataRepository.getEvent.mockRejectedValue(new Error('Event not found: NONEXIST'));
      
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
});
