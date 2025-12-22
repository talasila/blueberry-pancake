/**
 * Event Deletion Utilities
 * 
 * Shared logic for deleting events, used by both EventService (owner deletion)
 * and SystemService (root admin deletion).
 * 
 * Authorization checks are NOT performed here - callers must verify
 * permissions before calling these functions.
 */

import dataRepository from '../data/FileDataRepository.js';
import cacheService from '../cache/CacheService.js';
import { getEventConfigKey } from '../cache/cacheKeys.js';
import pinService from '../services/PINService.js';
import loggerService from '../logging/Logger.js';

/**
 * Delete an event and all associated data.
 * 
 * This function handles:
 * - Cache invalidation (event config, dashboard, similar users)
 * - PIN session invalidation
 * - File system deletion
 * 
 * IMPORTANT: Authorization checks must be performed by the caller.
 * This function assumes the caller has verified permissions.
 * 
 * @param {string} eventId - Event ID to delete
 * @returns {Promise<{success: boolean, wasActive: boolean}>} Result with wasActive flag
 * @throws {Error} If event not found or deletion fails
 */
export async function deleteEvent(eventId) {
  // Get event config to check state and verify existence
  let config = cacheService.get(getEventConfigKey(eventId));
  if (!config) {
    config = await cacheService.ensureEventConfigLoaded(eventId);
  }
  
  if (!config) {
    throw new Error('Event not found');
  }
  
  const wasActive = config.state === 'started';
  const eventName = config.name || 'Unknown';
  
  // Clear all cache entries FIRST to prevent write-back flush from recreating directory
  // (The periodic flush could run between directory deletion and cache invalidation,
  // causing dirty ratings to recreate the directory via ensureDirectory())
  cacheService.invalidateEvent(eventId);
  cacheService.del(`dashboard:${eventId}`);
  cacheService.invalidate(`similarUsers:${eventId}:*`);
  
  // Invalidate PIN sessions for this event
  pinService.invalidatePINSessions(eventId);
  
  // NOW safe to delete event directory (no dirty keys can recreate it)
  await dataRepository.deleteEventDirectory(eventId);
  
  loggerService.info(`Event deleted: ${eventId}`, {
    eventId,
    eventName,
    wasActive
  });
  
  return { success: true, wasActive };
}
