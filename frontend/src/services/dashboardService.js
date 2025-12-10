import apiClient from './apiClient.js';

/**
 * Dashboard Service
 * Frontend API client for dashboard endpoints
 */
class DashboardService {
  /**
   * Get dashboard data for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<object>} Dashboard data with statistics, itemSummaries, and globalAverage
   */
  async getDashboardData(eventId) {
    try {
      const data = await apiClient.get(`/events/${eventId}/dashboard`);
      return data;
    } catch (error) {
      // Re-throw with more context
      if (error.message) {
        throw error;
      }
      throw new Error(`Failed to fetch dashboard data: ${error.message || 'Unknown error'}`);
    }
  }
}

export default new DashboardService();
