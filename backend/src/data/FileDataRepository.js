import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import DataRepository from './DataRepository.js';
import cacheService from '../cache/CacheService.js';
import configLoader from '../config/configLoader.js';
import { getEventConfigKey, getEventDataKey } from '../cache/cacheKeys.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * File-based data repository implementation
 * Extends DataRepository for file system operations with caching
 */
class FileDataRepository extends DataRepository {
  constructor() {
    super();
    this.dataDirectory = null;
    this.initialized = false;
  }

  /**
   * Initialize repository with data directory from config
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    const dataDir = configLoader.get('dataDirectory');
    
    if (!dataDir) {
      throw new Error('dataDirectory configuration is missing. Please check config/default.json');
    }
    
    // Resolve relative paths to absolute
    if (dataDir.startsWith('/')) {
      this.dataDirectory = dataDir;
    } else {
      // Relative to project root
      this.dataDirectory = join(__dirname, '../../../', dataDir);
    }

    // Ensure data directory exists
    await this.ensureDirectory(this.dataDirectory);
    // events directory will be created per-event, no need to create it here

    this.initialized = true;
  }

  /**
   * Ensure directory exists, create if not
   * @param {string} path - Directory path
   */
  async ensureDirectory(path) {
    try {
      await fs.access(path);
    } catch {
      await fs.mkdir(path, { recursive: true });
    }
  }

