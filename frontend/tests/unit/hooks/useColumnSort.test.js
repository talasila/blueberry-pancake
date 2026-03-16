import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnSort } from '@/hooks/useColumnSort';

describe('useColumnSort', () => {
  it('initialises with default column and direction', () => {
    const { result } = renderHook(() => useColumnSort('name', 'asc'));
    expect(result.current.sortColumn).toBe('name');
    expect(result.current.sortDirection).toBe('asc');
  });

  it('defaults direction to asc when not specified', () => {
    const { result } = renderHook(() => useColumnSort('rating'));
    expect(result.current.sortDirection).toBe('asc');
  });

  describe('handleSort', () => {
    it('toggles direction when clicking the same column', () => {
      const { result } = renderHook(() => useColumnSort('rating', 'asc'));

      act(() => result.current.handleSort('rating'));
      expect(result.current.sortColumn).toBe('rating');
      expect(result.current.sortDirection).toBe('desc');

      act(() => result.current.handleSort('rating'));
      expect(result.current.sortDirection).toBe('asc');
    });

    it('switches to new column with asc direction', () => {
      const { result } = renderHook(() => useColumnSort('rating', 'desc'));

      act(() => result.current.handleSort('name'));
      expect(result.current.sortColumn).toBe('name');
      expect(result.current.sortDirection).toBe('asc');
    });
  });

  describe('sortItems', () => {
    const comparators = {
      name: (a, b) => a.name.localeCompare(b.name),
      score: (a, b) => a.score - b.score,
    };

    const items = [
      { name: 'Charlie', score: 2 },
      { name: 'Alice', score: 5 },
      { name: 'Bob', score: 3 },
    ];

    it('returns empty array for empty input', () => {
      const { result } = renderHook(() => useColumnSort('name', 'asc'));
      expect(result.current.sortItems([], comparators)).toEqual([]);
    });

    it('returns empty array for null input', () => {
      const { result } = renderHook(() => useColumnSort('name', 'asc'));
      expect(result.current.sortItems(null, comparators)).toEqual([]);
    });

    it('returns unsorted copy when no matching comparator', () => {
      const { result } = renderHook(() => useColumnSort('unknown', 'asc'));
      const sorted = result.current.sortItems(items, comparators);
      expect(sorted).toEqual(items);
      // Must be a copy, not the same reference
      expect(sorted).not.toBe(items);
    });

    it('sorts ascending by name', () => {
      const { result } = renderHook(() => useColumnSort('name', 'asc'));
      const sorted = result.current.sortItems(items, comparators);
      expect(sorted.map(i => i.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts descending by name', () => {
      const { result } = renderHook(() => useColumnSort('name', 'desc'));
      const sorted = result.current.sortItems(items, comparators);
      expect(sorted.map(i => i.name)).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('sorts ascending by score', () => {
      const { result } = renderHook(() => useColumnSort('score', 'asc'));
      const sorted = result.current.sortItems(items, comparators);
      expect(sorted.map(i => i.score)).toEqual([2, 3, 5]);
    });

    it('sorts descending by score', () => {
      const { result } = renderHook(() => useColumnSort('score', 'desc'));
      const sorted = result.current.sortItems(items, comparators);
      expect(sorted.map(i => i.score)).toEqual([5, 3, 2]);
    });

    it('does not mutate the original array', () => {
      const { result } = renderHook(() => useColumnSort('name', 'asc'));
      const original = [...items];
      result.current.sortItems(items, comparators);
      expect(items).toEqual(original);
    });

    it('respects direction change after handleSort', () => {
      const { result } = renderHook(() => useColumnSort('score', 'asc'));

      // Initially ascending
      let sorted = result.current.sortItems(items, comparators);
      expect(sorted.map(i => i.score)).toEqual([2, 3, 5]);

      // Toggle to descending
      act(() => result.current.handleSort('score'));
      sorted = result.current.sortItems(items, comparators);
      expect(sorted.map(i => i.score)).toEqual([5, 3, 2]);
    });
  });
});
