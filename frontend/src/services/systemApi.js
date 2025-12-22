/**
 * System Admin API client
 * Handles communication with /api/system endpoints for root administrators
 */

import apiClient from './apiClient.js';

const systemApi = {
  /**
   * List all events (paginated with optional filters)
   * @param {Object} options - Query options
   * @param {number} options.limit - Max events per page (default: 50)
   * @param {number} options.offset - Number of events to skip (default: 0)
   * @param {string} options.state - Filter by event state (optional)
   * @param {string} options.owner - Filter by owner email (optional)
   * @param {string} options.name - Filter by event name (optional)
   * @returns {Promise<{events: Array, total: number, limit: number, offset: number}>}
   */
  async listEvents({ limit = 50, offset = 0, state, owner, name } = {}) {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());
    if (state) params.set('state', state);
    if (owner) params.set('owner', owner);
    if (name) params.set('name', name);
    
    const response = await apiClient.request(`/system/events?${params.toString()}`);
    return response.json();
  },

  /**
   * Get event details
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Event details
   */
  async getEventDetails(eventId) {
    const response = await apiClient.request(`/system/events/${eventId}`);
    return response.json();
  },

  /**
   * Delete event
   * @param {string} eventId - Event ID to delete
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async deleteEvent(eventId) {
    const response = await apiClient.request(`/system/events/${eventId}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  /**
   * Get system statistics
   * @returns {Promise<Object>} System statistics
   */
  async getStats() {
    const response = await apiClient.request('/system/stats');
    return response.json();
  },

  /**
   * Check if current user is a root admin
   * Tries to access system endpoint and checks for 403
   * @returns {Promise<boolean>} True if user is root admin
   */
  async isRootAdmin() {
    try {
      await apiClient.request('/system/stats');
      return true;
    } catch (error) {
      if (error.message?.includes('403') || error.message?.includes('Root access required')) {
        return false;
      }
      // For other errors (network, etc.), assume not root
      return false;
    }
  }
};

export default systemApi;
