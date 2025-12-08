import { customAlphabet } from 'nanoid';
import dataRepository from '../data/FileDataRepository.js';
import loggerService from '../logging/Logger.js';

// Use alphanumeric alphabet (A-Z, a-z, 0-9) for 8-character IDs
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);

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

    // Create event object
    const now = new Date().toISOString();
    const event = {
      eventId,
      name: nameValidation.value,
      typeOfItem,
      state: 'created',
      administrator: administratorEmail,
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
   * State transition validation constants (for future use)
   * Transitions are out of scope for this feature
   */
  static VALID_TRANSITIONS = {
    created: ['started', 'paused', 'finished'],
    started: ['paused', 'finished'],
    paused: ['started', 'finished'],
    finished: [] // Terminal state, no transitions allowed
  };

  /**
   * Validate event state
   * @param {string} state - Event state
   * @returns {boolean} True if state is valid
   */
  static isValidState(state) {
    return ['created', 'started', 'paused', 'finished'].includes(state);
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
}

export default new EventService();
