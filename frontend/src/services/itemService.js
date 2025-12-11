import apiClient from './apiClient.js';

/**
 * Item service for frontend
 * Handles API communication for item registration and management operations
 */
export const itemService = {
  /**
   * Register a new item for an event
   * @param {string} eventId - Event identifier
   * @param {object} itemData - Item data
   * @param {string} itemData.name - Item name (required)
   * @param {string|number|null} itemData.price - Item price (optional)
   * @param {string|null} itemData.description - Item description (optional)
   * @returns {Promise<object>} Registered item object
   */
  async registerItem(eventId, itemData) {
    if (!eventId || eventId === 'undefined' || eventId === 'null' || eventId.trim() === '') {
      throw new Error('Event ID is required');
    }

    try {
      const response = await apiClient.post(`/events/${eventId}/items`, itemData);
      return response;
    } catch (error) {
      console.error('Error registering item:', error);
      throw error;
    }
  },

  /**
   * Get items for an event
   * Returns all items for administrators, or only user's own items for regular users
   * @param {string} eventId - Event identifier
   * @returns {Promise<Array<object>>} Array of item objects
   */
  async getItems(eventId) {
    if (!eventId || eventId === 'undefined' || eventId === 'null' || eventId.trim() === '') {
      throw new Error('Event ID is required');
    }

    try {
      const response = await apiClient.get(`/events/${eventId}/items`);
      return response;
    } catch (error) {
      console.error('Error getting items:', error);
      throw error;
    }
  },

  /**
   * Assign an item ID to a registered item (or clear assignment if null)
   * @param {string} eventId - Event identifier
   * @param {string} itemId - Item unique identifier (nanoid)
   * @param {number|null} itemIdToAssign - Item ID to assign (integer, 1 to numberOfItems) or null to clear
   * @returns {Promise<object>} Updated item object
   */
  async assignItemId(eventId, itemId, itemIdToAssign) {
    if (!eventId || eventId === 'undefined' || eventId === 'null' || eventId.trim() === '') {
      throw new Error('Event ID is required');
    }

    if (!itemId || itemId === 'undefined' || itemId === 'null' || itemId.trim() === '') {
      throw new Error('Item ID is required');
    }

    try {
      const response = await apiClient.patch(`/events/${eventId}/items/${itemId}/assign-item-id`, {
        itemId: itemIdToAssign
      });
      return response;
    } catch (error) {
      console.error('Error assigning item ID:', error);
      throw error;
    }
  },

  /**
   * Get item details by assigned item ID
   * @param {string} eventId - Event identifier
   * @param {number} itemId - Assigned item ID (integer)
   * @returns {Promise<object>} Item object with details
   */
  async getItemByItemId(eventId, itemId) {
    if (!eventId || eventId === 'undefined' || eventId === 'null' || eventId.trim() === '') {
      throw new Error('Event ID is required');
    }

    if (itemId === undefined || itemId === null || isNaN(itemId)) {
      throw new Error('Item ID is required');
    }

    try {
      const response = await apiClient.get(`/events/${eventId}/items/by-item-id/${itemId}`);
      return response;
    } catch (error) {
      console.error('Error getting item by item ID:', error);
      throw error;
    }
  },

  /**
   * Update an existing item
   * @param {string} eventId - Event identifier
   * @param {string} itemId - Item unique identifier (nanoid)
   * @param {object} updates - Item data updates
   * @param {string} updates.name - Item name (optional)
   * @param {string|number|null} updates.price - Item price (optional)
   * @param {string|null} updates.description - Item description (optional)
   * @returns {Promise<object>} Updated item object
   */
  async updateItem(eventId, itemId, updates) {
    if (!eventId || eventId === 'undefined' || eventId === 'null' || eventId.trim() === '') {
      throw new Error('Event ID is required');
    }

    if (!itemId || itemId === 'undefined' || itemId === 'null' || itemId.trim() === '') {
      throw new Error('Item ID is required');
    }

    try {
      const response = await apiClient.patch(`/events/${eventId}/items/${itemId}`, updates);
      return response;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  /**
   * Delete an item
   * @param {string} eventId - Event identifier
   * @param {string} itemId - Item unique identifier (nanoid)
   * @returns {Promise<object>} Response object
   */
  async deleteItem(eventId, itemId) {
    if (!eventId || eventId === 'undefined' || eventId === 'null' || eventId.trim() === '') {
      throw new Error('Event ID is required');
    }

    if (!itemId || itemId === 'undefined' || itemId === 'null' || itemId.trim() === '') {
      throw new Error('Item ID is required');
    }

    try {
      const response = await apiClient.delete(`/events/${eventId}/items/${itemId}`);
      return response;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }
};

export default itemService;
