/**
 * Event guard-rail utilities for start-flow checks (e.g. registered count vs rating slots).
 * Used by EventAdminPage State drawer to show info/warning when starting an event.
 */

/**
 * Gap type when comparing registered item count to available rating slots.
 * @typedef {'zero-registrations' | 'more-slots' | 'fewer-slots' | 'match'} GapType
 */

/**
 * Determines the gap between registered count and available slots for guard-rail messaging.
 * @param {number} registeredCount - Number of registered bottles/items
 * @param {number} availableSlots - Number of rating slots (e.g. numberOfItems - excluded count)
 * @returns {GapType}
 */
export function getGapType(registeredCount, availableSlots) {
  if (registeredCount === 0) return 'zero-registrations';
  if (availableSlots < registeredCount) return 'fewer-slots';
  if (availableSlots > registeredCount) return 'more-slots';
  return 'match';
}