  /**
   * Read file with cache check
   * @param {string} path - File path
   * @param {string} cacheKey - Optional cache key
   * @returns {Promise<string>} File contents
   */
  async readFile(path, cacheKey = null) {
    // Check cache first
    if (cacheKey) {
      const cached = cacheService.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Read from file system
    try {
      const content = await fs.readFile(path, 'utf-8');
      
      // Store in cache
      if (cacheKey) {
        cacheService.set(cacheKey, content);
      }
      
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  /**
   * Write file and invalidate cache
   * @param {string} path - File path
   * @param {string} content - File content
   * @param {string|Array<string>} cacheKeys - Cache keys to invalidate
   */
  async writeFile(path, content, cacheKeys = null) {
    // Ensure directory exists
    await this.ensureDirectory(dirname(path));

    // Write to file system
    await fs.writeFile(path, content, 'utf-8');

    // Invalidate cache
    if (cacheKeys) {
      if (Array.isArray(cacheKeys)) {
        cacheKeys.forEach(key => cacheService.del(key));
      } else {
        cacheService.del(cacheKeys);
      }
    }
  }

  /**
   * List directories in path
   * @param {string} path - Directory path
   * @returns {Promise<Array<string>>} Array of directory names
   */
  async listDirectories(path) {
    try {
      const entries = await fs.readdir(path, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get event directory path
   * @param {string} eventId - Event identifier
   * @returns {string} Event directory path
   */
  getEventDirectory(eventId) {
    return join(this.dataDirectory, 'events', eventId);
  }

  /**
   * Get event config file path
   * @param {string} eventId - Event identifier
   * @returns {string} Config file path
   */
  getEventConfigPath(eventId) {
    return join(this.getEventDirectory(eventId), 'config.json');
  }

  /**
   * Get event data file path
   * @param {string} eventId - Event identifier
   * @returns {string} Data file path
   */
  getEventDataPath(eventId) {
    return join(this.getEventDirectory(eventId), 'data.csv');
  }

  /**
   * Get event ratings file path
   * @param {string} eventId - Event identifier
   * @returns {string} Ratings file path
   */
  getEventRatingsPath(eventId) {
    return join(this.getEventDirectory(eventId), 'ratings.csv');
  }

  /**
   * Read event configuration
   * @param {string} eventId - Event identifier
   * @returns {Promise<object>} Event configuration
   */
  async readEventConfig(eventId) {
    await this.initialize();
    const path = this.getEventConfigPath(eventId);
    const cacheKey = getEventConfigKey(eventId);
    
    try {
      const content = await this.readFile(path, cacheKey);
      return JSON.parse(content);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new Error(`Event configuration not found: ${eventId}`);
      }
      throw error;
    }
  }

  /**
   * Write event configuration
   * @param {string} eventId - Event identifier
   * @param {object} config - Configuration object
   * @returns {Promise<void>}
   */
  async writeEventConfig(eventId, config) {
    await this.initialize();
    const path = this.getEventConfigPath(eventId);
    const cacheKey = getEventConfigKey(eventId);
    
    await this.writeFile(path, JSON.stringify(config, null, 2), cacheKey);
  }

  /**
   * List all events
   * @returns {Promise<Array<string>>} Array of event IDs
   */
  async listEvents() {
    await this.initialize();
    const eventsPath = join(this.dataDirectory, 'events');
    return await this.listDirectories(eventsPath);
  }

  /**
   * Read event data (CSV)
   * @param {string} eventId - Event identifier
   * @returns {Promise<string>} CSV data
   */
  async readEventData(eventId) {
    await this.initialize();
    const path = this.getEventDataPath(eventId);
    const cacheKey = getEventDataKey(eventId);
    
    try {
      return await this.readFile(path, cacheKey);
    } catch (error) {
      if (error.message.includes('not found')) {
        // Return empty CSV with header if file doesn't exist
        return 'participantId,timestamp,itemId,rating,notes\n';
      }
      throw error;
    }
  }

  /**
   * Append data to event CSV
   * @param {string} eventId - Event identifier
   * @param {string} data - CSV row data
   * @returns {Promise<void>}
   */
  async appendEventData(eventId, data) {
    await this.initialize();
    const path = this.getEventDataPath(eventId);
    const cacheKey = getEventDataKey(eventId);
    
    // Append to file
    await fs.appendFile(path, data + '\n', 'utf-8');
    
    // Invalidate cache
    cacheService.del(cacheKey);
  }

  /**
   * Read event ratings (ratings.csv)
   * @param {string} eventId - Event identifier
   * @returns {Promise<string>} CSV data
   */
  async readEventRatings(eventId) {
    await this.initialize();
    const path = this.getEventRatingsPath(eventId);
    const cacheKey = `ratings:${eventId}`;
    
    try {
      return await this.readFile(path, cacheKey);
    } catch (error) {
      if (error.message.includes('not found')) {
        // Return empty CSV with header if file doesn't exist
        return 'email,timestamp,itemId,rating,note\n';
      }
      throw error;
    }
  }

  /**
   * Write event ratings (ratings.csv) - replaces entire file
   * @param {string} eventId - Event identifier
   * @param {string} csvContent - Complete CSV content (with header)
   * @returns {Promise<void>}
   */
  async writeEventRatings(eventId, csvContent) {
    await this.initialize();
    const path = this.getEventRatingsPath(eventId);
    const cacheKey = `ratings:${eventId}`;
    
    await this.writeFile(path, csvContent, cacheKey);
  }

  /**
   * Create a new event
   * Stores event data in data/events/{eventId}/config.json
   * @param {object} eventData - Event data object (must include eventId)
   * @returns {Promise<object>} Created event data
   */
  async createEvent(eventData) {
    await this.initialize();
    const { eventId } = eventData;
    
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    // Check if event already exists by trying to read config
    try {
      await this.readEventConfig(eventId);
      // Event exists, throw error
      throw new Error(`Event with ID ${eventId} already exists`);
    } catch (error) {
      // If error is "already exists", re-throw it
      if (error.message.includes('already exists')) {
        throw error;
      }
      // If error is "not found", that's expected - event doesn't exist yet, continue
      if (!error.message.includes('not found')) {
        // Some other error occurred, re-throw it
        throw error;
      }
      // Event doesn't exist, which is what we want - continue
    }

    // Write event config using existing method
    // This will create the event directory and config.json file
    await this.writeEventConfig(eventId, eventData);

    return eventData;
  }

  /**
   * Get event by ID
   * Reads event data from data/events/{eventId}/config.json
   * @param {string} eventId - Event identifier
   * @returns {Promise<object>} Event data
   */
  async getEvent(eventId) {
    await this.initialize();
    // Use existing readEventConfig method
    return await this.readEventConfig(eventId);
  }

  /**
   * Delete an event and all its data
   * Deletes the entire event directory including config.json, data.csv, ratings.csv, and any other files
   * @param {string} eventId - Event identifier
   * @returns {Promise<void>}
   */
  async deleteEvent(eventId) {
    await this.initialize();
    const eventDir = this.getEventDirectory(eventId);
    
    try {
      // Check if directory exists
      await fs.access(eventDir);
      
      // Delete entire directory recursively
      await fs.rm(eventDir, { recursive: true, force: true });
      
      // Invalidate all cache entries for this event
      cacheService.del(getEventConfigKey(eventId));
      cacheService.del(getEventDataKey(eventId));
      cacheService.del(`ratings:${eventId}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Event not found: ${eventId}`);
      }
      throw error;
    }
  }
}

// Export singleton instance
const dataRepository = new FileDataRepository();
export { dataRepository };
export default dataRepository;
