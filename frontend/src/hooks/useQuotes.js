import { useCallback } from 'react';
import quoteService from '../services/quoteService.js';

/**
 * useQuotes hook
 * Provides access to quotes service for getting suggestions
 * 
 * @returns {object} Object with helper methods
 */
export function useQuotes() {
  const getSuggestionsForRating = useCallback(async (ratingLevel, maxRating = 4) => {
    return quoteService.getSuggestionsForRating(ratingLevel, maxRating);
  }, []);

  return {
    loading: false,
    getSuggestionsForRating
  };
}

export default useQuotes;
