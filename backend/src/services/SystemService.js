import dataRepository from '../data/FileDataRepository.js';
import cacheService from '../cache/CacheService.js';
import { getEventConfigKey, getRatingsKey } from '../cache/cacheKeys.js';
import loggerService from '../logging/Logger.js';
import { deleteEvent } from '../utils/eventDeletionUtils.js';

/**
 * SystemService
 * Business logic for root administrator dashboard operations
 */
class SystemService {
  /**
   * List all events for admin dashboard (paginated with optional filters)
   * @param {Object} options - Query options
   * @param {number} options.limit - Max events per page (default: 50)
   * @param {number} options.offset - Number of events to skip (default: 0)
   * @param {string} options.state - Filter by event state (optional)
   * @param {string} options.owner - Filter by owner email (optional)
   * @param {string} options.name - Filter by event name substring (optional)
   * @returns {Promise<{events: Array, total: number, limit: number, offset: number}>}
   */
  async listAllEventsForAdmin({ limit = 50, offset = 0, state, owner, name } = {}) {
    try {
      // Get all event IDs
      const allEventIds = await dataRepository.listEvents();
      
      // Load event summaries
      const summaries = await Promise.all(
        allEventIds.map(eventId => this.getEventSummary(eventId))
      );
      
      // Filter out null results (failed to load)
      let filtered = summaries.filter(s => s !== null);
      
      // Apply filters
      if (state) {
        filtered = filtered.filter(e => e.state === state);
      }
      if (owner) {
        const ownerLower = owner.toLowerCase();
        filtered = filtered.filter(e => e.ownerEmail?.toLowerCase().includes(ownerLower));
      }
      if (name) {
        const nameLower = name.toLowerCase();
        filtered = filtered.filter(e => e.name?.toLowerCase().includes(nameLower));
      }
      
      // Sort by creation date (newest first)
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Paginate
      const total = filtered.length;
      const paginated = filtered.slice(offset, offset + limit);
      
      return {
        events: paginated,
        total,
        limit,
        offset
      };
    } catch (error) {
      await loggerService.error('Failed to list events for admin', error);
      throw error;
    }
  }

