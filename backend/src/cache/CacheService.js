import NodeCache from 'node-cache';
import configLoader from '../config/configLoader.js';
import loggerService from '../logging/Logger.js';
import { getAppConfigKey, getEventConfigKey, getEventDataKey, getRatingsKey } from './cacheKeys.js';

/**
 * Cache service with write-back pattern
 * - All reads come from cache (no file I/O during normal operation)
 * - Write-through for critical data (event configs)
 * - Write-back with periodic flush for ratings (60s interval)
 */
class CacheService {
  constructor() {
    this.cache = null;
    this.initialized = false;
    this.flushIntervalId = null;
    
    // Track dirty keys that need to be flushed to disk
    // Map<cacheKey, { type: 'config' | 'ratings', eventId: string }>
    this.dirtyKeys = new Map();
    
    // Lazy-loaded dependencies (to avoid circular imports)
    this._dataRepository = null;
    this._csvUtils = null;
  }

  /**
   * Get data repository (lazy loaded to avoid circular imports)
   */
  async getDataRepository() {
    if (!this._dataRepository) {
      const module = await import('../data/FileDataRepository.js');
      this._dataRepository = module.default;
    }
    return this._dataRepository;
  }

  /**
   * Get CSV utilities (lazy loaded)
   */
  async getCsvUtils() {
    if (!this._csvUtils) {
      this._csvUtils = await import('../utils/csvParser.js');
    }
    return this._csvUtils;
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
      stdTTL: cacheConfig.ttl || 3600,
      useClones: false, // Performance optimization
      checkperiod: 600 // Check for expired keys every 10 minutes
    });

    this.initialized = true;
    loggerService.info(`Cache initialized: TTL=${cacheConfig.ttl}s, FlushInterval=${cacheConfig.flushInterval}s`).catch(() => {});

    // Register for hot-reload
    configLoader.onHotReload((newConfig) => {
      if (newConfig.cache && newConfig.cache.enabled && this.cache) {
        if (newConfig.cache.ttl !== cacheConfig.ttl) {
          this.cache.options.stdTTL = newConfig.cache.ttl;
        }
      }
    });
  }

  /**
   * Load active events (state: 'started') into cache at startup
   * This is the only time files are read; subsequent reads come from cache
   */
  async loadActiveEvents() {
    if (!this.initialized || !this.cache) {
      loggerService.warn('Cache not initialized, skipping active events loading').catch(() => {});
      return;
    }

    try {
      const dataRepository = await this.getDataRepository();
      const csvUtils = await this.getCsvUtils();
      
      // Initialize the data repository
      await dataRepository.initialize();
      
      // List all events
      const eventIds = await dataRepository.listEvents();
      let loadedCount = 0;
      let activeCount = 0;

      for (const eventId of eventIds) {
        try {
          // Read event config from file
          const configPath = dataRepository.getEventConfigPath(eventId);
          const configContent = await dataRepository.readFileRaw(configPath);
          const eventConfig = JSON.parse(configContent);
          
          // Cache the config
          this.cache.set(getEventConfigKey(eventId), eventConfig);
          loadedCount++;

          // Only load ratings for active (started) events
          if (eventConfig.state === 'started') {
            try {
              const ratingsPath = dataRepository.getEventRatingsPath(eventId);
              const ratingsContent = await dataRepository.readFileRaw(ratingsPath);
              const ratings = csvUtils.parseCSV(ratingsContent);
              this.cache.set(getRatingsKey(eventId), ratings);
              activeCount++;
            } catch (ratingsError) {
              // Ratings file might not exist yet, initialize empty array
              this.cache.set(getRatingsKey(eventId), []);
              activeCount++;
            }
          }
        } catch (error) {
          loggerService.warn(`Failed to load event ${eventId}: ${error.message}`).catch(() => {});
        }
      }

      loggerService.info(`Loaded ${loadedCount} event configs, ${activeCount} active event ratings into cache`).catch(() => {});
    } catch (error) {
      loggerService.error(`Failed to load active events: ${error.message}`, error).catch(() => {});
    }
  }

  /**
   * Start periodic flush of dirty keys (write-back)
   */
  startPeriodicFlush() {
    if (this.flushIntervalId) {
      return; // Already running
    }

    const cacheConfig = configLoader.get('cache');
    const flushInterval = (cacheConfig.flushInterval || 60) * 1000; // Convert to ms

    this.flushIntervalId = setInterval(async () => {
      await this.flushDirty();
    }, flushInterval);

    loggerService.info(`Started periodic cache flush every ${cacheConfig.flushInterval || 60}s`).catch(() => {});
  }

  /**
   * Stop periodic flush
   */
  stopPeriodicFlush() {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }
  }

  /**
   * Flush all dirty keys to disk
   */
  async flushDirty() {
    if (this.dirtyKeys.size === 0) {
      return;
    }

    const keysToFlush = new Map(this.dirtyKeys);
    this.dirtyKeys.clear();

    let flushedCount = 0;
    let errorCount = 0;

    for (const [cacheKey, metadata] of keysToFlush) {
      try {
        const value = this.cache.get(cacheKey);
        if (value === undefined) {
          continue; // Key was deleted from cache
        }

        await this.persistKey(cacheKey, value, metadata);
        flushedCount++;
      } catch (error) {
        errorCount++;
        loggerService.error(`Failed to flush ${cacheKey}: ${error.message}`, error).catch(() => {});
        // Re-add to dirty keys to retry next cycle
        this.dirtyKeys.set(cacheKey, metadata);
      }
    }

    if (flushedCount > 0 || errorCount > 0) {
      loggerService.info(`Flushed ${flushedCount} dirty keys to disk${errorCount > 0 ? `, ${errorCount} errors` : ''}`).catch(() => {});
    }
  }

  /**
   * Persist a single key to disk based on its type
   */
  async persistKey(cacheKey, value, metadata) {
    const dataRepository = await this.getDataRepository();
    const csvUtils = await this.getCsvUtils();
    const { type, eventId } = metadata;

    switch (type) {
      case 'config':
        const configPath = dataRepository.getEventConfigPath(eventId);
        await dataRepository.writeFileRaw(configPath, JSON.stringify(value, null, 2));
        break;

      case 'ratings':
        const ratingsPath = dataRepository.getEventRatingsPath(eventId);
        const csvContent = csvUtils.toCSV(value);
        await dataRepository.writeFileRaw(ratingsPath, csvContent);
        break;

      default:
        loggerService.warn(`Unknown dirty key type: ${type}`).catch(() => {});
    }
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
   * Set value in cache (for computed/transient data like dashboard, OTP, etc.)
   * Does NOT mark as dirty - use setDirty for persistent data
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
   * Set value and mark as dirty for write-back flush
   * Use this for data that should be persisted (ratings)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {'config' | 'ratings'} type - Type of data for persistence
   * @param {string} eventId - Event identifier
   * @returns {boolean} True if set successfully
   */
  setDirty(key, value, type, eventId) {
    if (!this.initialized || !this.cache) {
      return false;
    }
    
    const success = this.cache.set(key, value);
    if (success) {
      this.dirtyKeys.set(key, { type, eventId });
    }
    return success;
  }

  /**
   * Set value with immediate persistence (write-through)
   * Use this for critical data that can't afford loss (event configs)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {'config' | 'ratings'} type - Type of data for persistence
   * @param {string} eventId - Event identifier
   */
  async setWithPersist(key, value, type, eventId) {
    if (!this.initialized || !this.cache) {
      return false;
    }

    // Update cache first
    this.cache.set(key, value);
    
    // Remove from dirty keys (we're persisting immediately)
    this.dirtyKeys.delete(key);

    // Persist to disk
    await this.persistKey(key, value, { type, eventId });
    
    return true;
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
    // Also remove from dirty keys
    this.dirtyKeys.delete(key);
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

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.del(key);
        this.dirtyKeys.delete(key);
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
    this.del(getRatingsKey(eventId));
  }

  /**
   * Clear all cache
   */
  flush() {
    if (this.initialized && this.cache) {
      this.cache.flushAll();
      this.dirtyKeys.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    if (!this.initialized || !this.cache) {
      return { hits: 0, misses: 0, keys: 0, dirtyKeys: 0 };
    }

    const stats = this.cache.getStats();
    return {
      hits: stats.hits || 0,
      misses: stats.misses || 0,
      keys: this.cache.keys().length,
      dirtyKeys: this.dirtyKeys.size
    };
  }

  /**
   * Ensure ratings are loaded in cache for an event
   * Used for lazy-loading when accessing inactive events
   * @param {string} eventId - Event identifier
   */
  async ensureRatingsLoaded(eventId) {
    const ratingsKey = getRatingsKey(eventId);
    if (this.get(ratingsKey) !== undefined) {
      return; // Already loaded
    }

    try {
      const dataRepository = await this.getDataRepository();
      const csvUtils = await this.getCsvUtils();
      
      const ratingsPath = dataRepository.getEventRatingsPath(eventId);
      const ratingsContent = await dataRepository.readFileRaw(ratingsPath);
      const ratings = csvUtils.parseCSV(ratingsContent);
      this.cache.set(ratingsKey, ratings);
    } catch (error) {
      // File might not exist, initialize empty array
      this.cache.set(ratingsKey, []);
    }
  }

  /**
   * Ensure event config is loaded in cache
   * Used for lazy-loading inactive events
   * @param {string} eventId - Event identifier
   * @returns {object|null} Event config or null if not found
   */
  async ensureEventConfigLoaded(eventId) {
    const configKey = getEventConfigKey(eventId);
    let config = this.get(configKey);
    
    if (config !== undefined) {
      return config;
    }

    try {
      const dataRepository = await this.getDataRepository();
      const configPath = dataRepository.getEventConfigPath(eventId);
      const configContent = await dataRepository.readFileRaw(configPath);
      config = JSON.parse(configContent);
      this.cache.set(configKey, config);
      return config;
    } catch (error) {
      return null;
    }
  }
}

export default new CacheService();
