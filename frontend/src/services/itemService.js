import apiClient from './apiClient.js';
import { isValidEventId } from '../utils/eventIdValidation.js';
import { validateItemId } from '../utils/serviceValidation.js';

/**
 * Item service for frontend
 * Handles API communication for item registration and management operations
 */
export const itemService = {
  async registerItem(eventId, itemData) {
    if (!isValidEventId(eventId)) throw new Error('Event ID is required');

    try {
      const response = await apiClient.post(`/events/${eventId}/items`, itemData);
      return response;
    } catch (error) {
      console.error('Error registering item:', error);
      throw error;
    }
  },

  async getItems(eventId, ownItemsOnly = false) {
    if (!isValidEventId(eventId)) throw new Error('Event ID is required');

    try {
      const queryParam = ownItemsOnly ? '?ownItemsOnly=true' : '';
      const response = await apiClient.get(`/events/${eventId}/items${queryParam}`);
      return response;
    } catch (error) {
      console.error('Error getting items:', error);
      throw error;
    }
  },

  async assignItemId(eventId, itemId, itemIdToAssign) {
    if (!isValidEventId(eventId)) throw new Error('Event ID is required');
    validateItemId(itemId);

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

  async getItemByItemId(eventId, itemId) {
    if (!isValidEventId(eventId)) throw new Error('Event ID is required');

    if (itemId === undefined || itemId === null || isNaN(itemId)) {
      throw new Error('Item ID is required');
    }

    try {
      return await apiClient.get(`/events/${eventId}/items/by-item-id/${itemId}`);
    } catch (error) {
      console.error('Error getting item by item ID:', error);
      throw error;
    }
  },

  async updateItem(eventId, itemId, updates) {
    if (!isValidEventId(eventId)) throw new Error('Event ID is required');
    validateItemId(itemId);

    try {
      const response = await apiClient.patch(`/events/${eventId}/items/${itemId}`, updates);
      return response;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  async deleteItem(eventId, itemId) {
    if (!isValidEventId(eventId)) throw new Error('Event ID is required');
    validateItemId(itemId);

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
