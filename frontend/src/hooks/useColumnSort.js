import { useState, useMemo, useCallback } from 'react';

/**
 * useColumnSort – reusable column-sorting hook.
 *
 * Extracted from ItemDetailsDrawer.jsx to reduce component complexity.
 *
 * @param {string} defaultColumn    - Initial column to sort by
 * @param {string} defaultDirection - Initial direction ('asc' | 'desc')
 * @returns {{ sortColumn: string, sortDirection: string, handleSort: Function, sortItems: Function }}
 */
export function useColumnSort(defaultColumn, defaultDirection = 'asc') {
  const [sortColumn, setSortColumn] = useState(defaultColumn);
  const [sortDirection, setSortDirection] = useState(defaultDirection);

  /**
   * Toggle direction when clicking the same column, or switch to a new column
   * with the default direction ('asc').
   */
  const handleSort = useCallback((column) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  /**
   * Sort an array of items using a map of comparators keyed by column name.
   *
   * Each comparator receives two items (a, b) and should return a value
   * suitable for ascending order (negative, zero, positive).
   * The hook automatically reverses the result for descending order.
   *
   * @param {Array}  items       - Items to sort
   * @param {Object} comparators - { columnName: (a, b) => number }
   * @returns {Array} Sorted copy of items
   */
  const sortItems = useCallback((items, comparators) => {
    if (!items || !items.length) return [];

    const comparator = comparators[sortColumn];
    if (!comparator) return [...items];

    return [...items].sort((a, b) => {
      const result = comparator(a, b);
      return sortDirection === 'asc' ? result : -result;
    });
  }, [sortColumn, sortDirection]);

  return { sortColumn, sortDirection, handleSort, sortItems };
}
