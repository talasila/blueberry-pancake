import { Router } from 'express';
import dashboardService from '../services/DashboardService.js';
import eventService from '../services/EventService.js';
import requireAuth from '../middleware/requireAuth.js';
import { validateEventId } from '../utils/validators.js';
import { resolveEmailFromUserId } from '../utils/userIdUtils.js';
import { handleApiError, badRequestError, unauthorizedError, forbiddenError } from '../utils/apiErrorHandler.js';

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

    const idValidation = validateEventId(eventId);
    if (!idValidation.valid) {
      return badRequestError(res, idValidation.error);
    }

    const event = await eventService.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Resolve user email for admin check (supports both OTP and PIN auth)
    let userEmail = req.user?.email;
    if (!userEmail && req.user?.userId && event?.users) {
      userEmail = resolveEmailFromUserId(event, req.user.userId);
    }
    if (!userEmail) {
      return unauthorizedError(res, 'Authentication required');
    }

    const isAdmin = eventService.isAdministrator(event, userEmail);

    if (!isAdmin && event.state !== 'completed') {
      return forbiddenError(res, 'Dashboard access is only available when the event is completed');
    }

    const dashboardData = await dashboardService.getDashboardData(eventId);
    res.json(dashboardData);
  } catch (error) {
    return handleApiError(res, error, 'retrieve dashboard data');
  }
});

export default router;
