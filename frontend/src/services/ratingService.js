import apiClient from './apiClient.js';

/**
 * Rating service for frontend
 * Handles API communication for rating operations
 */
export const ratingService = {
  /**
   * Get all ratings for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<Array<object>>} Array of rating objects
   */
  async getRatings(eventId) {
    try {
      const response = await apiClient.request(`/events/${eventId}/ratings`, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv'
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to get ratings' }));
        throw new Error(error.error || 'Failed to get ratings');
      }

      const csvText = await response.text();
      // Parse CSV to array of rating objects
      return this.parseRatingsCSV(csvText);
    } catch (error) {
      console.error('Error getting ratings:', error);
      throw error;
    }
  },

  /**
   * Parse ratings CSV into array of objects
   * Handles basic RFC 4180 escaping (quoted fields, doubled quotes)
   * @param {string} csvText - CSV text
   * @returns {Array<object>} Array of rating objects
   */
  parseRatingsCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    // Skip header
    const ratings = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      if (values.length >= 5) {
        const itemId = parseInt(values[2], 10);
        const rating = parseInt(values[3], 10);
        
        if (!isNaN(itemId) && !isNaN(rating)) {
          ratings.push({
            email: values[0] || '',
            timestamp: values[1] || '',
            itemId,
            rating,
            note: values[4] || ''
          });
        }
      }
    }

    return ratings;
  },

  /**
   * Parse a single CSV line handling basic RFC 4180 escaping
   * @param {string} line - CSV line
   * @returns {Array<string>} Array of field values
   */
  parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = i + 1 < line.length ? line[i + 1] : null;

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote (doubled quote)
          currentField += '"';
          i++; // Skip next quote
        } else if (inQuotes && (nextChar === ',' || nextChar === null)) {
          // End of quoted field
          inQuotes = false;
        } else if (!inQuotes) {
          // Start of quoted field
          inQuotes = true;
        } else {
          currentField += char;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Add last field
    fields.push(currentField);
    return fields;
  },

  /**
   * Get user's rating for a specific item
   * @param {string} eventId - Event identifier
   * @param {number} itemId - Item identifier
   * @returns {Promise<object|null>} Rating object or null if not found
   */
  async getRating(eventId, itemId) {
    try {
      const response = await apiClient.get(`/events/${eventId}/ratings/${itemId}`);
      return response;
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        return null;
      }
      console.error('Error getting rating:', error);
      throw error;
    }
  },

  /**
   * Submit a rating for an item
   * @param {string} eventId - Event identifier
   * @param {number} itemId - Item identifier
   * @param {number} rating - Rating value
   * @param {string} note - Optional note
   * @returns {Promise<object>} Saved rating object
   */
  async submitRating(eventId, itemId, rating, note) {
    if (!eventId || eventId === 'undefined' || eventId === 'null' || eventId.trim() === '') {
      throw new Error('Event ID is required');
    }
    
    try {
      const body = {
        itemId,
        rating,
        note: note || ''
      };

      const response = await apiClient.post(`/events/${eventId}/ratings`, body);
      return response;
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error;
    }
  },

  /**
   * Delete a rating for an item
   * @param {string} eventId - Event identifier
   * @param {number} itemId - Item identifier
   * @returns {Promise<object>} Response object
   */
  async deleteRating(eventId, itemId) {
    if (!eventId || eventId === 'undefined' || eventId === 'null' || eventId.trim() === '') {
      throw new Error('Event ID is required');
    }
    
    try {
      const response = await apiClient.delete(`/events/${eventId}/ratings/${itemId}`);
      return response;
    } catch (error) {
      console.error('Error deleting rating:', error);
      throw error;
    }
  }
};
