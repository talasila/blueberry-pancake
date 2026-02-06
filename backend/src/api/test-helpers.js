/**
 * Test Helper API Endpoints
 * 
 * These endpoints are ONLY available in non-production environments
 * and allow tests to create/delete test data without authentication.
 * 
 * DO NOT USE IN PRODUCTION!
 */

import EventService from '../services/EventService.js';
import logger from '../logging/Logger.js';
import { generateToken } from '../middleware/jwtAuth.js';
import configLoader from '../config/configLoader.js';
import dataRepository from '../data/DynamoDBRepository.js';
import pinService from '../services/PINService.js';

/**
 * Reset the test event counter (kept for backward compatibility, but no-op now)
 * POST /api/test/reset-counter
 * 
 * Note: With DynamoDB, we use generated event IDs directly without TEST#### renaming.
 */
export async function resetTestCounter(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Test endpoints not available in production' 
    });
  }
  
  logger.info('Test counter reset requested (no-op with DynamoDB)');
  res.status(200).json({ success: true, message: 'Counter reset (no-op with DynamoDB)' });
}

/**
 * Create test event (no auth required)
 * POST /api/test/events
 * 
 * Creates events with generated IDs (no TEST#### renaming needed with DynamoDB)
 */
export async function createTestEvent(req, res) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Test endpoints not available in production' 
    });
  }

  try {
    const { name, pin, typeOfItem, adminEmail } = req.body;

    // Validate required fields
    if (!name || !pin) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, pin' 
      });
    }

    // Create the event - it will have a generated ID
    const event = await EventService.createEvent(
      name,
      typeOfItem || 'wine',
      adminEmail || 'test@example.com'
    );
    
    const eventId = event.eventId;
    
    // Update event with test-specific fields and custom PIN
    event._testData = true;
    event._createdBy = 'test-suite';
    event.pin = pin;
    
    logger.info(`Updating event ${eventId} with custom PIN: ${pin}`);
    
    // Save with updated PIN
    try {
      await EventService.updateEvent(eventId, event);
      logger.info(`Test event created: ${eventId} with PIN: ${event.pin}`);
    } catch (updateError) {
      logger.error(`Failed to update event ${eventId}:`, updateError);
      throw new Error(`Event created but failed to set custom PIN: ${updateError.message}`);
    }

    res.status(201).json({ 
      success: true, 
      event: event,
      eventId: eventId,
      pin: event.pin,
      message: 'Test event created successfully' 
    });
  } catch (error) {
    logger.error('Error creating test event:', error);
    res.status(500).json({ 
      error: 'Failed to create test event',
      details: error.message 
    });
  }
}

/**
 * Delete test event (no auth required)
 * DELETE /api/test/events/:eventId
 */
export async function deleteTestEvent(req, res) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Test endpoints not available in production' 
    });
  }

  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ error: 'Event ID required' });
    }

    logger.info(`Attempting to delete test event: ${eventId}`);
    
    try {
      // Check if event exists
      const exists = await dataRepository.eventExists(eventId);
      if (!exists) {
        // Event doesn't exist, still invalidate PIN sessions to be safe
        await pinService.invalidatePINSessions(eventId);
        
        logger.info(`Event ${eventId} not found (already deleted)`);
        return res.status(200).json({ 
          success: true,
          message: 'Event not found (already deleted)' 
        });
      }
      
      // Invalidate PIN sessions for this event
      await pinService.invalidatePINSessions(eventId);
      
      // Delete event from DynamoDB (config and all ratings)
      await dataRepository.deleteEvent(eventId);
      
      logger.info(`✅ Test event deleted: ${eventId}`);
      return res.status(200).json({ 
        success: true,
        message: 'Test event deleted successfully'
      });
    } catch (err) {
      logger.error(`❌ Error deleting event ${eventId}:`, err);
      return res.status(500).json({
        error: 'Failed to delete test event',
        details: err.message
      });
    }
  } catch (error) {
    logger.error('Error deleting test event:', error);
    res.status(500).json({ 
      error: 'Failed to delete test event',
      details: error.message 
    });
  }
}

/**
 * Delete all test events (cleanup utility)
 * DELETE /api/test/events
 */
export async function deleteAllTestEvents(req, res) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Test endpoints not available in production' 
    });
  }

  try {
    // Get all events and filter for test events
    const events = await EventService.getAllEvents();
    const testEvents = events.filter(e => e._testData || e._createdBy === 'test-suite');

    // Delete all test events
    for (const event of testEvents) {
      await EventService.deleteEvent(event.id);
    }

    logger.info(`Deleted ${testEvents.length} test events`);

    res.status(200).json({ 
      success: true,
      deletedCount: testEvents.length,
      message: `Deleted ${testEvents.length} test events` 
    });
  } catch (error) {
    logger.error('Error deleting test events:', error);
    res.status(500).json({ 
      error: 'Failed to delete test events',
      details: error.message 
    });
  }
}

