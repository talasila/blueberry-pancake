/**
 * Cache key generation utilities
 * Provides consistent cache key naming
 */

/**
 * Generate cache key for application configuration
 * @returns {string} Cache key
 */
export function getAppConfigKey() {
  return 'config:app';
}

/**
 * Generate cache key for event configuration
 * @param {string} eventId - Event identifier
 * @returns {string} Cache key
 */
export function getEventConfigKey(eventId) {
  return `config:event:${eventId}`;
}

/**
 * Generate cache key for event data
 * @param {string} eventId - Event identifier
 * @returns {string} Cache key
 */
export function getEventDataKey(eventId) {
  return `data:event:${eventId}`;
}

/**
 * Generate cache key for event ratings
 * @param {string} eventId - Event identifier
 * @returns {string} Cache key
 */
export function getRatingsKey(eventId) {
  return `ratings:${eventId}`;
}
