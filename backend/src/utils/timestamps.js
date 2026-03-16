/**
 * Timestamp Utility Functions
 * Centralized timestamp generation for consistent formatting
 */

/**
 * Get current timestamp in ISO 8601 format
 * @param {object} [options] - Options
 * @param {boolean} [options.stripMs=false] - If true, removes milliseconds (e.g., "2024-01-01T00:00:00Z")
 * @returns {string} ISO 8601 timestamp
 */
export function getCurrentTimestamp(options) {
  const iso = new Date().toISOString();
  if (options?.stripMs) {
    return iso.replace(/\.\d{3}Z$/, 'Z');
  }
  return iso;
}
