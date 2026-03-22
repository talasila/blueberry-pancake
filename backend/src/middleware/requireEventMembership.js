import eventService from '../services/EventService.js';

/**
 * Middleware that verifies the authenticated user is still a member of the event
 * (present in event.users or event.administrators) before allowing write operations.
 *
 * Must be placed AFTER requireAuth (which sets req.user and validates JWT + event access).
 * On success, attaches req.event for downstream handlers to avoid redundant getEvent() calls.
 */
export default async function requireEventMembership(req, res, next) {
  try {
    const eventId = req.params.eventId;
    let email = req.user?.email;

    const event = await eventService.getEvent(eventId);

    // For PIN-auth users with userId but no email, resolve email from users map
    if (!email && req.user?.userId && event?.users) {
      for (const [userEmail, data] of Object.entries(event.users)) {
        if (data.userId === req.user.userId) {
          email = userEmail;
          break;
        }
      }
    }

    if (!eventId || !email) {
      return res.status(403).json({
        error: 'User is not registered for this event',
        code: 'EVENT_MEMBERSHIP_REQUIRED',
      });
    }

    if (!eventService.isEventMember(event, email)) {
      return res.status(403).json({
        error: 'User is not registered for this event',
        code: 'EVENT_MEMBERSHIP_REQUIRED',
      });
    }

    req.event = event;
    // Attach resolved email for downstream handlers (covers PIN-auth userId resolution)
    if (!req.user.email && email) {
      req.user.resolvedEmail = email;
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
