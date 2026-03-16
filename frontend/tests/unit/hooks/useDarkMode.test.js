import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useDarkMode from '../../../src/hooks/useDarkMode.js';

describe('useDarkMode Hook', () => {
  let originalClassList;

  beforeEach(() => {
    // Store original classList and reset to clean state
    originalClassList = document.documentElement.className;
    document.documentElement.className = '';
    localStorage.clear();
  });

  afterEach(() => {
    document.documentElement.className = originalClassList;
    localStorage.clear();
  });

  describe('Initial state detection', () => {
    it('should return isDark=false when dark class is not present', () => {
      document.documentElement.classList.remove('dark');
      const { result } = renderHook(() => useDarkMode());
      expect(result.current.isDark).toBe(false);
    });

    it('should return isDark=true when dark class is present', () => {
      document.documentElement.classList.add('dark');
      const { result } = renderHook(() => useDarkMode());
      expect(result.current.isDark).toBe(true);
    });
  });

  describe('Toggle behavior', () => {
    it('should toggle from light to dark', () => {
      document.documentElement.classList.remove('dark');
      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.toggleDark();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      document.documentElement.classList.add('dark');
      const { result } = renderHook(() => useDarkMode());

      act(() => {
        result.current.toggleDark();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('theme')).toBe('light');
    });
  });

  describe('MutationObserver cleanup', () => {
    it('should disconnect observer on unmount', () => {
      const disconnectSpy = vi.fn();
      const observeSpy = vi.fn();

      const OriginalMutationObserver = global.MutationObserver;
      global.MutationObserver = vi.fn((callback) => ({
        observe: observeSpy,
        disconnect: disconnectSpy,
        takeRecords: vi.fn(),
      }));

      const { unmount } = renderHook(() => useDarkMode());

      expect(observeSpy).toHaveBeenCalledWith(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();

      global.MutationObserver = OriginalMutationObserver;
    });
  });
});
