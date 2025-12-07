/**
 * Abstract base class for data repository
 * Provides interface for data access abstraction
 * Supports future migration from file-based to database storage
 */
export default class DataRepository {
  /**
   * Read event configuration
   * @param {string} eventId - Event identifier
   * @returns {Promise<object>} Event configuration object
   */
  async readEventConfig(eventId) {
    throw new Error('readEventConfig not implemented');
  }

  /**
   * Write event configuration
   * @param {string} eventId - Event identifier
   * @param {object} config - Configuration object
   * @returns {Promise<void>}
   */
  async writeEventConfig(eventId, config) {
    throw new Error('writeEventConfig not implemented');
  }

  /**
   * List all events
   * @returns {Promise<Array<string>>} Array of event IDs
   */
  async listEvents() {
    throw new Error('listEvents not implemented');
  }

  /**
   * Read event data
   * @param {string} eventId - Event identifier
   * @returns {Promise<string>} CSV data as string
   */
  async readEventData(eventId) {
    throw new Error('readEventData not implemented');
  }

  /**
   * Append data to event CSV
   * @param {string} eventId - Event identifier
   * @param {string} data - CSV row data
   * @returns {Promise<void>}
   */
  async appendEventData(eventId, data) {
    throw new Error('appendEventData not implemented');
  }
}
