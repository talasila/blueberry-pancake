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
import path from 'path';
import fs from 'fs/promises';
import configLoader from '../config/configLoader.js';

/**
 * Create test event (no auth required)
 * POST /api/test/events
 */
export async function createTestEvent(req, res) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Test endpoints not available in production' 
    });
  }

  try {
    const { eventId: customEventId, name, pin, typeOfItem, adminEmail } = req.body;

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
    
    // Note: EventService returns event with 'eventId', not 'id'
    let eventId = event.eventId;
    
    // If a custom eventId was provided, rename the event directory
    if (customEventId && customEventId !== eventId) {
      const config = configLoader.getConfig();
      const projectRoot = path.resolve(process.cwd(), '..');
      const oldPath = path.join(projectRoot, config.dataDir, 'events', eventId);
      const newPath = path.join(projectRoot, config.dataDir, 'events', customEventId);
      
      try {
        await fs.rename(oldPath, newPath);
        event.eventId = customEventId;
        eventId = customEventId;
        logger.info(`Renamed event directory from ${event.eventId} to ${customEventId}`);
      } catch (renameError) {
        logger.error(`Failed to rename event directory:`, renameError);
        // Continue with generated ID if rename fails
      }
    }
    
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

    // Delete the event directory
    const dataDir = configLoader.get('dataDirectory') || 'data';
    
    // Resolve to absolute path from project root (one level up from backend/)
    const projectRoot = path.resolve(process.cwd(), '..');
    const eventDir = path.resolve(projectRoot, dataDir, 'events', eventId);
    
    logger.info(`Attempting to delete test event directory: ${eventDir}`);
    
    try {
      // First check if directory exists
      try {
        await fs.access(eventDir);
      } catch {
        // Directory doesn't exist
        logger.info(`Event ${eventId} not found (already deleted)`);
        return res.status(200).json({ 
          success: true,
          message: 'Event not found (already deleted)' 
        });
      }
      
      // Delete the directory and all contents
      await fs.rm(eventDir, { recursive: true, force: true });
      
      // Verify deletion
      try {
        await fs.access(eventDir);
        // If we can still access it, deletion failed
        throw new Error('Directory still exists after deletion attempt');
      } catch {
        // Good - directory is gone
        logger.info(`✅ Test event deleted: ${eventId} at ${eventDir}`);
        return res.status(200).json({ 
          success: true,
          message: 'Test event deleted successfully',
          deletedPath: eventDir
        });
      }
    } catch (err) {
      logger.error(`❌ Error deleting event ${eventId}:`, err);
      return res.status(500).json({
        error: 'Failed to delete test event',
        details: err.message,
        path: eventDir
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
 * Body: { email: string, addToUsers: boolean (optional, defaults to false) }
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
    const { email, addToUsers = false } = req.body;

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

    // Generate JWT token with email and eventId
    const token = generateToken({ email, eventId, isAdmin: true });

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
 */
export async function clearCache(req, res) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Test endpoints not available in production' 
    });
  }

  try {
    const cacheService = (await import('../cache/CacheService.js')).default;
    const { type = 'all' } = req.body;

    if (type === 'ratelimit') {
      // Clear only rate limit keys
      const keys = cacheService.keys();
      let cleared = 0;
      keys.forEach(key => {
        if (key.startsWith('ratelimit:')) {
          cacheService.del(key);
          cleared++;
        }
      });
      logger.info(`Cleared ${cleared} rate limit cache entries`);
      res.status(200).json({ 
        success: true,
        cleared,
        message: `Cleared ${cleared} rate limit entries` 
      });
    } else {
      // Clear all cache
      cacheService.flush();
      logger.info('Cleared all cache entries');
      res.status(200).json({ 
        success: true,
        message: 'All cache cleared' 
      });
    }
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ 
      error: 'Failed to clear cache',
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

  logger.info('Test helper endpoints registered (non-production only)');
}

