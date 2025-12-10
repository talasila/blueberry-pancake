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
    // Cache suggestions per rating level (small responses, can cache client-side too)
    this.suggestionsCache = new Map();
  }

  /**
   * Get suggestions for a specific rating level
   * Returns one randomly selected quote from each quote type (snarky, poetic, haiku)
   * Server handles the random selection and returns only what's needed
   * @param {number|string} ratingLevel - Rating level (1-4)
   * @returns {Promise<Array<{text: string, quoteType: string, ratingLevel: number}>>} Array of suggestions
   */
  async getSuggestionsForRating(ratingLevel) {
    try {
      this.error = null;
      
      // Validate rating level
      const ratingNum = Number(ratingLevel);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 4) {
        console.warn(`Invalid rating level: ${ratingLevel}`);
        return [];
      }
      
      // Fetch suggestions from API (server handles random selection and caching)
      const suggestions = await apiClient.get(`/quotes/${ratingLevel}`);
      
      // Decode HTML entities in suggestions (React handles XSS prevention automatically)
      const decodedSuggestions = decodeSuggestions(suggestions);
      
      return decodedSuggestions;
    } catch (error) {
      this.error = error;
      // Log error for debugging - graceful degradation
      console.error('QuoteService: Failed to load suggestions:', {
        message: error.message,
        stack: error.stack,
        status: error.status || 'unknown',
        ratingLevel
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
