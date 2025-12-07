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
export default class FileDataRepository extends DataRepository {
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
    
    // Resolve relative paths to absolute
    if (dataDir.startsWith('/')) {
      this.dataDirectory = dataDir;
    } else {
      // Relative to project root
      this.dataDirectory = join(__dirname, '../../../', dataDir);
    }

    // Ensure data directory exists
    await this.ensureDirectory(this.dataDirectory);
    await this.ensureDirectory(join(this.dataDirectory, 'events'));

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
}