/**
 * Add admin to event and generate JWT token (no auth required)
 * POST /api/test/events/:eventId/add-admin
 * Body: { email: string, addToUsers: boolean (optional, defaults to true to match production behavior) }
 * Returns: { token: string, success: true }
 */
export async function addAdminAndGenerateToken(req, res) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Test endpoints not available in production' 
    });
  }

  try {
    const { eventId } = req.params;
    const { email, addToUsers = true } = req.body;

    if (!eventId || !email) {
      return res.status(400).json({ 
        error: 'Event ID and email are required' 
      });
    }

    // Get the event
    const event = await EventService.getEvent(eventId);
    
    if (!event) {
      return res.status(404).json({ 
        error: 'Event not found' 
      });
    }

    // Add email as administrator if not already
    if (!event.administrators) {
      event.administrators = {};
    }
    
    if (!event.administrators[email]) {
      event.administrators[email] = {
        assignedAt: new Date().toISOString(),
        owner: false
      };
      
      // Optionally add to users (only if addToUsers is true)
      if (addToUsers) {
        if (!event.users) {
          event.users = {};
        }
        if (!event.users[email]) {
          event.users[email] = {
            registeredAt: new Date().toISOString()
          };
        }
      }
      
      // Update the event
      await EventService.updateEvent(eventId, event);
      logger.info(`Added ${email} as administrator to test event ${eventId} (addToUsers: ${addToUsers})`);
    }

    // Generate JWT token with email and event access
    const token = generateToken({ email, events: [eventId] });

    res.status(200).json({ 
      success: true,
      token,
      message: 'Admin added and token generated' 
    });
  } catch (error) {
    logger.error('Error adding admin and generating token:', error);
    res.status(500).json({ 
      error: 'Failed to add admin and generate token',
      details: error.message 
    });
  }
}

/**
 * Clear cache and rate limits (development utility)
 * POST /api/test/clear-cache
 * Optional body: { type: 'ratelimit' | 'all' }
 * 
 * Note: With DynamoDB, rate limits use TTL for automatic expiration.
 * This endpoint is kept for backward compatibility but is mostly a no-op.
 */
export async function clearCache(req, res) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Test endpoints not available in production' 
    });
  }

  try {
    const { type = 'all' } = req.body;

    // With DynamoDB, rate limits and caches use TTL for automatic expiration.
    // There's no in-memory cache to clear anymore.
    // This endpoint is kept for backward compatibility.
    
    logger.info(`Cache clear requested (type: ${type}) - DynamoDB uses TTL for automatic expiration`);
    
    res.status(200).json({ 
      success: true,
      message: 'DynamoDB uses TTL for automatic cache/rate-limit expiration. No manual clearing needed.'
    });
  } catch (error) {
    logger.error('Error in clear cache handler:', error);
    res.status(500).json({ 
      error: 'Failed to process cache clear request',
      details: error.message 
    });
  }
}

/**
 * Generate root admin JWT token (no auth required)
 * POST /api/test/root-token
 * Body: { email: string }
 * Returns: { token: string, success: true }
 * 
 * Note: The email MUST be in the rootAdmins config array for actual root access.
 * This endpoint only generates the token, it does NOT add the email to rootAdmins.
 */
export async function generateRootToken(req, res) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Test endpoints not available in production' 
    });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    // Check if email is in rootAdmins
    const isRoot = configLoader.isRootAdmin(email);
    if (!isRoot) {
      logger.warn(`Token generated for ${email} but NOT in rootAdmins config`);
    }

    // Generate JWT token with email
    const token = generateToken({ email, events: [] });

    res.status(200).json({ 
      success: true,
      token,
      isRootAdmin: isRoot,
      message: isRoot 
        ? 'Root admin token generated' 
        : 'Token generated but email is NOT in rootAdmins config'
    });
  } catch (error) {
    logger.error('Error generating root token:', error);
    res.status(500).json({ 
      error: 'Failed to generate root token',
      details: error.message 
    });
  }
}

/**
 * Register test helper routes
 */
export function registerTestHelperRoutes(app) {
  // Only register in non-production
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  app.post('/api/test/events', createTestEvent);
  app.delete('/api/test/events/:eventId', deleteTestEvent);
  app.delete('/api/test/events', deleteAllTestEvents);
  app.post('/api/test/events/:eventId/add-admin', addAdminAndGenerateToken);
  app.post('/api/test/clear-cache', clearCache);
  app.post('/api/test/reset-counter', resetTestCounter);
  app.post('/api/test/root-token', generateRootToken);

  logger.info('Test helper endpoints registered (non-production only)');
}

