import eventService from './EventService.js';
import dataRepository from '../data/DynamoDBRepository.js';
import loggerService from '../logging/Logger.js';
import { normalizeEmail as normalizeEmailUtil } from '../utils/emailUtils.js';
import { validateEventId } from '../utils/validators.js';
import { getCurrentTimestamp } from '../utils/timestamps.js';

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
   * @returns {Promise<object>} Updated event with user registered
   */
  async registerUser(eventId, email) {
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

    try {
      // Use atomic registration to prevent concurrent registration race conditions
      // This uses DynamoDB's if_not_exists to safely add users without overwriting
      const result = await dataRepository.registerUserAtomic(eventId, normalizedEmail, registrationTimestamp);

      if (result.registered && !result.alreadyExists) {
        loggerService.info(`User registered for event: ${eventId}, email: ${normalizedEmail}, registeredAt: ${registrationTimestamp}`);
      } else {
        loggerService.debug(`User already registered for event: ${eventId}, email: ${normalizedEmail}`);
      }

      return {
        eventId,
        email: normalizedEmail,
        registered: result.registered && !result.alreadyExists,
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
