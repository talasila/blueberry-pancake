/**
 * Check if a user email is an administrator for an event.
 * Supports both the new `administrators` object and legacy `administrator` field.
 */
export function isUserAdmin(userEmail, event) {
  if (!userEmail || !event) return false;
  const normalized = userEmail.toLowerCase();
  if (event.administrators) {
    return Object.keys(event.administrators).some(
      e => e.toLowerCase() === normalized
    );
  }
  return event.administrator?.toLowerCase() === normalized;
}
