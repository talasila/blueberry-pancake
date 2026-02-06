/**
 * Abstract base class for data repository
 * Provides interface for data access abstraction
 * Supports DynamoDB storage with single-table design
 */
export default class DataRepository {
  /**
   * Initialize the repository
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize not implemented');
  }

  // ==================== EVENT CONFIG ====================

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
   * Check if event exists
   * @param {string} eventId - Event identifier
   * @returns {Promise<boolean>} True if event exists
   */
  async eventExists(eventId) {
    throw new Error('eventExists not implemented');
  }

  /**
   * List all events
   * @returns {Promise<Array<string>>} Array of event IDs
   */
  async listEvents() {
    throw new Error('listEvents not implemented');
  }

  /**
   * Delete event and all associated data
   * @param {string} eventId - Event identifier
   * @returns {Promise<void>}
   */
  async deleteEvent(eventId) {
    throw new Error('deleteEvent not implemented');
  }

  /**
   * Atomically transition event state with optimistic locking
   * Uses DynamoDB conditional expressions to prevent race conditions
   * @param {string} eventId - Event identifier
   * @param {string} newState - The new state to transition to
   * @param {string} expectedState - The expected current state (for optimistic locking)
   * @returns {Promise<{success: boolean, reason?: string}>} Result with success flag
   */
  async transitionEventState(eventId, newState, expectedState) {
    throw new Error('transitionEventState not implemented');
  }

  /**
   * Atomically register a user for an event
   * Uses DynamoDB UpdateExpression to prevent concurrent registration race conditions
   * @param {string} eventId - Event identifier
   * @param {string} email - User email (will be normalized)
   * @param {string} registeredAt - Registration timestamp
   * @returns {Promise<{registered: boolean, alreadyExists: boolean}>} Result indicating if user was registered
   */
  async registerUserAtomic(eventId, email, registeredAt) {
    throw new Error('registerUserAtomic not implemented');
  }

  /**
   * Atomically add an administrator to an event
   * Uses DynamoDB conditional expressions to prevent duplicate administrator race conditions
   * @param {string} eventId - Event identifier
   * @param {string} email - Administrator email (will be normalized)
   * @param {string} assignedAt - Assignment timestamp
   * @returns {Promise<{added: boolean, alreadyExists: boolean}>} Result indicating if admin was added
   */
  async addAdministratorAtomic(eventId, email, assignedAt) {
    throw new Error('addAdministratorAtomic not implemented');
  }

  // ==================== RATINGS ====================

  /**
   * Get all ratings for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<Array>} Array of rating objects
   */
  async getRatings(eventId) {
    throw new Error('getRatings not implemented');
  }

  /**
   * Add a rating
   * @param {string} eventId - Event identifier
   * @param {object} rating - Rating object {email, itemId, rating, note, timestamp}
   * @returns {Promise<void>}
   */
  async addRating(eventId, rating) {
    throw new Error('addRating not implemented');
  }

  /**
   * Update a rating
   * @param {string} eventId - Event identifier
   * @param {string} email - User email
   * @param {number} itemId - Item ID
   * @param {object} updates - Fields to update {rating?, note?}
   * @returns {Promise<void>}
   */
  async updateRating(eventId, email, itemId, updates) {
    throw new Error('updateRating not implemented');
  }

  /**
   * Delete a rating
   * @param {string} eventId - Event identifier
   * @param {string} email - User email
   * @param {number} itemId - Item ID
   * @returns {Promise<void>}
   */
  async deleteRating(eventId, email, itemId) {
    throw new Error('deleteRating not implemented');
  }

  /**
   * Delete all ratings for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<void>}
   */
  async deleteAllRatings(eventId) {
    throw new Error('deleteAllRatings not implemented');
  }

  /**
   * Get ratings for a specific user
   * @param {string} eventId - Event identifier
   * @param {string} email - User email
   * @returns {Promise<Array>} Array of rating objects
   */
  async getUserRatings(eventId, email) {
    throw new Error('getUserRatings not implemented');
  }

  /**
   * Get a specific rating
   * @param {string} eventId - Event identifier
   * @param {string} email - User email
   * @param {number} itemId - Item ID
   * @returns {Promise<object|null>} Rating object or null
   */
  async getRating(eventId, email, itemId) {
    throw new Error('getRating not implemented');
  }

  // ==================== DASHBOARD CACHE ====================

  /**
   * Get cached dashboard data
   * @param {string} eventId - Event identifier
   * @returns {Promise<object|null>} Cached dashboard or null
   */
  async getDashboardCache(eventId) {
    throw new Error('getDashboardCache not implemented');
  }

  /**
   * Set dashboard cache with TTL
   * @param {string} eventId - Event identifier
   * @param {object} data - Dashboard data
   * @param {number} ttlSeconds - TTL in seconds
   * @returns {Promise<void>}
   */
  async setDashboardCache(eventId, data, ttlSeconds) {
    throw new Error('setDashboardCache not implemented');
  }

  // ==================== OTP ====================

  /**
   * Store OTP code
   * @param {string} email - User email
   * @param {string} code - OTP code
   * @param {number} ttlSeconds - TTL in seconds
   * @returns {Promise<void>}
   */
  async setOTP(email, code, ttlSeconds) {
    throw new Error('setOTP not implemented');
  }

  /**
   * Get OTP data
   * @param {string} email - User email
   * @returns {Promise<object|null>} OTP data or null
   */
  async getOTP(email) {
    throw new Error('getOTP not implemented');
  }

  /**
   * Delete OTP
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async deleteOTP(email) {
    throw new Error('deleteOTP not implemented');
  }

  /**
   * Increment OTP attempts
   * @param {string} email - User email
   * @returns {Promise<number>} New attempt count
   */
  async incrementOTPAttempts(email) {
    throw new Error('incrementOTPAttempts not implemented');
  }

