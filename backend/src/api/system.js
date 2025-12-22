import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import { requireRoot } from '../middleware/requireRoot.js';
import loggerService from '../logging/Logger.js';
import systemService from '../services/SystemService.js';

const router = Router();

// All system routes require authentication AND root access
router.use(requireAuth);
router.use(requireRoot);

/**
 * GET /api/system/events
 * List all events for root admin (paginated)
 * 
 * Query params:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - state: string (filter by state: created, started, paused, completed)
 * - owner: string (filter by owner email substring)
 * - name: string (filter by event name substring)
 */
router.get('/events', async (req, res) => {
  try {
    // Parse query params
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const { state, owner, name } = req.query;

    // Log admin action
    await loggerService.info('Admin action', {
      action: 'VIEW_EVENTS',
      adminEmail: req.user.email,
      filters: { state, owner, name, limit, offset },
      timestamp: new Date().toISOString()
    });

    // Get events from service
    const result = await systemService.listAllEventsForAdmin({
      limit,
      offset,
      state,
      owner,
      name
    });

    res.json(result);
  } catch (error) {
    await loggerService.error('Failed to list events for admin', error);
    res.status(500).json({ error: 'Failed to list events' });
  }
});

/**
 * GET /api/system/events/:eventId
 * Get event details for root admin
 */
router.get('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    // Log admin action
    await loggerService.info('Admin action', {
      action: 'VIEW_DETAILS',
      adminEmail: req.user.email,
      targetEventId: eventId,
      timestamp: new Date().toISOString()
    });

    const details = await systemService.getEventDetailsForAdmin(eventId);
    
    if (!details) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(details);
  } catch (error) {
    await loggerService.error('Failed to get event details for admin', error);
    res.status(500).json({ error: 'Failed to get event details' });
  }
});

/**
 * DELETE /api/system/events/:eventId
 * Delete event as root admin
 */
router.delete('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    // Log admin action BEFORE deletion
    await loggerService.info('Admin action', {
      action: 'DELETE_EVENT',
      adminEmail: req.user.email,
      targetEventId: eventId,
      timestamp: new Date().toISOString()
    });

    const result = await systemService.deleteEventAsAdmin(eventId);

    res.json({
      success: true,
      message: result.wasActive 
        ? 'Active event deleted successfully' 
        : 'Event deleted successfully',
      wasActive: result.wasActive
    });
  } catch (error) {
    if (error.message === 'Event not found') {
      return res.status(404).json({ error: 'Event not found' });
    }
    await loggerService.error('Failed to delete event as admin', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

/**
 * GET /api/system/stats
 * Get system-wide statistics for root admin
 */
router.get('/stats', async (req, res) => {
  try {
    // Log admin action
    await loggerService.info('Admin action', {
      action: 'VIEW_STATS',
      adminEmail: req.user.email,
      timestamp: new Date().toISOString()
    });

    const stats = await systemService.getSystemStats();
    res.json(stats);
  } catch (error) {
    await loggerService.error('Failed to get system stats', error);
    res.status(500).json({ error: 'Failed to get system stats' });
  }
});

export default router;
