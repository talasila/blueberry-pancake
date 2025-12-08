import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import useEvent from '../../src/hooks/useEvent.js';
import apiClient from '../../src/services/apiClient.js';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn()
  };
});

// Mock API client
vi.mock('../../src/services/apiClient.js', () => {
  return {
    default: {
      getEvent: vi.fn()
    }
  };
});

// Helper to render hook with router
const renderHookWithRouter = (hook, initialParams = {}) => {
  const wrapper = ({ children }) => (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
  
  return renderHook(hook, { wrapper });
};

describe('useEvent Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useParams.mockReturnValue({ eventId: 'A5ohYrHe' });
  });

  describe('Loading state', () => {
    it('should start with loading state', () => {
      apiClient.getEvent.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      const { result } = renderHookWithRouter(() => useEvent());
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.event).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should set loading to false after successful fetch', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      apiClient.getEvent.mockResolvedValue(mockEvent);
      
      const { result } = renderHookWithRouter(() => useEvent());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.event).toEqual(mockEvent);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Success handling', () => {
    it('should fetch and return event data', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      apiClient.getEvent.mockResolvedValue(mockEvent);
      
      const { result } = renderHookWithRouter(() => useEvent());
      
      await waitFor(() => {
        expect(result.current.event).not.toBe(null);
      });
      
      expect(result.current.event).toEqual(mockEvent);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(apiClient.getEvent).toHaveBeenCalledWith('A5ohYrHe');
    });

    it('should call getEvent with eventId from route params', async () => {
      useParams.mockReturnValue({ eventId: 'TEST1234' });
      const mockEvent = {
        eventId: 'TEST1234',
        name: 'Test Event',
        state: 'created',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      apiClient.getEvent.mockResolvedValue(mockEvent);
      
      const { result } = renderHookWithRouter(() => useEvent());
      
      await waitFor(() => {
        expect(result.current.event).not.toBe(null);
      });
      
      expect(apiClient.getEvent).toHaveBeenCalledWith('TEST1234');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.getEvent.mockRejectedValue(error);
      
      const { result } = renderHookWithRouter(() => useEvent());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.error).toBe('Network error');
      expect(result.current.event).toBe(null);
    });

    it('should handle 404 errors', async () => {
      const error = new Error('Event not found');
      apiClient.getEvent.mockRejectedValue(error);
      
      const { result } = renderHookWithRouter(() => useEvent());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.error).toBe('Event not found');
      expect(result.current.event).toBe(null);
    });

    it('should handle API errors with default message', async () => {
      const error = { message: undefined };
      apiClient.getEvent.mockRejectedValue(error);
      
      const { result } = renderHookWithRouter(() => useEvent());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.error).toBe('Failed to load event');
      expect(result.current.event).toBe(null);
    });
  });

  describe('Missing eventId', () => {
    it('should handle missing eventId in route params', async () => {
      useParams.mockReturnValue({ eventId: undefined });
      
      const { result } = renderHookWithRouter(() => useEvent());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.error).toBe('Event ID is required');
      expect(result.current.event).toBe(null);
      expect(apiClient.getEvent).not.toHaveBeenCalled();
    });
  });

  describe('Refetch functionality', () => {
    it('should provide refetch function', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      apiClient.getEvent.mockResolvedValue(mockEvent);
      
      const { result } = renderHookWithRouter(() => useEvent());
      
      await waitFor(() => {
        expect(result.current.event).not.toBe(null);
      });
      
      expect(typeof result.current.refetch).toBe('function');
      
      // Test refetch
      const updatedEvent = { ...mockEvent, name: 'Updated Event' };
      apiClient.getEvent.mockResolvedValue(updatedEvent);
      
      await result.current.refetch();
      
      await waitFor(() => {
        expect(result.current.event.name).toBe('Updated Event');
      });
    });
  });
});
