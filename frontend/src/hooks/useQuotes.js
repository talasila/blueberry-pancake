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
   * Get suggestions for a specific rating level with normalized mapping
   * Server handles caching and random selection
   * @param {number|string} ratingLevel - Rating level (1 to maxRating)
   * @param {number} [maxRating=4] - Maximum rating for the event (2, 3, or 4)
   * @returns {Promise<Array<{text: string, ratingLevel: number}>>} Array of suggestions
   */
  const getSuggestionsForRating = useCallback(async (ratingLevel, maxRating = 4) => {
    return quoteService.getSuggestionsForRating(ratingLevel, maxRating);
  }, []);

  return {
    loading: false, // No initial loading needed - server handles caching
    error: quoteService.getError(),
    getSuggestionsForRating
  };
}

export default useQuotes;
