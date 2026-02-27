import apiClient from './apiClient.js';

/**
 * Decode HTML entities in text
 * React automatically escapes HTML for XSS prevention, so we decode entities for display
 * @param {string} text - Text to decode
 * @returns {string} Decoded text
 */
function decodeHtmlEntities(text) {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Decode common HTML entities
  const entityMap = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&nbsp;': ' ',
    '&#39;': "'"
  };
  
  // First decode named entities
  let decoded = text.replace(/&[a-z]+;/gi, (entity) => {
    return entityMap[entity.toLowerCase()] || entity;
  });
  
  // Then decode numeric entities (&#123; and &#x1F;)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return decoded;
}

/**
 * Decode suggestions array
 * @param {Array} suggestions - Suggestions array to decode
 * @returns {Array} Decoded suggestions
 */
function decodeSuggestions(suggestions) {
  if (!Array.isArray(suggestions)) {
    return [];
  }
  
  return suggestions.map(suggestion => ({
    ...suggestion,
    text: decodeHtmlEntities(suggestion.text)
  }));
}

/**
 * QuoteService
 * Service for loading quote suggestions from the backend API
 * Server-side caching handles the full quotes database
 */
class QuoteService {
  constructor() {
    this.error = null;
  }

  /**
   * Get suggestions for a specific rating level
   * Returns 2 randomly selected quotes based on normalized mapping:
   * - Rating 1 always uses negative quotes (file 1)
   * - Max rating always uses positive quotes (file 4)
   * - Middle ratings may blend quotes from two adjacent files
   * 
   * @param {number|string} ratingLevel - Rating level (1 to maxRating)
   * @param {number} [maxRating=4] - Maximum rating for the event (2, 3, or 4)
   * @returns {Promise<Array<{text: string, ratingLevel: number}>>} Array of suggestions
   */
  async getSuggestionsForRating(ratingLevel, maxRating = 4) {
    try {
      this.error = null;
      
      // Validate rating level
      const ratingNum = Number(ratingLevel);
      const maxRatingNum = Number(maxRating) || 4;
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > maxRatingNum) {
        console.warn(`Invalid rating level: ${ratingLevel} (maxRating: ${maxRatingNum})`);
        return [];
      }
      
      // Fetch suggestions from API with maxRating for normalized mapping
      const suggestions = await apiClient.get(`/quotes/${ratingLevel}?maxRating=${maxRatingNum}`);
      
      // Decode HTML entities in suggestions (defensive - text files shouldn't have entities)
      const decodedSuggestions = decodeSuggestions(suggestions);
      
      return decodedSuggestions;
    } catch (error) {
      this.error = error;
      // Log error for debugging - graceful degradation
      console.error('QuoteService: Failed to load suggestions:', {
        message: error.message,
        stack: error.stack,
        status: error.status || 'unknown',
        ratingLevel,
        maxRating
      });
      // Return empty array on error (graceful degradation)
      return [];
    }
  }

  /**
   * Get the current error state
   * @returns {Error|null} Current error or null
   */
  getError() {
    return this.error;
  }
}

// Export singleton instance
const quoteService = new QuoteService();
export default quoteService;
