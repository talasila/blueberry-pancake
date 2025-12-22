import config from 'config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { watch } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Configuration loader using config package
 * Reads JSON files: default.json, development.json, staging.json, production.json
 * Supports hot-reload for non-restart settings
 */
class ConfigLoader {
  constructor() {
    // Set NODE_CONFIG_DIR if not already set
    // Config directory is at project root, not in backend/
    if (!process.env.NODE_CONFIG_DIR) {
      const projectRoot = join(__dirname, '../../..');
      const configDir = join(projectRoot, 'config');
      process.env.NODE_CONFIG_DIR = configDir;
    }
    
    this.config = config;
    this.hotReloadCallbacks = new Set();
    this.watcher = null;
  }

  /**
   * Get configuration value
   * @param {string} path - Configuration path (e.g., 'server.port')
   * @returns {any} Configuration value
   */
  get(path) {
    return this.config.get(path);
  }

  /**
   * Check if configuration has a value
   * @param {string} path - Configuration path
   * @returns {boolean} True if value exists
   */
  has(path) {
    return this.config.has(path);
  }

  /**
   * Get all configuration
   * @returns {object} Full configuration object
   */
  getAll() {
    return this.config.util.toObject();
  }

  /**
   * Register callback for hot-reload of non-restart settings
   * @param {Function} callback - Function to call when config changes
   */
  onHotReload(callback) {
    this.hotReloadCallbacks.add(callback);
  }

  /**
   * Enable hot-reload for non-restart settings (cache TTL, logging levels)
   * Note: Changes to server port, database connections, or security keys require restart
   */
  enableHotReload() {
    if (this.watcher) {
      return; // Already enabled
    }

    const configPath = join(__dirname, '../../../config');
    
    try {
      this.watcher = watch(configPath, { recursive: false }, (eventType, filename) => {
        if (filename && filename.endsWith('.json')) {
          // Reload config for non-restart settings
          this.config.util.loadFileConfigs();
          
          // Notify callbacks
          this.hotReloadCallbacks.forEach(callback => {
            try {
              callback(this.getAll());
            } catch (error) {
              console.error('Error in hot-reload callback:', error);
            }
          });
        }
      });
    } catch (error) {
      console.warn('Could not enable config hot-reload:', error.message);
    }
  }

  /**
   * Disable hot-reload
   */
  disableHotReload() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Get list of root admin email addresses
   * @returns {string[]} Array of root admin emails (lowercase)
   */
  getRootAdmins() {
    if (!this.has('rootAdmins')) {
      return [];
    }
    const admins = this.get('rootAdmins');
    return Array.isArray(admins) ? admins.map(email => email.toLowerCase()) : [];
  }

  /**
   * Check if an email address belongs to a root administrator
   * @param {string} email - Email address to check
   * @returns {boolean} True if email is a root admin
   */
  isRootAdmin(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    const rootAdmins = this.getRootAdmins();
    return rootAdmins.includes(email.toLowerCase());
  }
}

// Export singleton instance
export default new ConfigLoader();
