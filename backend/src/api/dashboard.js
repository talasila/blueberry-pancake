import { Router } from 'express';
import dashboardService from '../services/DashboardService.js';
import eventService from '../services/EventService.js';
import requireAuth from '../middleware/requireAuth.js';
import loggerService from '../logging/Logger.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/events/:eventId/dashboard
 * Get dashboard statistics and item rating summaries
 * 
 * Access control:
 * - Administrators can access at any time, regardless of event state
 * - Regular users can only access when event is in "completed" state
 * 
 * Authentication:
 * - JWT token (required)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate event ID
    const idValidation = eventService.validateEventId(eventId);
    if (!idValidation.valid) {
      return res.status(400).json({
        error: idValidation.error
      });
    }

    // Get event to check state and user permissions
    const event = await eventService.getEvent(eventId);
    if (!event) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    // Get user email from JWT token
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Check if user is administrator
    const isAdmin = eventService.isAdministrator(event, userEmail);

    // Access control: Regular users can only access when event is "completed"
    if (!isAdmin && event.state !== 'completed') {
      return res.status(403).json({
        error: 'Dashboard access is only available when the event is completed'
      });
    }

    // Get dashboard data
    const dashboardData = await dashboardService.getDashboardData(eventId);

    res.json(dashboardData);
  } catch (error) {
    loggerService.error(`Dashboard API error: ${error.message}`, error);
    
    // Handle specific error cases
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    // Generic server error
    res.status(500).json({
      error: 'Failed to retrieve dashboard data'
    });
  }
});

export default router;
