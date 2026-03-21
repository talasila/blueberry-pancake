import eventService from './EventService.js';
import dataRepository from '../data/DynamoDBRepository.js';
import loggerService from '../logging/Logger.js';
import { normalizeEmail as normalizeEmailUtil } from '../utils/emailUtils.js';
import { validateEventId } from '../utils/validators.js';
import { getCurrentTimestamp } from '../utils/timestamps.js';

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
 * EventConfigService
 * Handles rating configuration, item configuration, theme, bookmarks, and user profile operations.
 * Depends on core EventService for shared helpers (getEvent, isAdministrator, updateEvent, validateTheme).
 */
class EventConfigService {
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
   * Get rating configuration for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<object>} Rating configuration object with maxRating and ratings array
   */
  async getRatingConfiguration(eventId) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    // Get event
    const event = await eventService.getEvent(eventId);

    // Determine wine-only feature flags
    // Default to true for wine events if not set
    let noteSuggestionsEnabled = undefined;
    let personalityEnabled = undefined;
    if (event.typeOfItem === 'wine') {
      if (event.ratingConfiguration?.noteSuggestionsEnabled !== undefined) {
        noteSuggestionsEnabled = event.ratingConfiguration.noteSuggestionsEnabled;
      } else {
        noteSuggestionsEnabled = true;
      }
      if (event.ratingConfiguration?.personalityEnabled !== undefined) {
        personalityEnabled = event.ratingConfiguration.personalityEnabled;
      } else {
        personalityEnabled = true;
      }
    }

    // Return ratingConfiguration or defaults
    if (event.ratingConfiguration) {
      const config = {
        maxRating: event.ratingConfiguration.maxRating ?? 4,
        ratings: event.ratingConfiguration.ratings ?? this.generateDefaultRatings(event.ratingConfiguration.maxRating ?? 4)
      };

      // Include wine-only feature flags if applicable
      if (noteSuggestionsEnabled !== undefined) {
        config.noteSuggestionsEnabled = noteSuggestionsEnabled;
      }
      if (personalityEnabled !== undefined) {
        config.personalityEnabled = personalityEnabled;
      }

      return config;
    }

    // Return defaults if not configured
    const defaultMaxRating = 4;
    const defaultConfig = {
      maxRating: defaultMaxRating,
      ratings: this.generateDefaultRatings(defaultMaxRating)
    };

    // Include wine-only feature flags if applicable
    if (noteSuggestionsEnabled !== undefined) {
      defaultConfig.noteSuggestionsEnabled = noteSuggestionsEnabled;
    }
    if (personalityEnabled !== undefined) {
      defaultConfig.personalityEnabled = personalityEnabled;
    }

    return defaultConfig;
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
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!requesterEmail || typeof requesterEmail !== 'string') {
      throw new Error('Requester email is required');
    }

    // Get current event
    const event = await eventService.getEvent(eventId);

    // Optimistic locking: check updatedAt if provided
    if (expectedUpdatedAt && event.updatedAt !== expectedUpdatedAt) {
      loggerService.warn(`Optimistic locking conflict for event ${eventId}: expected=${expectedUpdatedAt}, actual=${event.updatedAt}`);
      const error = new Error('Event has been modified by another administrator. Please refresh and try again.');
      error.currentUpdatedAt = event.updatedAt;
      error.code = 'OPTIMISTIC_LOCK_CONFLICT';
      throw error;
    }

    // Validate requester is administrator
    if (!eventService.isAdministrator(event, requesterEmail)) {
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
      noteSuggestionsEnabled = true;
    }

    // Handle personalityEnabled if provided
    let personalityEnabled = current.personalityEnabled;
    if (config.personalityEnabled !== undefined) {
      if (event.state !== 'created') {
        throw new Error('Personality detection toggle can only be changed when event is in "created" state');
      }
      if (event.typeOfItem !== 'wine') {
        throw new Error('Personality detection is only available for wine events');
      }
      if (typeof config.personalityEnabled !== 'boolean') {
        throw new Error('personalityEnabled must be a boolean');
      }
      personalityEnabled = config.personalityEnabled;
    } else if (event.typeOfItem === 'wine' && personalityEnabled === undefined) {
      personalityEnabled = true;
    }

    // Update event
    event.ratingConfiguration = {
      maxRating: newMaxRating,
      ratings: normalizedRatings
    };

    // Include wine-only feature flags if applicable
    if (event.typeOfItem === 'wine') {
      event.ratingConfiguration.noteSuggestionsEnabled = noteSuggestionsEnabled;
      event.ratingConfiguration.personalityEnabled = personalityEnabled;
    }

    event.updatedAt = getCurrentTimestamp();

    // Save event
    await eventService.updateEvent(eventId, event);

    loggerService.info(`Rating configuration updated for event ${eventId} by ${requesterEmail}`, {
      eventId,
      maxRating: newMaxRating,
      noteSuggestionsEnabled: event.typeOfItem === 'wine' ? noteSuggestionsEnabled : undefined,
      personalityEnabled: event.typeOfItem === 'wine' ? personalityEnabled : undefined,
      requester: requesterEmail
    });

    const result = {
      maxRating: newMaxRating,
      ratings: normalizedRatings
    };

    // Include wine-only feature flags in response if applicable
    if (event.typeOfItem === 'wine') {
      result.noteSuggestionsEnabled = noteSuggestionsEnabled;
      result.personalityEnabled = personalityEnabled;
    }

    return result;
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
   * Get item configuration for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<object>} Item configuration object with numberOfItems and excludedItemIds
   */
  async getItemConfiguration(eventId) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    // Get event
    const event = await eventService.getEvent(eventId);

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
   * Get count of registered items for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<number>} Count of registered items
   */
  async getRegisteredItemsCount(eventId) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    // Get event
    const event = await eventService.getEvent(eventId);

    // Initialize items array if needed
    if (!event.items || !Array.isArray(event.items)) {
      return 0;
    }

    return event.items.length;
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
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!requesterEmail || typeof requesterEmail !== 'string') {
      throw new Error('Requester email is required');
    }

    // Get current event
    const event = await eventService.getEvent(eventId);

    // Validate requester is administrator
    if (!eventService.isAdministrator(event, requesterEmail)) {
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

      // Validate numberOfItems is not less than registered items count
      const registeredCount = await this.getRegisteredItemsCount(eventId);
      if (numberOfItems < registeredCount) {
        throw new Error(`Number of items (${numberOfItems}) cannot be less than the number of registered items (${registeredCount})`);
      }

      // Validate numberOfItems is not less than highest assigned itemId
      const items = event.items || [];
      const assignedItemIds = items
        .filter(item => item.itemId !== null && item.itemId !== undefined)
        .map(item => item.itemId);

      if (assignedItemIds.length > 0) {
        const highestAssignedId = Math.max(...assignedItemIds);
        if (numberOfItems < highestAssignedId) {
          throw new Error(`Number of items (${numberOfItems}) cannot be less than the highest assigned item ID (${highestAssignedId})`);
        }
      }
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
    event.updatedAt = getCurrentTimestamp();

    // Save event
    await eventService.updateEvent(eventId, event);

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
   * Update event theme preset. Only allowed when event is in "created" or "paused" state.
   * @param {string} eventId - Event identifier
   * @param {string} theme - Theme preset identifier
   * @param {string} administratorEmail - Email of administrator performing update
   * @returns {Promise<object>} Updated event
   */
  async updateTheme(eventId, theme, administratorEmail) {
    if (!theme) {
      throw new Error('Theme is required');
    }

    const themeValidation = eventService.validateTheme(theme);
    if (!themeValidation.valid) {
      throw new Error(themeValidation.error);
    }

    const event = await eventService.getEvent(eventId);

    const normalizedEmail = this.normalizeEmail(administratorEmail);
    if (!eventService.isAdministrator(event, normalizedEmail)) {
      throw new Error('Only administrators can update the theme');
    }

    if (event.state !== 'created' && event.state !== 'paused') {
      throw new Error('Theme can only be changed when event is in created or paused state');
    }

    event.theme = theme;
    return eventService.updateEvent(eventId, event);
  }

  /**
   * Get bookmarks for a user in an event
   * @param {string} eventId - Event identifier
   * @param {string} email - User email address
   * @returns {Promise<Array<number>>} Array of bookmarked item IDs
   */
  async getUserBookmarks(eventId, email) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!email || typeof email !== 'string') {
      throw new Error('Email is required');
    }

    const normalizedEmail = normalizeEmailUtil(email);

    try {
      // Verify event exists
      await eventService.getEvent(eventId);

      // Get bookmarks directly from repository (stored separately)
      const bookmarks = await dataRepository.getBookmarks(eventId, normalizedEmail);

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
   * Bookmarks are stored as separate DynamoDB items to prevent concurrent write conflicts
   * @param {string} eventId - Event identifier
   * @param {string} email - User email address
   * @param {Array<number>} bookmarks - Array of bookmarked item IDs
   * @returns {Promise<{eventId: string, email: string, bookmarks: Array<number>}>}
   */
  async saveUserBookmarks(eventId, email, bookmarks) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
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

    const normalizedEmail = normalizeEmailUtil(email);

    try {
      // Verify event exists
      await eventService.getEvent(eventId);

      // Remove duplicates and sort bookmarks
      const uniqueBookmarks = [...new Set(bookmarks)].sort((a, b) => a - b);

      // Save bookmarks directly to repository (stored as separate item)
      await dataRepository.saveBookmarks(eventId, normalizedEmail, uniqueBookmarks);

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
    const normalizedEmail = normalizeEmailUtil(email);

    try {
      // Get current event from cache
      const event = await eventService.getEvent(eventId);

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
    const normalizedEmail = normalizeEmailUtil(email);

    try {
      // Get current event from cache
      const event = await eventService.getEvent(eventId);

      // Initialize users map if it doesn't exist
      if (!event.users || typeof event.users !== 'object' || Array.isArray(event.users)) {
        event.users = {};
      }

      // Initialize user entry if it doesn't exist
      if (!event.users[normalizedEmail]) {
        event.users[normalizedEmail] = {
          registeredAt: getCurrentTimestamp()
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
        updatedAt: getCurrentTimestamp()
      };

      // Persist updated event
      await eventService.updateEvent(eventId, updatedEvent);

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
      const hue = parseInt(hslMatch[1], 10);
      const sat = parseInt(hslMatch[2], 10);
      const light = parseInt(hslMatch[3], 10);

      if (hue < 0 || hue > 360) {
        throw new Error('HSL hue value must be between 0 and 360');
      }
      if (sat < 0 || sat > 100) {
        throw new Error('HSL saturation value must be between 0 and 100');
      }
      if (light < 0 || light > 100) {
        throw new Error('HSL lightness value must be between 0 and 100');
      }

      const h = hue / 360;
      const s = sat / 100;
      const l = light / 100;

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
}

export default new EventConfigService();