  // ==================== RATE LIMITING ====================

  /**
   * Increment rate limit counter
   * @param {string} identifier - Rate limit identifier (e.g., IP or email)
   * @param {string} action - Action being rate limited
   * @param {number} windowSeconds - Rate limit window in seconds
   * @returns {Promise<{count: number, windowStart: string}>} Current count and window start
   */
  async incrementRateLimit(identifier, action, windowSeconds) {
    throw new Error('incrementRateLimit not implemented');
  }

  /**
   * Get rate limit data
   * @param {string} identifier - Rate limit identifier
   * @param {string} action - Action being rate limited
   * @returns {Promise<{count: number, windowStart: string}|null>} Rate limit data or null
   */
  async getRateLimit(identifier, action) {
    throw new Error('getRateLimit not implemented');
  }

  /**
   * Reset rate limit
   * @param {string} identifier - Rate limit identifier
   * @param {string} action - Action being rate limited
   * @returns {Promise<void>}
   */
  async resetRateLimit(identifier, action) {
    throw new Error('resetRateLimit not implemented');
  }

  // ==================== SUSPENSION ====================

  /**
   * Suspend a user
   * @param {string} email - User email
   * @param {string} reason - Suspension reason
   * @param {number} durationSeconds - Suspension duration in seconds
   * @returns {Promise<void>}
   */
  async suspendUser(email, reason, durationSeconds) {
    throw new Error('suspendUser not implemented');
  }

  /**
   * Get suspension data
   * @param {string} email - User email
   * @returns {Promise<object|null>} Suspension data or null
   */
  async getSuspension(email) {
    throw new Error('getSuspension not implemented');
  }

  /**
   * Remove suspension
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async removeSuspension(email) {
    throw new Error('removeSuspension not implemented');
  }

  /**
   * Increment failed attempts for suspension tracking
   * @param {string} email - User email
   * @param {number} windowSeconds - Tracking window in seconds
   * @returns {Promise<number>} Current failed attempt count
   */
  async incrementFailedAttempts(email, windowSeconds) {
    throw new Error('incrementFailedAttempts not implemented');
  }

  /**
   * Reset failed attempts
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async resetFailedAttempts(email) {
    throw new Error('resetFailedAttempts not implemented');
  }

  // ==================== PIN SESSIONS ====================

  /**
   * Create PIN session
   * @param {string} sessionId - Session identifier
   * @param {object} data - Session data {eventId, email, fingerprint}
   * @param {number} ttlSeconds - Session TTL in seconds
   * @returns {Promise<void>}
   */
  async createPINSession(sessionId, data, ttlSeconds) {
    throw new Error('createPINSession not implemented');
  }

  /**
   * Get PIN session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<object|null>} Session data or null
   */
  async getPINSession(sessionId) {
    throw new Error('getPINSession not implemented');
  }

  /**
   * Delete PIN session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<void>}
   */
  async deletePINSession(sessionId) {
    throw new Error('deletePINSession not implemented');
  }

  /**
   * Delete all PIN sessions for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<void>}
   */
  async deleteEventPINSessions(eventId) {
    throw new Error('deleteEventPINSessions not implemented');
  }

  // ==================== SIMILAR USERS CACHE ====================

  /**
   * Get cached similar users data
   * @param {string} eventId - Event identifier
   * @param {string} email - User email
   * @returns {Promise<object|null>} Cached similar users or null
   */
  async getSimilarUsersCache(eventId, email) {
    throw new Error('getSimilarUsersCache not implemented');
  }

  /**
   * Set similar users cache with TTL
   * @param {string} eventId - Event identifier
   * @param {string} email - User email
   * @param {object} data - Similar users data
   * @param {number} ttlSeconds - TTL in seconds
   * @returns {Promise<void>}
   */
  async setSimilarUsersCache(eventId, email, data, ttlSeconds) {
    throw new Error('setSimilarUsersCache not implemented');
  }

  // ==================== BOOKMARKS ====================

  /**
   * Get bookmarks for a user in an event
   * @param {string} eventId - Event identifier
   * @param {string} email - User email
   * @returns {Promise<Array<number>>} Array of bookmarked item IDs
   */
  async getBookmarks(eventId, email) {
    throw new Error('getBookmarks not implemented');
  }

  /**
   * Save bookmarks for a user in an event
   * @param {string} eventId - Event identifier
   * @param {string} email - User email
   * @param {Array<number>} bookmarks - Array of bookmarked item IDs
   * @returns {Promise<void>}
   */
  async saveBookmarks(eventId, email, bookmarks) {
    throw new Error('saveBookmarks not implemented');
  }

  /**
   * Delete bookmarks for a user in an event
   * @param {string} eventId - Event identifier
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async deleteBookmarks(eventId, email) {
    throw new Error('deleteBookmarks not implemented');
  }

  /**
   * Delete all bookmarks for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<void>}
   */
  async deleteAllBookmarks(eventId) {
    throw new Error('deleteAllBookmarks not implemented');
  }

  // ==================== LEGACY COMPATIBILITY ====================
  // These methods are for backward compatibility during migration

  /**
   * Read event data (legacy - returns CSV string)
   * @param {string} eventId - Event identifier
   * @returns {Promise<string>} CSV data as string
   * @deprecated Use getRatings instead
   */
  async readEventData(eventId) {
    throw new Error('readEventData not implemented');
  }

  /**
   * Append data to event CSV (legacy)
   * @param {string} eventId - Event identifier
   * @param {string} data - CSV row data
   * @returns {Promise<void>}
   * @deprecated Use addRating instead
   */
  async appendEventData(eventId, data) {
    throw new Error('appendEventData not implemented');
  }
}
