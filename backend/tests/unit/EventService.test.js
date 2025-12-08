import { describe, it, expect, beforeEach, vi } from 'vitest';
import eventService from '../../src/services/EventService.js';
import dataRepository from '../../src/data/FileDataRepository.js';
import loggerService from '../../src/logging/Logger.js';

// Mock data repository
vi.mock('../../src/data/FileDataRepository.js', () => {
  return {
    default: {
      getEvent: vi.fn()
    }
  };
});

// Mock logger service
vi.mock('../../src/logging/Logger.js', () => {
  return {
    default: {
      error: vi.fn()
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
});
