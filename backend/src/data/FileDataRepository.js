import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import DataRepository from './DataRepository.js';
import configLoader from '../config/configLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * File-based data repository implementation
 * Pure file I/O operations - no caching logic (handled by CacheService)
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
   * Read file (raw, no caching)
   * @param {string} path - File path
   * @returns {Promise<string>} File contents
   */
  async readFileRaw(path) {
    try {
      return await fs.readFile(path, 'utf-8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  /**
   * Write file (raw, no cache invalidation)
   * @param {string} path - File path
   * @param {string} content - File content
   */
  async writeFileRaw(path, content) {
    // Ensure directory exists
    await this.ensureDirectory(dirname(path));
    await fs.writeFile(path, content, 'utf-8');
  }

  /**
   * Append to file
   * @param {string} path - File path
   * @param {string} content - Content to append
   */
  async appendFileRaw(path, content) {
    await this.ensureDirectory(dirname(path));
    await fs.appendFile(path, content, 'utf-8');
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
   * List all events
   * @returns {Promise<Array<string>>} Array of event IDs
   */
  async listEvents() {
    await this.initialize();
    const eventsPath = join(this.dataDirectory, 'events');
    return await this.listDirectories(eventsPath);
  }

  /**
   * Check if event exists
   * @param {string} eventId - Event identifier
   * @returns {Promise<boolean>} True if event exists
   */
  async eventExists(eventId) {
    await this.initialize();
    try {
      await fs.access(this.getEventConfigPath(eventId));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete an event directory and all its contents
   * @param {string} eventId - Event identifier
   */
  async deleteEventDirectory(eventId) {
    await this.initialize();
    const eventDir = this.getEventDirectory(eventId);
    
    try {
      await fs.access(eventDir);
      await fs.rm(eventDir, { recursive: true, force: true });
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
