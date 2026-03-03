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
    const email = req.user?.email;

    if (!eventId || !email) {
      return res.status(403).json({
        error: 'User is not registered for this event',
        code: 'EVENT_MEMBERSHIP_REQUIRED',
      });
    }

    const event = await eventService.getEvent(eventId);
    if (!eventService.isEventMember(event, email)) {
      return res.status(403).json({
        error: 'User is not registered for this event',
        code: 'EVENT_MEMBERSHIP_REQUIRED',
      });
    }

    req.event = event;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
