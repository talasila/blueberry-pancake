import { customAlphabet } from 'nanoid';
import dataRepository from '../data/DynamoDBRepository.js';
import loggerService from '../logging/Logger.js';
import pinService from './PINService.js';
import { normalizeEmail as normalizeEmailUtil, isValidEmail as isValidEmailUtil } from '../utils/emailUtils.js';
import { validateEventId } from '../utils/validators.js';
import { getCurrentTimestamp } from '../utils/timestamps.js';

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const nanoid = customAlphabet(CROCKFORD_BASE32, 8);

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

const VALID_THEMES = ['classic', 'cellar', 'terracotta', 'golden', 'olive', 'garden', 'ocean', 'midnight', 'lavender', 'rose'];

/**
 * EventService (core)
 * Handles event CRUD, state management, user registration, and shared helpers.
 * Admin operations are in EventAdminService; config operations are in EventConfigService.
 */
class EventService {
  /**
   * Validate theme preset identifier
   * @param {string} theme - Theme identifier
   * @returns {{valid: boolean, error?: string}} Validation result
   */
  validateTheme(theme) {
    if (theme === undefined || theme === null) {
      return { valid: true };
    }
    if (typeof theme !== 'string' || !VALID_THEMES.includes(theme)) {
      return { valid: false, error: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}` };
    }
    return { valid: true };
  }

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

      // Check if event already exists in DynamoDB
      const exists = await dataRepository.eventExists(eventId);
      if (exists) {
        loggerService.warn(`Event ID collision detected: ${eventId}, retrying...`);
        continue;
      }

      return eventId;
    }

    throw new Error('Failed to generate unique event ID after maximum retries');
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
   * Create a new event
   * @param {string} name - Event name
   * @param {string} typeOfItem - Type of item (currently only "wine")
   * @param {string} administratorEmail - Email of the event administrator
   * @param {string} [theme] - Theme preset identifier (defaults to 'classic')
   * @returns {Promise<object>} Created event object
   */
  async createEvent(name, typeOfItem, administratorEmail, theme) {
    // Validate inputs
    const nameValidation = this.validateEventName(name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    const typeValidation = this.validateTypeOfItem(typeOfItem);
    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    const themeValidation = this.validateTheme(theme);
    if (!themeValidation.valid) {
      throw new Error(themeValidation.error);
    }

    if (!administratorEmail || typeof administratorEmail !== 'string') {
      throw new Error('Administrator email is required');
    }

    // Generate unique event ID
    const eventId = await this.generateEventId();

    // Generate 6-digit PIN for the event
    const pin = pinService.generatePIN();
    const now = getCurrentTimestamp();

    // Normalize administrator email
    const normalizedAdminEmail = this.normalizeEmail(administratorEmail);
    if (!this.isValidEmail(normalizedAdminEmail)) {
      throw new Error('Invalid administrator email format');
    }

    // Create default rating configuration
    const defaultMaxRating = 4;
    const defaultRatingConfig = {
      maxRating: defaultMaxRating,
      ratings: this.generateDefaultRatings(defaultMaxRating)
    };

    // Enable note suggestions by default for wine events
    if (typeOfItem === 'wine') {
      defaultRatingConfig.noteSuggestionsEnabled = true;
    }

    // Create default item configuration
    const defaultItemConfig = {
      numberOfItems: 20,
      excludedItemIds: []
    };

    // Create event object with administrators object structure
    const event = {
      eventId,
      name: nameValidation.value,
      typeOfItem,
      state: 'created',
      theme: theme || 'classic',
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
      ratingConfiguration: defaultRatingConfig,
      itemConfiguration: defaultItemConfig,
      pin,
      pinGeneratedAt: now,
      createdAt: now,
      updatedAt: now
    };

    // Persist event to DynamoDB
    try {
      await dataRepository.writeEventConfig(eventId, event);
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
   * Get event by ID
   * Reads directly from DynamoDB
   * @param {string} eventId - Event identifier
   * @returns {Promise<object>} Event data
   */
  async getEvent(eventId) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    try {
      // Read from DynamoDB
      const event = await dataRepository.readEventConfig(eventId);

      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }

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

      // Persist migration immediately
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
   * Writes directly to DynamoDB
   * @param {string} eventId - Event identifier
   * @param {object} event - Updated event object
   * @returns {Promise<object>} Updated event data
   */
  async updateEvent(eventId, event) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    // Update updatedAt timestamp
    event.updatedAt = getCurrentTimestamp();

    try {
      // Write directly to DynamoDB
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
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    // Validate state values
    if (!this.constructor.isValidState(newState) || !this.constructor.isValidState(currentState)) {
      loggerService.error(`Invalid state detected for event ${eventId}: newState=${newState}, currentState=${currentState}`);
      throw new Error(`Invalid state. Valid states are: created, started, paused, completed`);
    }

    // Validate transition is allowed (before hitting DB)
    if (!this.validateStateTransition(currentState, newState)) {
      loggerService.warn(`Invalid state transition attempted for event ${eventId}: ${currentState} → ${newState}`);
      throw new Error(`Invalid transition from ${currentState} to ${newState}`);
    }

    // Get event for authorization check
    const event = await this.getEvent(eventId);

    // Validate event state is valid (check for corrupted data)
    if (!this.constructor.isValidState(event.state)) {
      loggerService.error(`Corrupted event state detected for event ${eventId}: state=${event.state}`);
      throw new Error(`Invalid event state: ${event.state}. Please contact support.`);
    }

    // Validate administrator authorization
    if (!this.isAdministrator(event, administratorEmail)) {
      throw new Error('Unauthorized: Only administrators can change event state');
    }

    // Atomically transition state with optimistic locking
    // This uses DynamoDB conditional expressions to prevent race conditions
    const result = await dataRepository.transitionEventState(eventId, newState, currentState);

    if (!result.success) {
      if (result.reason === 'state_conflict') {
        // Re-fetch to get current state for error message
        const currentEvent = await this.getEvent(eventId);
        loggerService.warn(`Optimistic locking conflict for event ${eventId}: expected=${currentState}, actual=${currentEvent.state}`);
        const error = new Error(`Event state has changed. Current state: ${currentEvent.state}. Please refresh and try again.`);
        error.currentState = currentEvent.state;
        throw error;
      }
      throw new Error('Failed to transition state');
    }

    // Note: Dashboard cache invalidation happens automatically via DynamoDB TTL
    loggerService.info(`Event state transitioned: ${eventId} from ${currentState} to ${newState} by ${administratorEmail}`);

    // Return updated event
    return {
      ...event,
      state: newState,
      updatedAt: getCurrentTimestamp()
    };
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
          assignedAt: event.createdAt || getCurrentTimestamp(),
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
      event.updatedAt = getCurrentTimestamp();
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
   * Check if a user is a member of an event (in event.users OR an administrator).
   * Used by requireEventMembership middleware to gate write operations.
   * @param {object} event - Event object
   * @param {string} email - Email address to check
   * @returns {boolean} True if user is in event.users or is an administrator
   */
  isEventMember(event, email) {
    if (!event || !email) {
      return false;
    }
    const normalizedEmail = this.normalizeEmail(email);
    const inUsers = event.users && event.users[normalizedEmail] !== undefined;
    if (inUsers) return true;
    return this.isAdministrator(event, normalizedEmail);
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
   * Delegates to shared utility for consistency
   * @param {string} email - Email address
   * @returns {string} Normalized email address
   */
  normalizeEmail(email) {
    return normalizeEmailUtil(email);
  }

  /**
   * Validate email format
   * Delegates to shared utility for consistency
   * @param {string} email - Email address to validate
   * @returns {boolean} True if email format is valid
   */
  isValidEmail(email) {
    return isValidEmailUtil(email);
  }

  /**
   * Delete an event and all its data
   * Only the owner can delete an event. This permanently deletes all event data including
   * configuration, ratings, profiles, and all files in the event directory.
   * @param {string} eventId - Event identifier
   * @param {string} requesterEmail - Email of the requester (must be the owner)
   * @returns {Promise<{success: boolean, message: string}>} Success response
   * @throws {Error} If validation fails, event not found, or requester is not owner
   */
  async deleteEvent(eventId, requesterEmail) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!requesterEmail || typeof requesterEmail !== 'string') {
      throw new Error('Requester email is required');
    }

    // Get current event
    const event = await this.getEvent(eventId);

    // Verify requester is the owner
    const normalizedEmail = this.normalizeEmail(requesterEmail);
    if (!this.isOwner(event, normalizedEmail)) {
      throw new Error('Unauthorized: Only the event owner can delete the event');
    }

    // Invalidate PIN sessions for this event
    await pinService.invalidatePINSessions(eventId);

    // Delete event from DynamoDB (config and all ratings)
    await dataRepository.deleteEvent(eventId);

    loggerService.info(`Event deleted by owner: ${eventId}`, {
      eventId,
      owner: normalizedEmail,
      eventName: event.name
    });

    return {
      success: true,
      message: 'Event deleted successfully'
    };
  }
}

export default new EventService();
