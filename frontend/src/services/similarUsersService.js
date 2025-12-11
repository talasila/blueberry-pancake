import apiClient from './apiClient.js';

/**
 * Similar Users Service
 * Frontend API client for similar users endpoints
 */

/**
 * Get similar users for the current authenticated user
 * @param {string} eventId - Event identifier
 * @returns {Promise<object>} Response with similarUsers array, currentUserEmail, and eventId
 */
export async function getSimilarUsers(eventId) {
  try {
    const data = await apiClient.get(`/events/${eventId}/similar-users`);
    return data;
  } catch (error) {
    // Re-throw with more context
    if (error.message) {
      throw error;
    }
    throw new Error(`Failed to fetch similar users: ${error.message || 'Unknown error'}`);
  }
}
