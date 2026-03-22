import eventService from './EventService.js';
import dataRepository from '../data/DynamoDBRepository.js';
import loggerService from '../logging/Logger.js';
import { normalizeEmail as normalizeEmailUtil } from '../utils/emailUtils.js';
import { validateEventId } from '../utils/validators.js';
import { getCurrentTimestamp } from '../utils/timestamps.js';
import { generateUserId } from '../utils/userIdUtils.js';

/**
 * EventMemberService
 * Handles user registration and event membership queries.
 * Depends on core EventService for shared helpers (getEvent, isAdministrator).
 */
class EventMemberService {
  /**
   * Register a user for an event
   * Adds user email to the event's users map if not already registered
   * Users are stored as a map with email as key and registration data as value
   * @param {string} eventId - Event identifier
   * @param {string} email - User email address
   * @param {string} [name] - Optional display name to store with registration
   * @returns {Promise<object>} Registration result including alreadyExists flag
   */
  async registerUser(eventId, email, name = undefined) {
    // Validate event ID format
    const idValidation = validateEventId(eventId);
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

    const normalizedEmail = normalizeEmailUtil(email);
    const registrationTimestamp = getCurrentTimestamp();
    // Pre-generate userId so it's included in the atomic registration
    const newUserId = generateUserId();
    const registrationName = name || normalizedEmail.split('@')[0];

    try {
      // Use atomic registration to prevent concurrent registration race conditions
      // This uses DynamoDB's if_not_exists to safely add users without overwriting
      // Include userId and name in the initial atomic write
      const result = await dataRepository.registerUserAtomic(eventId, normalizedEmail, registrationTimestamp, registrationName, newUserId);

      if (result.registered && !result.alreadyExists) {
        loggerService.info(`User registered for event: ${eventId}, registeredAt: ${registrationTimestamp}`);
      } else {
        loggerService.debug(`User already registered for event: ${eventId}`);
      }

      // For existing users, ensure they have a userId (lazy backfill)
      const event = await eventService.getEvent(eventId);
      const userData = event?.users?.[normalizedEmail];
      let userId = userData?.userId;
      let userName = userData?.name || registrationName;

      if (!userId) {
        // Existing user without userId — backfill userId and name if missing
        userId = generateUserId();
        if (!userName) {
          userName = normalizedEmail.split('@')[0];
        }
        event.users[normalizedEmail] = { ...event.users[normalizedEmail], userId, name: userName };
        await eventService.updateEvent(eventId, event);
      }

      return {
        eventId,
        email: normalizedEmail,
        userId,
        name: userName,
        registered: result.registered && !result.alreadyExists,
        alreadyExists: result.alreadyExists,
        registeredAt: registrationTimestamp
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
   * Ensure a user in an event has a userId. Generate and persist one if missing.
   * Also backfills name from email prefix if missing.
   * @param {object} event - Event object (will be mutated and saved if needed)
   * @param {string} email - Normalized user email
   * @returns {Promise<{userId: string, name: string}>} The user's userId and name
   */
  async ensureUserId(event, email) {
    const normalizedEmail = email.toLowerCase();
    const userData = event.users?.[normalizedEmail];
    if (!userData) return null;

    let userId = userData.userId;
    let userName = userData.name;
    let needsUpdate = false;

    if (!userId) {
      userId = generateUserId();
      event.users[normalizedEmail] = { ...event.users[normalizedEmail], userId };
      needsUpdate = true;
    }
    if (!userName) {
      userName = normalizedEmail.split('@')[0];
      event.users[normalizedEmail] = { ...event.users[normalizedEmail], name: userName };
      needsUpdate = true;
    }

    if (needsUpdate) {
      await eventService.updateEvent(event.eventId, event);
    }

    return { userId, name: userName };
  }

  /**
   * Build an email→{userId, name} lookup map for all users in an event.
   * Generates and persists missing userIds/names via lazy backfill.
   * @param {object} event - Event object
   * @returns {Promise<Map<string, {userId: string, name: string}>>}
   */
  async buildUserIdMap(event) {
    const users = event.users || {};
    const map = new Map();
    let needsUpdate = false;

    for (const [email, userData] of Object.entries(users)) {
      let userId = userData.userId;
      let name = userData.name;

      if (!userId) {
        userId = generateUserId();
        event.users[email] = { ...event.users[email], userId };
        needsUpdate = true;
      }
      if (!name) {
        name = email.split('@')[0];
        event.users[email] = { ...event.users[email], name };
        needsUpdate = true;
      }

      map.set(email, { userId, name });
    }

    if (needsUpdate) {
      await eventService.updateEvent(event.eventId, event);
    }

    return map;
  }

  /**
   * Get all event IDs where user is an administrator
   * @param {string} email - User email address
   * @returns {Promise<Array<string>>} Array of event IDs where user is an administrator
   */
  async getEventsByAdministrator(email) {
    const normalizedEmail = normalizeEmailUtil(email);
    const eventIds = await dataRepository.listEvents();
    const adminEventIds = [];

    for (const eventId of eventIds) {
      try {
        const event = await eventService.getEvent(eventId);
        if (eventService.isAdministrator(event, normalizedEmail)) {
          adminEventIds.push(eventId);
        }
      } catch (error) {
        // Skip events that can't be loaded
        loggerService.warn(`Failed to check admin status for event ${eventId}: ${error.message}`);
      }
    }

    return adminEventIds;
  }

  /**
   * Get event summaries for all events where user is an administrator
   * Returns lightweight projections sorted by createdAt descending (most recent first)
   * @param {string} email - User email address
   * @returns {Promise<Array<{eventId: string, name: string, state: string, createdAt: string}>>}
   */
  async getEventSummariesByAdministrator(email) {
    const normalizedEmail = normalizeEmailUtil(email);
    const eventIds = await dataRepository.listEvents();
    const summaries = [];

    for (const eventId of eventIds) {
      try {
        const event = await eventService.getEvent(eventId);
        if (eventService.isAdministrator(event, normalizedEmail)) {
          summaries.push({
            eventId: event.eventId,
            name: event.name,
            state: event.state,
            theme: event.theme,
            createdAt: event.createdAt
          });
        }
      } catch (error) {
        loggerService.warn(`Failed to load event ${eventId} for summaries: ${error.message}`);
      }
    }

    summaries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return summaries;
  }
}

export default new EventMemberService();
