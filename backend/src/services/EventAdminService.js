import eventService from './EventService.js';
import dataRepository from '../data/DynamoDBRepository.js';
import loggerService from '../logging/Logger.js';
import pinService from './PINService.js';
import { normalizeEmail as normalizeEmailUtil } from '../utils/emailUtils.js';
import { validateEventId } from '../utils/validators.js';
import { getCurrentTimestamp } from '../utils/timestamps.js';
import { generateUserId } from '../utils/userIdUtils.js';

/**
 * EventAdminService
 * Handles administrator management and bulk user/data operations.
 * Depends on core EventService for shared helpers (getEvent, isAdministrator, isOwner, updateEvent).
 */
class EventAdminService {
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
   * Get administrators list for an event
   * @param {string} eventId - Event identifier
   * @param {string} requesterEmail - Email of the requester (must be an existing administrator)
   * @returns {Promise<object>} Administrators object
   */
  async getAdministrators(eventId, requesterEmail) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!requesterEmail || typeof requesterEmail !== 'string') {
      throw new Error('Requester email is required');
    }

    // Get current event (lazy migration happens in getEvent)
    const event = await eventService.getEvent(eventId);

    // Validate requester is administrator
    if (!eventService.isAdministrator(event, requesterEmail)) {
      throw new Error('Unauthorized: Only administrators can view administrators list');
    }

    // Return administrators object
    return event.administrators || {};
  }

  /**
   * Add a new administrator to an event
   * @param {string} eventId - Event identifier
   * @param {string} newAdminEmail - Email of the new administrator to add
   * @param {string} requesterEmail - Email of the requester (must be the event owner)
   * @returns {Promise<object>} Updated event with new administrator
   */
  async addAdministrator(eventId, newAdminEmail, requesterEmail) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
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

    // Get current event for authorization check
    const event = await eventService.getEvent(eventId);

    // Validate requester is the owner (only owners can add administrators)
    if (!eventService.isOwner(event, requesterEmail)) {
      throw new Error('Unauthorized: Only the event owner can add administrators');
    }

    // Validate and normalize email (trimming already done above)
    const normalizedEmail = this.normalizeEmail(trimmedEmail);
    if (!eventService.isValidEmail(normalizedEmail)) {
      throw new Error('Invalid email address format. Please provide a valid email address.');
    }

    const now = getCurrentTimestamp();

    // Use atomic operation to add administrator (prevents race conditions)
    const result = await dataRepository.addAdministratorAtomic(eventId, normalizedEmail, now);

    if (!result.added && result.alreadyExists) {
      throw new Error(`Administrator with email ${normalizedEmail} already exists for this event.`);
    }

    loggerService.info(`Administrator added to event ${eventId}`, {
      eventId,
      requester: requesterEmail
    });

    // Ensure the new admin has a userId in the users map
    const updatedEvent = await eventService.getEvent(eventId);
    if (updatedEvent?.users?.[normalizedEmail] && !updatedEvent.users[normalizedEmail].userId) {
      const userId = generateUserId();
      updatedEvent.users[normalizedEmail] = { ...updatedEvent.users[normalizedEmail], userId };
      if (!updatedEvent.users[normalizedEmail].name) {
        updatedEvent.users[normalizedEmail].name = normalizedEmail.split('@')[0];
      }
      await eventService.updateEvent(eventId, updatedEvent);
    }

    return updatedEvent;
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
    const idValidation = validateEventId(eventId);
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
    const event = await eventService.getEvent(eventId);

    // Validate requester is administrator
    if (!eventService.isAdministrator(event, requesterEmail)) {
      throw new Error('Unauthorized: Only administrators can delete administrators');
    }

    // Normalize email (trimming already done above)
    const normalizedEmail = this.normalizeEmail(trimmedEmail);

    // Check if target administrator exists
    if (!event.administrators[normalizedEmail]) {
      throw new Error(`Administrator with email ${normalizedEmail} not found for this event.`);
    }

    // Check if target is owner (prevent deletion)
    if (eventService.isOwner(event, normalizedEmail)) {
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
    await eventService.updateEvent(eventId, event);

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
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!administratorEmail || typeof administratorEmail !== 'string') {
      throw new Error('Administrator email is required');
    }

    try {
      // Get current event (lazy migration happens in getEvent)
      const event = await eventService.getEvent(eventId);

      // Verify administrator (case-insensitive email comparison)
      const normalizedRequestEmail = this.normalizeEmail(administratorEmail);
      if (!eventService.isAdministrator(event, normalizedRequestEmail)) {
        throw new Error('Only the event administrator can regenerate PINs');
      }

      // Generate new PIN
      const newPIN = pinService.generatePIN();
      const now = getCurrentTimestamp();

      // Update event with new PIN
      const updatedEvent = {
        ...event,
        pin: newPIN,
        pinGeneratedAt: now,
        updatedAt: now
      };

      // Persist updated event using updateEvent method
      await eventService.updateEvent(eventId, updatedEvent);

      await pinService.invalidatePINSessions(eventId);

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
   * Delete a single user and all their associated data
   * For the user, deletes: user registration, items, ratings, bookmarks, profile
   * If user is an administrator, also removes from administrators (with owner/last admin protection)
   * @param {string} eventId - Event identifier
   * @param {string} userEmailToDelete - Email of the user to delete
   * @param {string} requesterEmail - Email of the requester (must be owner or administrator)
   * @returns {Promise<{success: boolean, message: string, itemsDeleted: number, ratingsDeleted: number}>} Success response with counts
   * @throws {Error} If validation fails, event not found, requester is not authorized, or user is owner/last admin
   */
  async deleteUser(eventId, userEmailToDelete, requesterEmail) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    if (!userEmailToDelete || typeof userEmailToDelete !== 'string') {
      throw new Error('User email is required');
    }

    if (!requesterEmail || typeof requesterEmail !== 'string') {
      throw new Error('Requester email is required');
    }

    // Get current event
    const event = await eventService.getEvent(eventId);

    // Verify requester is owner or administrator
    const normalizedRequesterEmail = this.normalizeEmail(requesterEmail);
    if (!eventService.isAdministrator(event, normalizedRequesterEmail)) {
      throw new Error('Unauthorized: Only event administrators can delete users');
    }

    // Normalize user email to delete
    const normalizedUserEmail = this.normalizeEmail(userEmailToDelete.trim());

    // Check if user exists
    if (!event.users || !event.users[normalizedUserEmail]) {
      throw new Error(`User with email ${normalizedUserEmail} not found for this event`);
    }

    // Check if user is owner - prevent deletion
    if (eventService.isOwner(event, normalizedUserEmail)) {
      throw new Error('Cannot delete owner: The original administrator cannot be removed');
    }

    // Check if user is an administrator and if this would leave no administrators
    const isUserAdministrator = event.administrators && event.administrators[normalizedUserEmail];
    if (isUserAdministrator) {
      const adminCount = Object.keys(event.administrators).length;
      if (adminCount <= 1) {
        throw new Error('Cannot delete last administrator: At least one administrator must remain');
      }
    }

    // Import services here to avoid circular dependency
    const ratingService = (await import('./RatingService.js')).default;

    let itemsDeleted = 0;
    let ratingsDeleted = 0;

    // Delete items owned by the user
    if (event.items && Array.isArray(event.items)) {
      const itemsToKeep = event.items.filter(item => {
        if (!item.ownerEmail) {
          return true; // Keep items without ownerEmail
        }
        const itemOwnerEmail = this.normalizeEmail(item.ownerEmail);
        if (itemOwnerEmail === normalizedUserEmail) {
          itemsDeleted++;
          return false; // Delete item
        }
        return true; // Keep item
      });
      event.items = itemsToKeep;
    }

    // Delete ratings by the user
    try {
      const allRatings = await ratingService.getRatings(eventId);
      for (const rating of allRatings) {
        const ratingEmail = this.normalizeEmail(rating.email);
        if (ratingEmail === normalizedUserEmail) {
          await dataRepository.deleteRating(eventId, rating.email, rating.itemId);
          ratingsDeleted++;
        }
      }
    } catch (error) {
      // If ratings don't exist or error reading, that's okay
      loggerService.warn(`Error processing ratings during user deletion: ${error.message}`);
    }

    // Delete bookmarks for the user (stored separately in DynamoDB)
    try {
      await dataRepository.deleteBookmarks(eventId, normalizedUserEmail);
    } catch (error) {
      loggerService.warn(`Error deleting bookmarks for user ${normalizedUserEmail}: ${error.message}`);
    }

    // Remove from administrators if user is an administrator
    if (isUserAdministrator) {
      delete event.administrators[normalizedUserEmail];
    }

    // Delete user entry from event.users
    delete event.users[normalizedUserEmail];

    // Update event
    event.updatedAt = getCurrentTimestamp();
    await eventService.updateEvent(eventId, event);

    // Invalidate cached aggregate stats so stale scores are never served
    if (ratingsDeleted > 0) {
      try {
        await dataRepository.deleteDashboardCache(eventId);
        await dataRepository.deleteAllSimilarUsersCache(eventId);
      } catch (error) {
        loggerService.warn(`Error invalidating caches after user deletion: ${error.message}`);
      }
    }

    loggerService.info(`User deleted from event ${eventId} by ${normalizedRequesterEmail}`, {
      eventId,
      requester: normalizedRequesterEmail,
      deletedUser: normalizedUserEmail,
      eventName: event.name,
      itemsDeleted,
      ratingsDeleted,
      wasAdministrator: isUserAdministrator
    });

    return {
      success: true,
      message: `User ${normalizedUserEmail} and all associated data deleted successfully`,
      itemsDeleted,
      ratingsDeleted
    };
  }

  /**
   * Delete all users (excluding administrators) and all their associated data
   * For each user, deletes: user registration, items, ratings, bookmarks, profile
   * @param {string} eventId - Event identifier
   * @param {string} requesterEmail - Email of the requester (must be owner or administrator)
   * @returns {Promise<{success: boolean, message: string, usersDeleted: number}>} Success response with count
   * @throws {Error} If validation fails, event not found, or requester is not authorized
   */
  async deleteAllUsers(eventId, requesterEmail) {
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

    // Verify requester is owner or administrator
    const normalizedRequesterEmail = this.normalizeEmail(requesterEmail);
    if (!eventService.isAdministrator(event, normalizedRequesterEmail)) {
      throw new Error('Unauthorized: Only event administrators can delete users');
    }

    // Get list of administrator emails (to exclude from deletion)
    const administratorEmails = new Set();
    if (event.administrators && typeof event.administrators === 'object') {
      for (const email in event.administrators) {
        administratorEmails.add(this.normalizeEmail(email));
      }
    }

    // Get all users (excluding administrators)
    const usersToDelete = [];
    if (event.users && typeof event.users === 'object') {
      for (const email in event.users) {
        const normalizedEmail = this.normalizeEmail(email);
        if (!administratorEmails.has(normalizedEmail)) {
          usersToDelete.push(normalizedEmail);
        }
      }
    }

    if (usersToDelete.length === 0) {
      return {
        success: true,
        message: 'No users to delete',
        usersDeleted: 0
      };
    }

    // Import services here to avoid circular dependency
    const ratingService = (await import('./RatingService.js')).default;

    // For each user, delete their data:
    // 1. Delete user entry from event.users
    // 2. Delete all items owned by the user
    // 3. Delete all ratings by the user

    let itemsDeleted = 0;
    let ratingsDeleted = 0;

    // Delete items owned by users
    if (event.items && Array.isArray(event.items)) {
      const itemsToKeep = event.items.filter(item => {
        if (!item.ownerEmail) {
          return true; // Keep items without ownerEmail
        }
        const itemOwnerEmail = this.normalizeEmail(item.ownerEmail);
        if (usersToDelete.includes(itemOwnerEmail)) {
          itemsDeleted++;
          return false; // Delete item
        }
        return true; // Keep item
      });
      event.items = itemsToKeep;
    }

    // Delete ratings by users
    try {
      const allRatings = await ratingService.getRatings(eventId);
      for (const rating of allRatings) {
        const ratingEmail = this.normalizeEmail(rating.email);
        if (usersToDelete.includes(ratingEmail)) {
          await dataRepository.deleteRating(eventId, rating.email, rating.itemId);
          ratingsDeleted++;
        }
      }
    } catch (error) {
      // If ratings don't exist or error reading, that's okay
      loggerService.warn(`Error processing ratings during user deletion: ${error.message}`);
    }

    // Delete bookmarks for each user (stored separately in DynamoDB)
    for (const email of usersToDelete) {
      try {
        await dataRepository.deleteBookmarks(eventId, email);
      } catch (error) {
        loggerService.warn(`Error deleting bookmarks for user ${email}: ${error.message}`);
      }
    }

    // Delete user entries from event.users
    for (const email of usersToDelete) {
      if (event.users[email]) {
        delete event.users[email];
      }
    }

    // Update event
    event.updatedAt = getCurrentTimestamp();
    await eventService.updateEvent(eventId, event);

    // Invalidate cached aggregate stats so stale scores are never served
    if (ratingsDeleted > 0) {
      try {
        await dataRepository.deleteDashboardCache(eventId);
        await dataRepository.deleteAllSimilarUsersCache(eventId);
      } catch (error) {
        loggerService.warn(`Error invalidating caches after bulk user deletion: ${error.message}`);
      }
    }

    loggerService.info(`All users deleted for event ${eventId} by ${normalizedRequesterEmail}`, {
      eventId,
      requester: normalizedRequesterEmail,
      eventName: event.name,
      usersDeleted: usersToDelete.length,
      itemsDeleted,
      ratingsDeleted
    });

    return {
      success: true,
      message: `Successfully deleted ${usersToDelete.length} user(s) and all their associated data`,
      usersDeleted: usersToDelete.length,
      itemsDeleted,
      ratingsDeleted
    };
  }

  /**
   * Delete all ratings and bookmarks for an event
   * Orchestrates deletion of ratings, bookmarks, and cache invalidation
   * @param {string} eventId - Event identifier
   * @param {string} requesterEmail - Email of the requester (must be owner or administrator)
   * @returns {Promise<{success: boolean, message: string}>} Success response
   * @throws {Error} If validation fails, event not found, or requester is not authorized
   */
  async deleteAllRatingsAndBookmarks(eventId, requesterEmail) {
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

    // Verify requester is owner or administrator
    const normalizedEmail = this.normalizeEmail(requesterEmail);
    if (!eventService.isAdministrator(event, normalizedEmail)) {
      throw new Error('Unauthorized: Only event administrators can delete ratings and bookmarks');
    }

    // Import ratingService here to avoid circular dependency
    const ratingService = (await import('./RatingService.js')).default;

    // Delete all ratings
    await ratingService.deleteAllRatings(eventId);

    // Delete all bookmarks
    await this.deleteAllBookmarks(eventId);

    // Note: Similar users cache invalidation happens automatically via DynamoDB TTL (30s)

    loggerService.info(`All ratings and bookmarks deleted for event ${eventId} by ${normalizedEmail}`, {
      eventId,
      requester: normalizedEmail,
      eventName: event.name
    });

    return {
      success: true,
      message: 'All ratings and bookmarks deleted successfully'
    };
  }

  /**
   * Delete all bookmarks for all users in an event
   * Deletes all bookmark items stored separately in DynamoDB
   * @param {string} eventId - Event identifier
   * @returns {Promise<void>}
   */
  async deleteAllBookmarks(eventId) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      throw new Error(idValidation.error);
    }

    try {
      // Delete all bookmarks directly from repository
      await dataRepository.deleteAllBookmarks(eventId);
      loggerService.info(`All bookmarks deleted for event ${eventId}`);
    } catch (error) {
      // If event not found, throw with clear message
      if (error.message.includes('not found') || error.message.includes('File not found')) {
        throw new Error(`Event not found: ${eventId}`);
      }
      // Log and re-throw other errors
      loggerService.error(`Error deleting all bookmarks for event ${eventId}: ${error.message}`, error);
      throw error;
    }
  }
}

export default new EventAdminService();
