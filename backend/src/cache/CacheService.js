import NodeCache from 'node-cache';
import configLoader from '../config/configLoader.js';
import loggerService from '../logging/Logger.js';
import { getAppConfigKey, getEventConfigKey, getEventDataKey } from './cacheKeys.js';

/**
 * Cache service wrapper around node-cache
 * Provides caching layer to minimize file system access
 */
class CacheService {
  constructor() {
    this.cache = null;
    this.initialized = false;
  }

  /**
   * Initialize cache with configuration
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    const cacheConfig = configLoader.get('cache');
    
    if (!cacheConfig.enabled) {
      loggerService.info('Cache is disabled in configuration').catch(() => {});
      return;
    }

    this.cache = new NodeCache({
      stdTTL: cacheConfig.ttl || 3600, // Time to live in seconds
      maxKeys: cacheConfig.maxSize || 100,
      useClones: false, // Performance optimization
      checkperiod: 600 // Check for expired keys every 10 minutes
    });

    this.initialized = true;
    loggerService.info(`Cache initialized: TTL=${cacheConfig.ttl}s, MaxSize=${cacheConfig.maxSize}`).catch(() => {});

    // Register for hot-reload
    configLoader.onHotReload((newConfig) => {
      if (newConfig.cache && newConfig.cache.enabled && this.cache) {
        // Update TTL if changed
        if (newConfig.cache.ttl !== cacheConfig.ttl) {
          this.cache.options.stdTTL = newConfig.cache.ttl;
        }
      }
    });
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  get(key) {
    if (!this.initialized || !this.cache) {
      return undefined;
    }
    return this.cache.get(key);
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Optional TTL override (seconds)
   * @returns {boolean} True if set successfully
   */
  set(key, value, ttl = null) {
    if (!this.initialized || !this.cache) {
      return false;
    }
    return this.cache.set(key, value, ttl || 0);
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {number} Number of deleted keys
   */
  del(key) {
    if (!this.initialized || !this.cache) {
      return 0;
    }
    return this.cache.del(key);
  }

  /**
   * Get all cache keys
   * @returns {Array<string>} Array of cache keys
   */
  keys() {
    if (!this.initialized || !this.cache) {
      return [];
    }
    return this.cache.keys();
  }

  /**
   * Invalidate cache entries matching pattern
   * @param {string} pattern - Pattern to match (e.g., 'config:event:*')
   * @returns {number} Number of invalidated keys
   */
  invalidate(pattern) {
    if (!this.initialized || !this.cache) {
      return 0;
    }

    const keys = this.cache.keys();
    let invalidated = 0;

    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.del(key);
        invalidated++;
      }
    });

    return invalidated;
  }

  /**
   * Invalidate event-related cache entries
   * @param {string} eventId - Event identifier
   */
  invalidateEvent(eventId) {
    this.del(getEventConfigKey(eventId));
    this.del(getEventDataKey(eventId));
  }

  /**
   * Clear all cache
   */
  flush() {
    if (this.initialized && this.cache) {
      this.cache.flushAll();
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    if (!this.initialized || !this.cache) {
      return { hits: 0, misses: 0, keys: 0 };
    }

    const stats = this.cache.getStats();
    return {
      hits: stats.hits || 0,
      misses: stats.misses || 0,
      keys: this.cache.keys().length
    };
  }
}

export default new CacheService();
