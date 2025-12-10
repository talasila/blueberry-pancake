import { useCallback } from 'react';
import quoteService from '../services/quoteService.js';

/**
 * useQuotes hook
 * Provides access to quotes service for getting suggestions
 * 
 * @returns {object} Object with helper methods
 */
export function useQuotes() {
  /**
   * Get suggestions for a specific rating level
   * Server handles caching and random selection
   * @param {number|string} ratingLevel - Rating level (1-4)
   * @returns {Promise<Array<{text: string, quoteType: string, ratingLevel: number}>>} Array of suggestions
   */
  const getSuggestionsForRating = useCallback(async (ratingLevel) => {
    return quoteService.getSuggestionsForRating(ratingLevel);
  }, []);

  return {
    loading: false, // No initial loading needed - server handles caching
    error: quoteService.getError(),
    getSuggestionsForRating
  };
}

export default useQuotes;
