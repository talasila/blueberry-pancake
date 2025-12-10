import { Router } from 'express';
import dashboardService from '../services/DashboardService.js';
import eventService from '../services/EventService.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import requirePIN from '../middleware/requirePIN.js';
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
 * - JWT token (for administrators)
 * - PIN session (for regular users)
 */
router.get('/', async (req, res) => {
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

    // Extract user email from JWT token (if available)
    let userEmail = null;
    let isAdmin = false;

    // Try to get user email from JWT token
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          userEmail = payload.email;
        }
      }
    } catch (error) {
      // JWT parsing failed, continue with PIN authentication check
    }

    // Check if user is administrator
    if (userEmail) {
      isAdmin = eventService.isAdministrator(event, userEmail);
    }

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
