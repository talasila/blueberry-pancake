import { customAlphabet } from 'nanoid';
import dataRepository from '../data/FileDataRepository.js';
import loggerService from '../logging/Logger.js';
import pinService from './PINService.js';
import cacheService from '../cache/CacheService.js';

// Use alphanumeric alphabet (A-Z, a-z, 0-9) for 8-character IDs
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);

/**
 * Default rating presets for different max rating values
 * Each preset defines labels and colors for rating values 1 to maxRating
 */
const DEFAULT_RATING_PRESETS = {
  2: [
    { value: 1, label: 'Poor', color: '#FF3B30' },
    { value: 2, label: 'Good', color: '#28A745' }
  ],
  3: [
    { value: 1, label: 'Poor', color: '#FF3B30' },
    { value: 2, label: 'Average', color: '#FFCC00' },
    { value: 3, label: 'Good', color: '#34C759' }
  ],
  4: [
    { value: 1, label: 'What is this crap?', color: '#FF3B30' },
    { value: 2, label: 'Meh...', color: '#FFCC00' },
    { value: 3, label: 'Not bad...', color: '#34C759' },
    { value: 4, label: 'Give me more...', color: '#28A745' }
  ]
};

/**
 * EventService
 * Handles event creation business logic
 */
class EventService {
  /**
   * Validate event name
   * @param {string} name - Event name
   * @returns {{valid: boolean, value?: string, error?: string}} Validation result
   */
  validateEventName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Event name is required' };
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Event name cannot be empty' };
    }

    if (trimmed.length > 100) {
      return { valid: false, error: 'Event name must be 100 characters or less' };
    }

    // Allow alphanumeric, spaces, hyphens, underscores
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
      return { valid: false, error: 'Event name contains invalid characters' };
    }

    return { valid: true, value: trimmed };
  }

  /**
   * Validate type of item
   * @param {string} typeOfItem - Type of item
   * @returns {{valid: boolean, error?: string}} Validation result
   */
  validateTypeOfItem(typeOfItem) {
    if (!typeOfItem || typeof typeOfItem !== 'string') {
      return { valid: false, error: 'Type of item is required' };
    }

    if (typeOfItem !== 'wine') {
      return { valid: false, error: "Invalid type of item. Only 'wine' is currently supported" };
    }

    return { valid: true };
  }

  /**
   * Generate unique event ID with collision handling
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Promise<string>} Unique event ID
   */
  async generateEventId(maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const eventId = nanoid();

      // Check if event already exists
      try {
        await dataRepository.getEvent(eventId);
        // Event exists, try again
        loggerService.warn(`Event ID collision detected: ${eventId}, retrying...`);
        continue;
      } catch (error) {
        // Event doesn't exist, this ID is available
        if (error.message.includes('not found')) {
          return eventId;
        }
        // Other error, throw it
        throw error;
      }
    }

    throw new Error('Failed to generate unique event ID after maximum retries');
  }

  /**
   * Create a new event
   * @param {string} name - Event name
   * @param {string} typeOfItem - Type of item (currently only "wine")
   * @param {string} administratorEmail - Email of the event administrator
   * @returns {Promise<object>} Created event object
   */
  async createEvent(name, typeOfItem, administratorEmail) {
    // Validate inputs
    const nameValidation = this.validateEventName(name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    const typeValidation = this.validateTypeOfItem(typeOfItem);
    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    if (!administratorEmail || typeof administratorEmail !== 'string') {
      throw new Error('Administrator email is required');
    }

    // Generate unique event ID
    const eventId = await this.generateEventId();

    // Generate 6-digit PIN for the event
    const pin = pinService.generatePIN();
    const now = new Date().toISOString();

    // Normalize administrator email
    const normalizedAdminEmail = this.normalizeEmail(administratorEmail);
    if (!this.isValidEmail(normalizedAdminEmail)) {
      throw new Error('Invalid administrator email format');
    }

    // Create event object with administrators object structure
    const event = {
      eventId,
      name: nameValidation.value,
      typeOfItem,
      state: 'created',
      administrators: {
        [normalizedAdminEmail]: {
          assignedAt: now,
          owner: true
        }
      },
      users: {
        [normalizedAdminEmail]: {
          registeredAt: now
        }
      },
      pin,
      pinGeneratedAt: now,
      createdAt: now,
      updatedAt: now
    };

    // Persist event
    try {
      await dataRepository.createEvent(event);
      loggerService.info(`Event created: ${eventId} by ${administratorEmail}`);
      return event;
    } catch (error) {
      // Log the original error with full details
      loggerService.error(`Failed to create event: ${error.message}`, error);
      if (error.stack) {
        loggerService.error(`Stack trace: ${error.stack}`);
      }
      // Re-throw the original error to preserve error details for API handler
      throw error;
    }
  }

  /**
   * State transition validation constants
   * Defines valid state transitions for event lifecycle management
   */
  static VALID_TRANSITIONS = {
    created: ['started'],
    started: ['paused', 'completed'],
    paused: ['started', 'completed'],
    completed: ['started', 'paused']
  };

  /**
   * Validate event state
   * @param {string} state - Event state
   * @returns {boolean} True if state is valid
   */
  static isValidState(state) {
    // Include "finished" for legacy support (will be migrated to "completed")
    return ['created', 'started', 'paused', 'completed', 'finished'].includes(state);
  }

  /**
   * Validate if a state transition is allowed
   * Checks if the transition from fromState to toState is valid according to VALID_TRANSITIONS rules
   * @param {string} fromState - Current state
   * @param {string} toState - Target state
   * @returns {boolean} True if transition is valid, false otherwise
   * @throws {Error} Does not throw, returns boolean for validation result
   */
  validateStateTransition(fromState, toState) {
    const validTargets = this.constructor.VALID_TRANSITIONS[fromState] || [];
    return validTargets.includes(toState);
  }

  /**
   * Get valid target states for a given current state
   * Returns array of states that can be transitioned to from the current state
   * @param {string} currentState - Current event state
   * @returns {string[]} Array of valid target states, empty array if no valid transitions
   */
  getValidTransitions(currentState) {
    return this.constructor.VALID_TRANSITIONS[currentState] || [];
  }

  /**
   * Validate event ID format
   * @param {string} eventId - Event ID to validate
   * @returns {{valid: boolean, error?: string}} Validation result
   */
  validateEventId(eventId) {
    if (!eventId || typeof eventId !== 'string') {
      return { valid: false, error: 'Event ID is required' };
    }

    // Event ID must be exactly 8 alphanumeric characters
    if (!/^[A-Za-z0-9]{8}$/.test(eventId)) {
      return { valid: false, error: 'Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.' };
    }

    return { valid: true };
  }

  /**
   * Get event by ID
   * @param {string} eventId - Event identifier
   * @returns {Promise<object>} Event data
   */
  async getEvent(eventId) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    try {
      // Retrieve event from data repository
      const event = await dataRepository.getEvent(eventId);
      
      let migrationOccurred = false;
      
      // Lazy migration: migrate administrator field if needed
      if (this.migrateAdministratorField(event)) {
        migrationOccurred = true;
        loggerService.info(`Migrated administrator field to administrators object for event: ${eventId}`);
      }
      
      // Lazy migration: migrate legacy "finished" state to "completed" if needed
      if (this.migrateLegacyState(event)) {
        migrationOccurred = true;
        loggerService.info(`Migrated legacy "finished" state to "completed" for event: ${eventId}`);
      }
      
      // Save migrated event if any migration occurred
      if (migrationOccurred) {
        await dataRepository.writeEventConfig(eventId, event);
      }
      
      return event;
    } catch (error) {
      // If event not found, throw with clear message
      if (error.message.includes('not found') || error.message.includes('File not found')) {
        throw new Error(`Event not found: ${eventId}`);
      }
      // Re-throw other errors
      loggerService.error(`Error retrieving event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update event configuration
   * @param {string} eventId - Event identifier
   * @param {object} event - Updated event object
   * @returns {Promise<object>} Updated event data
   */
  async updateEvent(eventId, event) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    // Update updatedAt timestamp
    event.updatedAt = new Date().toISOString();

    try {
      // Write updated event configuration
      await dataRepository.writeEventConfig(eventId, event);
      loggerService.info(`Event updated: ${eventId}`);
      return event;
    } catch (error) {
      loggerService.error(`Error updating event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Transition event state with optimistic locking
   * @param {string} eventId - Event identifier
   * @param {string} newState - Target state for transition
   * @param {string} currentState - Expected current state (for optimistic locking)
   * @param {string} administratorEmail - Email of administrator performing transition
   * @returns {Promise<object>} Updated event with new state
   */
  async transitionState(eventId, newState, currentState, administratorEmail) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    // Validate state values
    if (!this.constructor.isValidState(newState) || !this.constructor.isValidState(currentState)) {
      loggerService.error(`Invalid state detected for event ${eventId}: newState=${newState}, currentState=${currentState}`);
      throw new Error(`Invalid state. Valid states are: created, started, paused, completed`);
    }

    // Get event with optimistic locking check
    const event = await this.getEvent(eventId);

    // Validate event state is valid (check for corrupted data)
    if (!this.constructor.isValidState(event.state)) {
      loggerService.error(`Corrupted event state detected for event ${eventId}: state=${event.state}`);
      throw new Error(`Invalid event state: ${event.state}. Please contact support.`);
    }

    // Optimistic locking: verify current state matches expected
    if (event.state !== currentState) {
      loggerService.warn(`Optimistic locking conflict for event ${eventId}: expected=${currentState}, actual=${event.state}`);
      const error = new Error(`Event state has changed. Current state: ${event.state}. Please refresh and try again.`);
      error.currentState = event.state;
      throw error;
    }

    // Validate transition is allowed
    if (!this.validateStateTransition(currentState, newState)) {
      loggerService.warn(`Invalid state transition attempted for event ${eventId}: ${currentState} → ${newState}`);
      throw new Error(`Invalid transition from ${currentState} to ${newState}`);
    }

    // Validate administrator authorization
    if (!this.isAdministrator(event, administratorEmail)) {
      throw new Error('Unauthorized: Only administrators can change event state');
    }

    // Update state atomically
    const updatedEvent = {
      ...event,
      state: newState,
      updatedAt: new Date().toISOString()
    };

    try {
      await this.updateEvent(eventId, updatedEvent);
      
      // Invalidate dashboard cache when event state changes
      cacheService.del(`dashboard:${eventId}`);
      
      loggerService.info(`Event state transitioned: ${eventId} from ${currentState} to ${newState} by ${administratorEmail}`);
      return updatedEvent;
    } catch (error) {
      loggerService.error(`Failed to persist state transition for event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Register a user for an event
   * Adds user email to the event's users map if not already registered
   * Users are stored as a map with email as key and registration data as value
   * @param {string} eventId - Event identifier
   * @param {string} email - User email address
   * @returns {Promise<object>} Updated event with user registered
   */
  async registerUser(eventId, email) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!email || typeof email !== 'string') {
      throw new Error('Email is required');
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Invalid email format');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const registrationTimestamp = new Date().toISOString();

    try {
      // Get current event
      const event = await dataRepository.getEvent(eventId);

      // Initialize users map if it doesn't exist
      if (!event.users || typeof event.users !== 'object' || Array.isArray(event.users)) {
        event.users = {};
      }

      // Check if user is already registered (case-insensitive)
      const isAlreadyRegistered = normalizedEmail in event.users;

      if (!isAlreadyRegistered) {
        // Add user to the map with registration timestamp
        event.users[normalizedEmail] = {
          registeredAt: registrationTimestamp
        };
        
        // Update event with new user
        const updatedEvent = {
          ...event,
          users: event.users,
          updatedAt: new Date().toISOString()
        };

        // Persist updated event
        await this.updateEvent(eventId, updatedEvent);
        
        loggerService.info(`User registered for event: ${eventId}, email: ${normalizedEmail}, registeredAt: ${registrationTimestamp}`);
      } else {
        loggerService.debug(`User already registered for event: ${eventId}, email: ${normalizedEmail}`);
      }

      return {
        eventId,
        email: normalizedEmail,
        registered: !isAlreadyRegistered,
        registeredAt: isAlreadyRegistered ? event.users[normalizedEmail].registeredAt : registrationTimestamp
      };
    } catch (error) {
      // If event not found, throw with clear message
      if (error.message.includes('not found') || error.message.includes('File not found')) {
        throw new Error(`Event not found: ${eventId}`);
      }
      // Re-throw validation errors
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        throw error;
      }
      // Log and re-throw other errors
      loggerService.error(`Error registering user for event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update user name in an event
   * @param {string} eventId - Event identifier
   * @param {string} email - User email address
   * @param {string} name - User name
   * @returns {Promise<object>} Updated user data
   */
  async updateUserName(eventId, email, name) {
    // Validate inputs
    if (!eventId || typeof eventId !== 'string') {
      throw new Error('Event ID is required');
    }
    if (!email || typeof email !== 'string') {
      throw new Error('Email address is required');
    }
    if (typeof name !== 'string') {
      throw new Error('Name must be a string');
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Get current event
      const event = await dataRepository.getEvent(eventId);

      // Initialize users map if it doesn't exist
      if (!event.users || typeof event.users !== 'object' || Array.isArray(event.users)) {
        event.users = {};
      }

      // Initialize user entry if it doesn't exist
      if (!event.users[normalizedEmail]) {
        event.users[normalizedEmail] = {
          registeredAt: new Date().toISOString()
        };
      }

      // Update user's name
      event.users[normalizedEmail] = {
        ...event.users[normalizedEmail],
        name: name.trim() || undefined // Remove name if empty string
      };

      // Update event with new user data
      const updatedEvent = {
        ...event,
        users: event.users,
        updatedAt: new Date().toISOString()
      };

      // Persist updated event
      await this.updateEvent(eventId, updatedEvent);

      loggerService.info(`User name updated for event: ${eventId}, email: ${normalizedEmail}`);

      return {
        eventId,
        email: normalizedEmail,
        name: event.users[normalizedEmail].name || null
      };
    } catch (error) {
      // If event not found, throw with clear message
      if (error.message.includes('not found') || error.message.includes('File not found')) {
        throw new Error(`Event not found: ${eventId}`);
      }
      // Re-throw validation errors
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        throw error;
      }
      // Log and re-throw other errors
      loggerService.error(`Error updating user name for event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get user profile data (name, etc.) for an event
   * @param {string} eventId - Event identifier
   * @param {string} email - User email address
   * @returns {Promise<object>} User profile data
   */
  async getUserProfile(eventId, email) {
    // Validate inputs
    if (!eventId || typeof eventId !== 'string') {
      throw new Error('Event ID is required');
    }
    if (!email || typeof email !== 'string') {
      throw new Error('Email address is required');
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Get current event
      const event = await dataRepository.getEvent(eventId);

      // Initialize users map if it doesn't exist
      if (!event.users || typeof event.users !== 'object' || Array.isArray(event.users)) {
        return {
          eventId,
          email: normalizedEmail,
          name: null
        };
      }

      // Get user data
      const userData = event.users[normalizedEmail];

      return {
        eventId,
        email: normalizedEmail,
        name: userData?.name || null
      };
    } catch (error) {
      // If event not found, throw with clear message
      if (error.message.includes('not found') || error.message.includes('File not found')) {
        throw new Error(`Event not found: ${eventId}`);
      }
      // Log and re-throw other errors
      loggerService.error(`Error getting user profile for event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get bookmarks for a user in an event
   * @param {string} eventId - Event identifier
   * @param {string} email - User email address
   * @returns {Promise<Array<number>>} Array of bookmarked item IDs
   */
  async getUserBookmarks(eventId, email) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!email || typeof email !== 'string') {
      throw new Error('Email is required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Get current event
      const event = await dataRepository.getEvent(eventId);

      // Initialize users map if it doesn't exist
      if (!event.users || typeof event.users !== 'object' || Array.isArray(event.users)) {
        event.users = {};
      }

      // Get user's bookmarks, default to empty array
      const userData = event.users[normalizedEmail];
      const bookmarks = userData?.bookmarks || [];

      // Ensure bookmarks is an array
      return Array.isArray(bookmarks) ? bookmarks : [];
    } catch (error) {
      // If event not found, throw with clear message
      if (error.message.includes('not found') || error.message.includes('File not found')) {
        throw new Error(`Event not found: ${eventId}`);
      }
      // Re-throw validation errors
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        throw error;
      }
      // Log and re-throw other errors
      loggerService.error(`Error getting bookmarks for user ${normalizedEmail} in event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Save bookmarks for a user in an event
   * @param {string} eventId - Event identifier
   * @param {string} email - User email address
   * @param {Array<number>} bookmarks - Array of bookmarked item IDs
   * @returns {Promise<{eventId: string, email: string, bookmarks: Array<number>}>}
   */
  async saveUserBookmarks(eventId, email, bookmarks) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!email || typeof email !== 'string') {
      throw new Error('Email is required');
    }

    // Validate bookmarks is an array
    if (!Array.isArray(bookmarks)) {
      throw new Error('Bookmarks must be an array');
    }

    // Validate all bookmarks are numbers
    if (!bookmarks.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0)) {
      throw new Error('All bookmark item IDs must be positive integers');
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Get current event
      const event = await dataRepository.getEvent(eventId);

      // Initialize users map if it doesn't exist
      if (!event.users || typeof event.users !== 'object' || Array.isArray(event.users)) {
        event.users = {};
      }

      // Initialize user entry if it doesn't exist
      if (!event.users[normalizedEmail]) {
        event.users[normalizedEmail] = {
          registeredAt: new Date().toISOString()
        };
      }

      // Update user's bookmarks (remove duplicates and sort)
      const uniqueBookmarks = [...new Set(bookmarks)].sort((a, b) => a - b);
      event.users[normalizedEmail] = {
        ...event.users[normalizedEmail],
        bookmarks: uniqueBookmarks
      };

      // Update event with new user data
      const updatedEvent = {
        ...event,
        users: event.users,
        updatedAt: new Date().toISOString()
      };

      // Persist updated event
      await this.updateEvent(eventId, updatedEvent);

      loggerService.info(`Bookmarks saved for user ${normalizedEmail} in event ${eventId}: ${uniqueBookmarks.length} bookmarks`);

      return {
        eventId,
        email: normalizedEmail,
        bookmarks: uniqueBookmarks
      };
    } catch (error) {
      // If event not found, throw with clear message
      if (error.message.includes('not found') || error.message.includes('File not found')) {
        throw new Error(`Event not found: ${eventId}`);
      }
      // Re-throw validation errors
      if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('must be')) {
        throw error;
      }
      // Log and re-throw other errors
      loggerService.error(`Error saving bookmarks for user ${normalizedEmail} in event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Migrate administrator field from string to administrators object structure
   * @param {object} event - Event object
   * @returns {boolean} True if migration occurred, false otherwise
   */
  migrateAdministratorField(event) {
    if (event.administrator && !event.administrators) {
      const normalizedEmail = this.normalizeEmail(event.administrator);
      event.administrators = {
        [normalizedEmail]: {
          assignedAt: event.createdAt || new Date().toISOString(),
          owner: true
        }
      };
      delete event.administrator;
      return true; // Indicates migration occurred
    }
    return false; // No migration needed
  }

  /**
   * Migrate legacy "finished" state to "completed" state
   * Automatically converts "finished" state to "completed" for backward compatibility
   * Updates the updatedAt timestamp when migration occurs
   * @param {object} event - Event object (modified in place)
   * @returns {boolean} True if migration occurred, false otherwise
   */
  migrateLegacyState(event) {
    if (event.state === 'finished') {
      event.state = 'completed';
      event.updatedAt = new Date().toISOString();
      return true; // Indicates migration occurred
    }
    return false; // No migration needed
  }

  /**
   * Check if a user is an administrator for an event
   * @param {object} event - Event object
   * @param {string} email - Email address to check
   * @returns {boolean} True if user is an administrator
   */
  isAdministrator(event, email) {
    if (!event || !email) {
      return false;
    }
    // Migrate if needed
    this.migrateAdministratorField(event);
    const normalizedEmail = this.normalizeEmail(email);
    return event.administrators && event.administrators[normalizedEmail] !== undefined;
  }

  /**
   * Check if a user is the owner of an event
   * @param {object} event - Event object
   * @param {string} email - Email address to check
   * @returns {boolean} True if user is the owner
   */
  isOwner(event, email) {
    if (!event || !email) {
      return false;
    }
    // Migrate if needed
    this.migrateAdministratorField(event);
    const normalizedEmail = this.normalizeEmail(email);
    return event.administrators && 
           event.administrators[normalizedEmail] && 
           event.administrators[normalizedEmail].owner === true;
  }

  /**
   * Normalize email address (lowercase and trim)
   * @param {string} email - Email address
   * @returns {string} Normalized email address
   */
  normalizeEmail(email) {
    if (!email || typeof email !== 'string') {
      return '';
    }
    return email.trim().toLowerCase();
  }

  /**
   * Validate email format
   * @param {string} email - Email address to validate
   * @returns {boolean} True if email format is valid
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    const normalizedEmail = this.normalizeEmail(email);
    if (normalizedEmail.length === 0) {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(normalizedEmail);
  }

  /**
   * Get administrators list for an event
   * @param {string} eventId - Event identifier
   * @param {string} requesterEmail - Email of the requester (must be an existing administrator)
   * @returns {Promise<object>} Administrators object
   */
  async getAdministrators(eventId, requesterEmail) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!requesterEmail || typeof requesterEmail !== 'string') {
      throw new Error('Requester email is required');
    }

    // Get current event (lazy migration happens in getEvent)
    const event = await this.getEvent(eventId);

    // Validate requester is administrator
    if (!this.isAdministrator(event, requesterEmail)) {
      throw new Error('Unauthorized: Only administrators can view administrators list');
    }

    // Return administrators object
    return event.administrators || {};
  }

  /**
   * Add a new administrator to an event
   * @param {string} eventId - Event identifier
   * @param {string} newAdminEmail - Email of the new administrator to add
   * @param {string} requesterEmail - Email of the requester (must be an existing administrator)
   * @returns {Promise<object>} Updated event with new administrator
   */
  async addAdministrator(eventId, newAdminEmail, requesterEmail) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!newAdminEmail || typeof newAdminEmail !== 'string') {
      throw new Error('Email address is required');
    }

    // Trim email before validation
    const trimmedEmail = newAdminEmail.trim();
    if (trimmedEmail.length === 0) {
      throw new Error('Email address cannot be empty');
    }

    if (!requesterEmail || typeof requesterEmail !== 'string') {
      throw new Error('Requester email is required');
    }

    // Get current event (lazy migration happens in getEvent)
    const event = await this.getEvent(eventId);

    // Validate requester is administrator
    if (!this.isAdministrator(event, requesterEmail)) {
      throw new Error('Unauthorized: Only administrators can add administrators');
    }

    // Validate and normalize email (trimming already done above)
    const normalizedEmail = this.normalizeEmail(trimmedEmail);
    if (!this.isValidEmail(normalizedEmail)) {
      throw new Error('Invalid email address format. Please provide a valid email address.');
    }

    // Check for duplicates
    if (event.administrators[normalizedEmail]) {
      throw new Error(`Administrator with email ${normalizedEmail} already exists for this event.`);
    }

    // Initialize administrators and users if needed
    if (!event.administrators) {
      event.administrators = {};
    }
    if (!event.users) {
      event.users = {};
    }

    const now = new Date().toISOString();

    // Add to administrators object
    event.administrators[normalizedEmail] = {
      assignedAt: now,
      owner: false
    };

    // Add to users section if not already present
    if (!event.users[normalizedEmail]) {
      event.users[normalizedEmail] = {
        registeredAt: now
      };
    }

    // Atomic update: save both administrators and users together
    await this.updateEvent(eventId, event);

    loggerService.info(`Administrator added to event ${eventId}: ${normalizedEmail} by ${requesterEmail}`, {
      eventId,
      newAdministrator: normalizedEmail,
      requester: requesterEmail
    });
    return event;
  }

  /**
   * Delete an administrator from an event
   * @param {string} eventId - Event identifier
   * @param {string} emailToDelete - Email of the administrator to delete
   * @param {string} requesterEmail - Email of the requester (must be an existing administrator)
   * @returns {Promise<object>} Updated event with administrator removed
   */
  async deleteAdministrator(eventId, emailToDelete, requesterEmail) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!emailToDelete || typeof emailToDelete !== 'string') {
      throw new Error('Email address is required');
    }

    // Trim email before processing
    const trimmedEmail = emailToDelete.trim();
    if (trimmedEmail.length === 0) {
      throw new Error('Email address cannot be empty');
    }

    if (!requesterEmail || typeof requesterEmail !== 'string') {
      throw new Error('Requester email is required');
    }

    // Get current event (lazy migration happens in getEvent)
    const event = await this.getEvent(eventId);

    // Validate requester is administrator
    if (!this.isAdministrator(event, requesterEmail)) {
      throw new Error('Unauthorized: Only administrators can delete administrators');
    }

    // Normalize email (trimming already done above)
    const normalizedEmail = this.normalizeEmail(trimmedEmail);

    // Check if target administrator exists
    if (!event.administrators[normalizedEmail]) {
      throw new Error(`Administrator with email ${normalizedEmail} not found for this event.`);
    }

    // Check if target is owner (prevent deletion)
    if (this.isOwner(event, normalizedEmail)) {
      throw new Error('Cannot delete owner: The original administrator cannot be removed');
    }

    // Check if this would leave no administrators
    const adminCount = Object.keys(event.administrators).length;
    if (adminCount <= 1) {
      throw new Error('Cannot delete last administrator: At least one administrator must remain');
    }

    // Remove from administrators object
    delete event.administrators[normalizedEmail];

    // Remove from users section
    if (event.users && event.users[normalizedEmail]) {
      delete event.users[normalizedEmail];
    }

    // Atomic update: save both administrators and users together
    await this.updateEvent(eventId, event);

    loggerService.info(`Administrator deleted from event ${eventId}: ${normalizedEmail} by ${requesterEmail}`, {
      eventId,
      deletedAdministrator: normalizedEmail,
      requester: requesterEmail
    });
    return event;
  }

  /**
   * Regenerate PIN for an event
   * @param {string} eventId - Event identifier
   * @param {string} administratorEmail - Email of the administrator requesting regeneration
   * @returns {Promise<object>} Updated event with new PIN
   */
  async regeneratePIN(eventId, administratorEmail) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!administratorEmail || typeof administratorEmail !== 'string') {
      throw new Error('Administrator email is required');
    }

    try {
      // Get current event (lazy migration happens in getEvent)
      const event = await this.getEvent(eventId);

      // Verify administrator (case-insensitive email comparison)
      const normalizedRequestEmail = this.normalizeEmail(administratorEmail);
      if (!this.isAdministrator(event, normalizedRequestEmail)) {
        throw new Error('Only the event administrator can regenerate PINs');
      }

      // Generate new PIN
      const newPIN = pinService.generatePIN();
      const now = new Date().toISOString();

      // Update event with new PIN
      const updatedEvent = {
        ...event,
        pin: newPIN,
        pinGeneratedAt: now,
        updatedAt: now
      };

      // Persist updated event using updateEvent method
      await this.updateEvent(eventId, updatedEvent);

      // Invalidate all existing PIN sessions for this event
      pinService.invalidatePINSessions(eventId);

      loggerService.info(`PIN regenerated for event: ${eventId} by ${administratorEmail}`);
      
      return {
        pin: newPIN,
        eventId,
        pinGeneratedAt: now,
        message: 'PIN regenerated successfully'
      };
    } catch (error) {
      // If event not found, throw with clear message
      if (error.message.includes('not found') || error.message.includes('File not found')) {
        throw new Error(`Event not found: ${eventId}`);
      }
      // Re-throw authorization errors
      if (error.message.includes('administrator')) {
        throw error;
      }
      // Log and re-throw other errors
      loggerService.error(`Error regenerating PIN for event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get item configuration for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<object>} Item configuration object with numberOfItems and excludedItemIds
   */
  async getItemConfiguration(eventId) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    // Get event
    const event = await this.getEvent(eventId);

    // Return itemConfiguration or defaults
    if (event.itemConfiguration) {
      return {
        numberOfItems: event.itemConfiguration.numberOfItems ?? 20,
        excludedItemIds: event.itemConfiguration.excludedItemIds ?? []
      };
    }

    // Return defaults if not configured
    return {
      numberOfItems: 20,
      excludedItemIds: []
    };
  }

  /**
   * Update item configuration for an event
   * @param {string} eventId - Event identifier
   * @param {object} config - Configuration object with numberOfItems and/or excludedItemIds
   * @param {string} requesterEmail - Email of the requester (must be an administrator)
   * @returns {Promise<object>} Updated item configuration
   */
  async updateItemConfiguration(eventId, config, requesterEmail) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!requesterEmail || typeof requesterEmail !== 'string') {
      throw new Error('Requester email is required');
    }

    // Get current event
    const event = await this.getEvent(eventId);

    // Validate requester is administrator
    if (!this.isAdministrator(event, requesterEmail)) {
      throw new Error('Unauthorized: Only administrators can update item configuration');
    }

    // Get current configuration or defaults
    const current = event.itemConfiguration || {
      numberOfItems: 20,
      excludedItemIds: []
    };

    // Update numberOfItems if provided
    let numberOfItems = current.numberOfItems;
    if (config.numberOfItems !== undefined) {
      // Validate numberOfItems
      if (!Number.isInteger(config.numberOfItems) || config.numberOfItems < 1 || config.numberOfItems > 100) {
        throw new Error('Number of items must be an integer between 1 and 100');
      }
      numberOfItems = config.numberOfItems;
    }

    // Handle excludedItemIds
    let excludedItemIds = current.excludedItemIds || [];
    if (config.excludedItemIds !== undefined) {
      excludedItemIds = this.normalizeExcludedItemIds(config.excludedItemIds, numberOfItems);
    }

    // Check if numberOfItems was reduced and some excluded IDs are now invalid
    let warning = null;
    if (numberOfItems < current.numberOfItems) {
      const invalidIds = excludedItemIds.filter(id => id > numberOfItems);
      if (invalidIds.length > 0) {
        excludedItemIds = excludedItemIds.filter(id => id <= numberOfItems);
        warning = `Item IDs ${invalidIds.join(', ')} were removed because they are outside the valid range (1-${numberOfItems})`;
      }
    }

    // Update event
    event.itemConfiguration = {
      numberOfItems,
      excludedItemIds
    };
    event.updatedAt = new Date().toISOString();

    // Save event
    await this.updateEvent(eventId, event);

    loggerService.info(`Item configuration updated for event ${eventId} by ${requesterEmail}`, {
      eventId,
      numberOfItems,
      requester: requesterEmail
    });

    return {
      numberOfItems,
      excludedItemIds,
      ...(warning && { warning })
    };
  }

  /**
   * Normalize excluded item IDs from input (comma-separated string or array)
   * @param {string|array} input - Comma-separated string or array of item IDs
   * @param {number} numberOfItems - Total number of items (for validation)
   * @returns {array} Normalized array of unique integers
   */
  normalizeExcludedItemIds(input, numberOfItems) {
    // Handle both string and array input
    const inputArray = Array.isArray(input) ? input : String(input).split(',');
    
    // Parse, normalize, and validate
    const normalized = inputArray
      .map(id => String(id).trim())
      .filter(id => id.length > 0)
      .map(id => parseInt(id.replace(/^0+/, ''), 10)) // Remove leading zeros
      .filter(id => !isNaN(id) && Number.isInteger(id));
    
    // Validate range
    const invalidIds = normalized.filter(id => id < 1 || id > numberOfItems);
    if (invalidIds.length > 0) {
      throw new Error(`Invalid item IDs: ${invalidIds.join(', ')}. Must be between 1 and ${numberOfItems}`);
    }
    
    // Remove duplicates and sort
    const unique = [...new Set(normalized)];
    const sorted = unique.sort((a, b) => a - b);
    
    // Check at least one item remains
    if (sorted.length >= numberOfItems) {
      throw new Error('At least one item must be available. Cannot exclude all item IDs');
    }
    
    return sorted;
  }

  /**
   * Convert color input (hex, RGB, or HSL) to hex format
   * @param {string} colorInput - Color in hex (#RRGGBB or #RGB), RGB (rgb(r,g,b)), or HSL (hsl(h,s%,l%)) format
   * @returns {string} Hex color code (#RRGGBB)
   * @throws {Error} If color format is invalid
   */
  convertColorToHex(colorInput) {
    if (!colorInput || typeof colorInput !== 'string') {
      throw new Error('Color input is required and must be a string');
    }

    const trimmed = colorInput.trim();

    // Already hex format (#RRGGBB or #RGB)
    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
      return trimmed.toUpperCase();
    }

    // Short hex format (#RGB)
    if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }

    // RGB format: rgb(r, g, b) or rgb(r,g,b)
    const rgbMatch = trimmed.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      
      if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        throw new Error('RGB values must be between 0 and 255');
      }
      
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    }

    // HSL format: hsl(h, s%, l%) or hsl(h,s%,l%)
    const hslMatch = trimmed.match(/^hsl\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)$/i);
    if (hslMatch) {
      const h = parseInt(hslMatch[1], 10) / 360;
      const s = parseInt(hslMatch[2], 10) / 100;
      const l = parseInt(hslMatch[3], 10) / 100;
      
      // Convert HSL to RGB
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h * 6) % 2 - 1));
      const m = l - c / 2;
      
      let r, g, b;
      if (h < 1/6) {
        r = c; g = x; b = 0;
      } else if (h < 2/6) {
        r = x; g = c; b = 0;
      } else if (h < 3/6) {
        r = 0; g = c; b = x;
      } else if (h < 4/6) {
        r = 0; g = x; b = c;
      } else if (h < 5/6) {
        r = x; g = 0; b = c;
      } else {
        r = c; g = 0; b = x;
      }
      
      r = Math.round((r + m) * 255);
      g = Math.round((g + m) * 255);
      b = Math.round((b + m) * 255);
      
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    }

    throw new Error(`Invalid color format: ${trimmed}. Supported formats: #RRGGBB, #RGB, rgb(r,g,b), hsl(h,s%,l%)`);
  }

  /**
   * Generate default ratings array for a given maxRating value
   * @param {number} maxRating - Maximum rating value (2, 3, or 4)
   * @returns {Array} Array of rating objects with value, label, and color
   * @throws {Error} If maxRating is not 2, 3, or 4
   */
  generateDefaultRatings(maxRating) {
    if (!Number.isInteger(maxRating) || maxRating < 2 || maxRating > 4) {
      throw new Error('maxRating must be an integer between 2 and 4');
    }

    const preset = DEFAULT_RATING_PRESETS[maxRating];
    if (!preset) {
      throw new Error(`No default preset found for maxRating: ${maxRating}`);
    }

    // Return a deep copy to prevent mutation
    return preset.map(rating => ({ ...rating }));
  }

  /**
   * Get rating configuration for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<object>} Rating configuration object with maxRating and ratings array
   */
  async getRatingConfiguration(eventId) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    // Get event
    const event = await this.getEvent(eventId);

    // Determine noteSuggestionsEnabled value
    // Default to true for wine events if not set
    let noteSuggestionsEnabled = undefined;
    if (event.typeOfItem === 'wine') {
      if (event.ratingConfiguration?.noteSuggestionsEnabled !== undefined) {
        noteSuggestionsEnabled = event.ratingConfiguration.noteSuggestionsEnabled;
      } else {
        // Default to true for wine events when not set
        noteSuggestionsEnabled = true;
      }
    }

    // Return ratingConfiguration or defaults
    if (event.ratingConfiguration) {
      const config = {
        maxRating: event.ratingConfiguration.maxRating ?? 4,
        ratings: event.ratingConfiguration.ratings ?? this.generateDefaultRatings(event.ratingConfiguration.maxRating ?? 4)
      };
      
      // Include noteSuggestionsEnabled if applicable (wine events)
      if (noteSuggestionsEnabled !== undefined) {
        config.noteSuggestionsEnabled = noteSuggestionsEnabled;
      }
      
      return config;
    }

    // Return defaults if not configured
    const defaultMaxRating = 4;
    const defaultConfig = {
      maxRating: defaultMaxRating,
      ratings: this.generateDefaultRatings(defaultMaxRating)
    };
    
    // Include noteSuggestionsEnabled if applicable (wine events)
    if (noteSuggestionsEnabled !== undefined) {
      defaultConfig.noteSuggestionsEnabled = noteSuggestionsEnabled;
    }
    
    return defaultConfig;
  }

  /**
   * Validate max rating change is allowed based on event state
   * @param {object} event - Event object
   * @param {number} newMaxRating - New max rating value
   * @returns {{valid: boolean, error?: string}} Validation result
   */
  validateMaxRatingChange(event, newMaxRating) {
    // Max rating can only be changed when event is in "created" state
    if (event.state !== 'created') {
      return {
        valid: false,
        error: `Maximum rating can only be changed when event is in "created" state. Current state: ${event.state}`
      };
    }

    // Validate newMaxRating is different from current
    const currentMaxRating = event.ratingConfiguration?.maxRating ?? 4;
    if (newMaxRating === currentMaxRating) {
      // No change, this is valid (no-op)
      return { valid: true };
    }

    return { valid: true };
  }

  /**
   * Validate rating configuration
   * @param {object} config - Rating configuration object
   * @param {number} config.maxRating - Maximum rating value (2-4)
   * @param {Array} config.ratings - Array of rating objects
   * @returns {{valid: boolean, error?: string}} Validation result
   */
  validateRatingConfiguration(config) {
    if (!config || typeof config !== 'object') {
      return { valid: false, error: 'Rating configuration is required' };
    }

    // Validate maxRating
    if (config.maxRating !== undefined) {
      if (!Number.isInteger(config.maxRating) || config.maxRating < 2 || config.maxRating > 4) {
        return { valid: false, error: 'maxRating must be an integer between 2 and 4' };
      }
    }

    // Validate ratings array if provided
    if (config.ratings !== undefined) {
      if (!Array.isArray(config.ratings)) {
        return { valid: false, error: 'ratings must be an array' };
      }

      const maxRating = config.maxRating ?? 4;
      
      // Validate array length matches maxRating
      if (config.ratings.length !== maxRating) {
        return { valid: false, error: `ratings array must contain exactly ${maxRating} rating objects` };
      }

      // Validate each rating object
      for (let i = 0; i < config.ratings.length; i++) {
        const rating = config.ratings[i];
        const expectedValue = i + 1;

        if (!rating || typeof rating !== 'object') {
          return { valid: false, error: `Rating at index ${i} must be an object` };
        }

        // Validate value
        if (rating.value !== expectedValue) {
          return { valid: false, error: `Rating at index ${i} must have value ${expectedValue}` };
        }

        // Validate label
        if (!rating.label || typeof rating.label !== 'string') {
          return { valid: false, error: `Rating at index ${i} must have a non-empty label string` };
        }

        if (rating.label.trim().length === 0) {
          return { valid: false, error: `Rating at index ${i} label cannot be empty` };
        }

        if (rating.label.length > 50) {
          return { valid: false, error: `Rating at index ${i} label must be 50 characters or less` };
        }

        // Validate color
        if (!rating.color || typeof rating.color !== 'string') {
          return { valid: false, error: `Rating at index ${i} must have a color string` };
        }

        // Validate color format (must be valid hex after conversion)
        try {
          this.convertColorToHex(rating.color);
        } catch (error) {
          return { valid: false, error: `Rating at index ${i} has invalid color format: ${error.message}` };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Update rating configuration for an event
   * @param {string} eventId - Event identifier
   * @param {object} config - Configuration object with maxRating and/or ratings
   * @param {string} requesterEmail - Email of the requester (must be an administrator)
   * @param {string} expectedUpdatedAt - Expected updatedAt timestamp for optimistic locking (optional)
   * @returns {Promise<object>} Updated rating configuration
   */
  async updateRatingConfiguration(eventId, config, requesterEmail, expectedUpdatedAt) {
    // Validate event ID format
    const idValidation = this.validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!requesterEmail || typeof requesterEmail !== 'string') {
      throw new Error('Requester email is required');
    }

    // Get current event
    const event = await this.getEvent(eventId);

    // Optimistic locking: check updatedAt if provided
    if (expectedUpdatedAt && event.updatedAt !== expectedUpdatedAt) {
      loggerService.warn(`Optimistic locking conflict for event ${eventId}: expected=${expectedUpdatedAt}, actual=${event.updatedAt}`);
      const error = new Error('Event has been modified by another administrator. Please refresh and try again.');
      error.currentUpdatedAt = event.updatedAt;
      error.code = 'OPTIMISTIC_LOCK_CONFLICT';
      throw error;
    }

    // Validate requester is administrator
    if (!this.isAdministrator(event, requesterEmail)) {
      throw new Error('Unauthorized: Only administrators can update rating configuration');
    }

    // Get current configuration or defaults
    const current = event.ratingConfiguration || {
      maxRating: 4,
      ratings: this.generateDefaultRatings(4)
    };

    // Determine new maxRating
    let newMaxRating = current.maxRating;
    if (config.maxRating !== undefined) {
      // Validate maxRating change is allowed
      const maxRatingValidation = this.validateMaxRatingChange(event, config.maxRating);
      if (!maxRatingValidation.valid) {
        throw new Error(maxRatingValidation.error);
      }

      if (!Number.isInteger(config.maxRating) || config.maxRating < 2 || config.maxRating > 4) {
        throw new Error('maxRating must be an integer between 2 and 4');
      }
      newMaxRating = config.maxRating;
    }

    // Handle ratings array
    let newRatings = current.ratings;
    if (config.ratings !== undefined) {
      // If maxRating changed, generate new ratings array
      if (config.maxRating !== undefined && config.maxRating !== current.maxRating) {
        newRatings = this.generateDefaultRatings(newMaxRating);
      } else {
        // Use provided ratings array
        newRatings = config.ratings;
      }
    } else if (config.maxRating !== undefined && config.maxRating !== current.maxRating) {
      // MaxRating changed but no ratings provided, generate defaults
      newRatings = this.generateDefaultRatings(newMaxRating);
    }

    // Convert all colors to hex format
    const normalizedRatings = newRatings.map(rating => {
      try {
        const hexColor = this.convertColorToHex(rating.color);
        return {
          value: rating.value,
          label: rating.label.trim(),
          color: hexColor
        };
      } catch (error) {
        throw new Error(`Invalid color for rating value ${rating.value}: ${error.message}`);
      }
    });

    // Validate the complete configuration
    const validation = this.validateRatingConfiguration({
      maxRating: newMaxRating,
      ratings: normalizedRatings
    });
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Handle noteSuggestionsEnabled if provided
    let noteSuggestionsEnabled = current.noteSuggestionsEnabled;
    if (config.noteSuggestionsEnabled !== undefined) {
      // Validate noteSuggestionsEnabled change is allowed
      if (event.state !== 'created') {
        throw new Error('Note suggestions toggle can only be changed when event is in "created" state');
      }
      
      if (event.typeOfItem !== 'wine') {
        throw new Error('Note suggestions are only available for wine events');
      }
      
      if (typeof config.noteSuggestionsEnabled !== 'boolean') {
        throw new Error('noteSuggestionsEnabled must be a boolean');
      }
      
      noteSuggestionsEnabled = config.noteSuggestionsEnabled;
    } else if (event.typeOfItem === 'wine' && noteSuggestionsEnabled === undefined) {
      // Default to true for wine events if not set
      noteSuggestionsEnabled = true;
    }

    // Update event
    event.ratingConfiguration = {
      maxRating: newMaxRating,
      ratings: normalizedRatings
    };
    
    // Include noteSuggestionsEnabled if applicable (wine events)
    if (event.typeOfItem === 'wine') {
      event.ratingConfiguration.noteSuggestionsEnabled = noteSuggestionsEnabled;
    }
    
    event.updatedAt = new Date().toISOString();

    // Save event
    await this.updateEvent(eventId, event);

    loggerService.info(`Rating configuration updated for event ${eventId} by ${requesterEmail}`, {
      eventId,
      maxRating: newMaxRating,
      noteSuggestionsEnabled: event.typeOfItem === 'wine' ? noteSuggestionsEnabled : undefined,
      requester: requesterEmail
    });

    const result = {
      maxRating: newMaxRating,
      ratings: normalizedRatings
    };
    
    // Include noteSuggestionsEnabled in response if applicable (wine events)
    if (event.typeOfItem === 'wine') {
      result.noteSuggestionsEnabled = noteSuggestionsEnabled;
    }
    
    return result;
  }
}

export default new EventService();