  /**
   * Get event summary (lightweight view for list)
   * @param {string} eventId - Event ID
   * @returns {Promise<Object|null>} Event summary or null if not found
   */
  async getEventSummary(eventId) {
    try {
      // Try cache first
      let config = cacheService.get(getEventConfigKey(eventId));
      
      // Fall back to file
      if (!config) {
        config = await cacheService.ensureEventConfigLoaded(eventId);
      }
      
      if (!config) {
        return null;
      }
      
      // Get item count from itemConfiguration, minus excluded items
      const totalItems = config.itemConfiguration?.numberOfItems ?? 0;
      const excludedCount = config.itemConfiguration?.excludedItemIds?.length ?? 0;
      const itemCount = totalItems - excludedCount;
      const { participantCount, ratingCount } = await this.getEventCounts(eventId, config);
      
      // Find owner email from administrators object
      const ownerEmail = this.findOwnerEmail(config);
      
      return {
        eventId,
        name: config.name || 'Unnamed Event',
        state: config.state || 'created',
        ownerEmail,
        typeOfItem: config.typeOfItem || 'wine',
        itemCount,
        participantCount,
        ratingCount,
        createdAt: config.createdAt || null
      };
    } catch (error) {
      await loggerService.warn(`Failed to get summary for event ${eventId}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Find owner email from administrators object
   * @param {Object} config - Event config
   * @returns {string} Owner email or 'Unknown'
   */
  findOwnerEmail(config) {
    if (config.administrators && typeof config.administrators === 'object') {
      for (const [email, adminData] of Object.entries(config.administrators)) {
        if (adminData && adminData.owner === true) {
          return email;
        }
      }
      // If no owner flag found, return the first admin
      const admins = Object.keys(config.administrators);
      if (admins.length > 0) {
        return admins[0];
      }
    }
    // Fallback for legacy format
    return config.administrator || config.createdBy || 'Unknown';
  }

  /**
   * Get event details (full view for drawer)
   * @param {string} eventId - Event ID
   * @returns {Promise<Object|null>} Event details or null if not found
   */
  async getEventDetailsForAdmin(eventId) {
    try {
      // Get config
      let config = cacheService.get(getEventConfigKey(eventId));
      if (!config) {
        config = await cacheService.ensureEventConfigLoaded(eventId);
      }
      
      if (!config) {
        return null;
      }
      
      // Get registered items list (items brought by participants)
      const registeredItems = Array.isArray(config.items)
        ? config.items.map((item, index) => ({
            itemId: item.itemId ?? index,
            name: item.name || 'Unnamed Item',
            ownerEmail: item.ownerEmail || 'Unknown'
          }))
        : [];
      
      // Get configured item count (minus excluded items)
      const totalItems = config.itemConfiguration?.numberOfItems ?? 0;
      const excludedCount = config.itemConfiguration?.excludedItemIds?.length ?? 0;
      const itemCount = totalItems - excludedCount;
      
      // Get counts
      const { participantCount, ratingCount } = await this.getEventCounts(eventId, config);
      
      // Get admins
      const admins = config.administrators 
        ? Object.keys(config.administrators)
        : config.administrator 
          ? [config.administrator]
          : [];
      
      // Find owner email
      const ownerEmail = this.findOwnerEmail(config);
      
      return {
        eventId,
        name: config.name || 'Unnamed Event',
        state: config.state || 'created',
        ownerEmail,
        typeOfItem: config.typeOfItem || 'wine',
        maxRating: config.maxRating || 4,
        ratingPresets: config.ratingPresets || [],
        itemCount,
        participantCount,
        ratingCount,
        registeredItems,
        admins,
        createdAt: config.createdAt || null
      };
    } catch (error) {
      await loggerService.error(`Failed to get details for event ${eventId}`, error);
      throw error;
    }
  }

  /**
   * Delete event as admin
   * @param {string} eventId - Event ID to delete
   * @returns {Promise<{success: boolean, wasActive: boolean}>}
   */
  async deleteEventAsAdmin(eventId) {
    try {
      // Use shared deletion utility (handles cache, PIN sessions, and file deletion)
      // Authorization is already verified by requireRoot middleware
      const result = await deleteEvent(eventId);
      
      loggerService.info(`Event deleted by root admin: ${eventId}`, { eventId });
      
      return result;
    } catch (error) {
      await loggerService.error(`Failed to delete event ${eventId}`, error);
      throw error;
    }
  }

  /**
   * Get system-wide statistics
   * @returns {Promise<Object>} System statistics
   */
  async getSystemStats() {
    try {
      const allEventIds = await dataRepository.listEvents();
      
      const stats = {
        totalEvents: allEventIds.length,
        eventsByState: { created: 0, started: 0, paused: 0, completed: 0 },
        totalUsers: 0
      };
      
      const uniqueUsers = new Set();
      
      for (const eventId of allEventIds) {
        try {
          // Get config
          let config = cacheService.get(getEventConfigKey(eventId));
          if (!config) {
            config = await cacheService.ensureEventConfigLoaded(eventId);
          }
          
          if (config) {
            // Count by state
            const state = config.state || 'created';
            if (stats.eventsByState[state] !== undefined) {
              stats.eventsByState[state]++;
            }
            
            // Count users from config.users
            if (config.users && typeof config.users === 'object') {
              Object.keys(config.users).forEach(email => uniqueUsers.add(email.toLowerCase()));
            }
          }
        } catch (error) {
          // Continue with other events
          await loggerService.warn(`Failed to get stats for event ${eventId}`);
        }
      }
      
      stats.totalUsers = uniqueUsers.size;
      
      return stats;
    } catch (error) {
      await loggerService.error('Failed to get system stats', error);
      throw error;
    }
  }

  /**
   * Get participant and rating counts for an event
   * @param {string} eventId - Event ID
   * @param {Object} config - Event config (optional, for user count from config.users)
   * @returns {Promise<{participantCount: number, ratingCount: number, participants: Set}>}
   */
  async getEventCounts(eventId, config = null) {
    try {
      // Count registered users from config.users (more accurate than rating-based count)
      let participantCount = 0;
      if (config && config.users && typeof config.users === 'object') {
        participantCount = Object.keys(config.users).length;
      }
      
      // Get rating count from ratings
      await cacheService.ensureRatingsLoaded(eventId);
      const ratings = cacheService.get(getRatingsKey(eventId)) || [];
      
      // If no users in config, fall back to rating-based participant count
      if (participantCount === 0 && ratings.length > 0) {
        const participants = new Set();
        ratings.forEach(rating => {
          if (rating.userId) {
            participants.add(rating.userId.toLowerCase());
          }
        });
        participantCount = participants.size;
      }
      
      return {
        participantCount,
        ratingCount: ratings.length
      };
    } catch (error) {
      return { participantCount: 0, ratingCount: 0 };
    }
  }
}

export default new SystemService();
