const EVENT_ID_PATTERN = /^[A-Za-z0-9]{8}$/;

/**
 * Validate and normalize an event ID from a URL parameter.
 * Trims whitespace, checks 8-char alphanumeric format, and uppercases.
 * @param {string} eventId - Raw event ID (e.g. from useParams)
 * @returns {string|null} Normalized uppercase event ID, or null if invalid
 */
export function normalizeEventId(eventId) {
  if (!eventId || typeof eventId !== 'string') return null;
  const trimmed = eventId.trim();
  if (!EVENT_ID_PATTERN.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

/**
 * Check whether a string is a valid event ID format (8 alphanumeric chars).
 * @param {string} eventId
 * @returns {boolean}
 */
export function isValidEventId(eventId) {
  return !!eventId && typeof eventId === 'string' && EVENT_ID_PATTERN.test(eventId.trim());
}
