import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useEventPublicInfo from '../../src/hooks/useEventPublicInfo.js';
import apiClient from '../../src/services/apiClient.js';

// Mock API client
vi.mock('../../src/services/apiClient.js', () => {
  return {
    default: {
      getEventPublicInfo: vi.fn()
    }
  };
});

describe('useEventPublicInfo Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful fetch', () => {
    it('should fetch on mount and return correct shape with data fields', async () => {
      const mockData = {
        name: 'Wine Tasting Night',
        typeOfItem: 'wine',
        theme: 'midnight',
        state: 'started'
      };

      apiClient.getEventPublicInfo.mockResolvedValue({ data: mockData, notFound: false });

      const { result } = renderHook(() => useEventPublicInfo('A5ohYrHe'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.name).toBe('Wine Tasting Night');
      expect(result.current.typeOfItem).toBe('wine');
      expect(result.current.theme).toBe('midnight');
      expect(result.current.state).toBe('started');
      expect(result.current.error).toBe(false);
      expect(result.current.notFound).toBe(false);
      expect(apiClient.getEventPublicInfo).toHaveBeenCalledWith('A5ohYrHe');
    });
  });

  describe('Loading state', () => {
    it('should start with loading=true then transition to loading=false after fetch completes', async () => {
      const mockData = {
        name: 'Test Event',
        typeOfItem: 'wine',
        theme: 'default',
        state: 'created'
      };

      apiClient.getEventPublicInfo.mockResolvedValue({ data: mockData, notFound: false });

      const { result } = renderHook(() => useEventPublicInfo('A5ohYrHe'));

      // Initially loading
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.name).toBe('Test Event');
    });
  });

  describe('Not found (404)', () => {
    it('should set notFound=true when apiClient returns notFound', async () => {
      apiClient.getEventPublicInfo.mockResolvedValue({ data: null, notFound: true });

      const { result } = renderHook(() => useEventPublicInfo('INVALID1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notFound).toBe(true);
      expect(result.current.error).toBe(false);
      expect(result.current.name).toBe(null);
      expect(result.current.typeOfItem).toBe(null);
      expect(result.current.theme).toBe(null);
      expect(result.current.state).toBe(null);
    });
  });

  describe('Network error', () => {
    it('should set error=true and notFound=false when apiClient returns data=null, notFound=false', async () => {
      apiClient.getEventPublicInfo.mockResolvedValue({ data: null, notFound: false });

      const { result } = renderHook(() => useEventPublicInfo('A5ohYrHe'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(true);
      expect(result.current.notFound).toBe(false);
      expect(result.current.name).toBe(null);
      expect(result.current.typeOfItem).toBe(null);
      expect(result.current.theme).toBe(null);
      expect(result.current.state).toBe(null);
    });

    it('should set error=true when apiClient rejects with an exception', async () => {
      apiClient.getEventPublicInfo.mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() => useEventPublicInfo('A5ohYrHe'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(true);
      expect(result.current.notFound).toBe(false);
      expect(result.current.name).toBe(null);
    });
  });

  describe('Missing eventId', () => {
    it('should set error=true and loading=false when eventId is undefined', async () => {
      const { result } = renderHook(() => useEventPublicInfo(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(true);
      expect(result.current.name).toBe(null);
      expect(result.current.typeOfItem).toBe(null);
      expect(result.current.theme).toBe(null);
      expect(result.current.state).toBe(null);
      expect(apiClient.getEventPublicInfo).not.toHaveBeenCalled();
    });

    it('should set error=true and loading=false when eventId is empty string', async () => {
      const { result } = renderHook(() => useEventPublicInfo(''));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(true);
      expect(apiClient.getEventPublicInfo).not.toHaveBeenCalled();
    });

    it('should set error=true and loading=false when eventId is null', async () => {
      const { result } = renderHook(() => useEventPublicInfo(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(true);
      expect(apiClient.getEventPublicInfo).not.toHaveBeenCalled();
    });
  });
});
