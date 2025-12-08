import { Router } from 'express';
import eventService from '../services/EventService.js';
import loggerService from '../logging/Logger.js';

const router = Router();

/**
 * POST /api/events
 * Create a new event
 * Requires authentication (JWT token)
 */
router.post('/', async (req, res) => {
  try {
    // Extract administrator email from JWT token (set by jwtAuth middleware)
    const administratorEmail = req.user?.email;

    if (!administratorEmail) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const { name, typeOfItem } = req.body;

    // Create event
    const event = await eventService.createEvent(name, typeOfItem, administratorEmail);

    // Return created event
    res.status(201).json(event);
  } catch (error) {
    // Log full error details for debugging
    loggerService.error(`Event creation error: ${error.message}`, error).catch(() => {});
    if (error.stack) {
      loggerService.error(`Stack trace: ${error.stack}`).catch(() => {});
    }

    // Handle validation errors (400)
    if (error.message.includes('required') || 
        error.message.includes('invalid') || 
        error.message.includes('cannot be empty') ||
        error.message.includes('characters') ||
        error.message.includes('must be')) {
      return res.status(400).json({
        error: error.message
      });
    }

    // Handle configuration errors
    if (error.message.includes('dataDirectory') || error.message.includes('configuration')) {
      return res.status(500).json({
        error: 'Server configuration error. Please contact support.'
      });
    }

    // Handle server errors (500)
    // In development, include more error details
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to create event. Please try again.',
      ...(isDevelopment && { details: error.message, stack: error.stack })
    });
  }
});

/**
 * GET /api/events/:eventId
 * Retrieve event by ID
 * Requires authentication (JWT token)
 */
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate event ID format before processing (8-character alphanumeric)
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      return res.status(400).json({
        error: 'Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.'
      });
    }

    // Get event using EventService
    const event = await eventService.getEvent(eventId);

    // Return event data
    res.json(event);
  } catch (error) {
    // Log full error details for debugging
    loggerService.error(`Event retrieval error: ${error.message}`, error).catch(() => {});
    if (error.stack) {
      loggerService.error(`Stack trace: ${error.stack}`).catch(() => {});
    }

    // Handle event not found (404)
    if (error.message.includes('not found') || error.message.includes('Event not found')) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    // Handle validation errors (400)
    if (error.message.includes('Invalid event ID format') || 
        error.message.includes('Event ID is required')) {
      return res.status(400).json({
        error: error.message
      });
    }

    // Handle server errors (500)
    // In development, include more error details
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to retrieve event. Please try again.',
      ...(isDevelopment && { details: error.message, stack: error.stack })
    });
  }
});

export default router;
