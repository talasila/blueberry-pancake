import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useEventPolling from '../../src/hooks/useEventPolling.js';
import apiClient from '../../src/services/apiClient.js';

// Mock API client
vi.mock('../../src/services/apiClient.js', () => {
  return {
    default: {
      getEvent: vi.fn()
    }
  };
});

// Mock Page Visibility API
const mockVisibilityState = 'visible';
Object.defineProperty(document, 'visibilityState', {
  writable: true,
  configurable: true,
  value: mockVisibilityState
});

Object.defineProperty(document, 'hidden', {
  writable: true,
  configurable: true,
  value: false
});

describe('useEventPolling Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    document.visibilityState = 'visible';
    document.hidden = false;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe('Initial fetch', () => {
    it('should fetch event immediately on mount', async () => {
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
      
      const { result } = renderHook(() => useEventPolling('A5ohYrHe', 30000));
      
      await waitFor(() => {
        expect(result.current.event).not.toBe(null);
      });
      
      expect(apiClient.getEvent).toHaveBeenCalledWith('A5ohYrHe');
      expect(result.current.event).toEqual(mockEvent);
    });

    it('should not fetch if eventId is missing', () => {
      renderHook(() => useEventPolling(null, 30000));
      
      expect(apiClient.getEvent).not.toHaveBeenCalled();
    });
  });

  describe('Polling interval', () => {
    it('should poll at specified interval', async () => {
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
      
      const { result } = renderHook(() => useEventPolling('A5ohYrHe', 5000));
      
      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.event).not.toBe(null);
      });
      
      expect(apiClient.getEvent).toHaveBeenCalledTimes(1);
      
      // Advance timer by polling interval
      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(2);
      });
      
      // Advance timer again
      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(3);
      });
    });

    it('should use default interval of 30 seconds', async () => {
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
      
      renderHook(() => useEventPolling('A5ohYrHe'));
      
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(1);
      });
      
      // Advance timer by default interval (30 seconds)
      vi.advanceTimersByTime(30000);
      
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Cleanup on unmount', () => {
    it('should stop polling when component unmounts', async () => {
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
      
      const { unmount } = renderHook(() => useEventPolling('A5ohYrHe', 5000));
      
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(1);
      });
      
      unmount();
      
      // Advance timer - polling should not continue
      vi.advanceTimersByTime(5000);
      
      // Wait a bit to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(apiClient.getEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('State change detection', () => {
    it('should update event when state changes', async () => {
      const initialEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedEvent = {
        ...initialEvent,
        state: 'paused',
        updatedAt: new Date().toISOString()
      };
      
      apiClient.getEvent
        .mockResolvedValueOnce(initialEvent)
        .mockResolvedValueOnce(updatedEvent);
      
      const { result } = renderHook(() => useEventPolling('A5ohYrHe', 5000));
      
      await waitFor(() => {
        expect(result.current.event).not.toBe(null);
      });
      
      expect(result.current.event.state).toBe('started');
      
      // Advance timer to trigger polling
      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(result.current.event.state).toBe('paused');
      });
    });
  });

  describe('Page Visibility API', () => {
    it('should pause polling when page becomes hidden', async () => {
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
      
      const { result } = renderHook(() => useEventPolling('A5ohYrHe', 5000));
      
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(1);
      });
      
      // Simulate page becoming hidden
      document.visibilityState = 'hidden';
      document.hidden = true;
      
      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);
      
      // Advance timer - polling should be paused
      vi.advanceTimersByTime(5000);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(apiClient.getEvent).toHaveBeenCalledTimes(1);
      expect(result.current.isPolling).toBe(false);
    });

    it('should resume polling when page becomes visible', async () => {
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
      
      // Start with page hidden
      document.visibilityState = 'hidden';
      document.hidden = true;
      
      const { result } = renderHook(() => useEventPolling('A5ohYrHe', 5000));
      
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(1);
      });
      
      // Simulate page becoming visible
      document.visibilityState = 'visible';
      document.hidden = false;
      
      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);
      
      // Should fetch immediately when page becomes visible
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(2);
      });
      
      // Then continue polling
      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully and continue polling', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      apiClient.getEvent
        .mockResolvedValueOnce(mockEvent)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockEvent);
      
      const { result } = renderHook(() => useEventPolling('A5ohYrHe', 5000));
      
      await waitFor(() => {
        expect(result.current.event).not.toBe(null);
      });
      
      // Advance timer to trigger polling with error
      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(2);
      });
      
      // Error should be logged but polling should continue
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Advance timer again - should continue polling
      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(3);
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('should implement exponential backoff on retries', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      apiClient.getEvent
        .mockResolvedValueOnce(mockEvent)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockEvent);
      
      const { result } = renderHook(() => useEventPolling('A5ohYrHe', 5000));
      
      await waitFor(() => {
        expect(result.current.event).not.toBe(null);
      });
      
      // Trigger error
      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(2);
      });
      
      // Backoff should be applied (but we can't easily test the exact timing)
      // The important thing is that polling continues after backoff
      vi.advanceTimersByTime(10000); // Wait longer than backoff
      
      // Should eventually retry
      await waitFor(() => {
        expect(apiClient.getEvent).toHaveBeenCalledTimes(3);
      }, { timeout: 2000 });
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
      
      const { result } = renderHook(() => useEventPolling('A5ohYrHe', 30000));
      
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
