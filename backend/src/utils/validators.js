/**
 * Validation utilities for API request parameters
 * Centralizes validation logic to ensure consistency across endpoints
 */

/**
 * Validate event ID format (8 alphanumeric characters)
 * @param {string} eventId - Event identifier to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateEventId(eventId) {
  if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
    return {
      valid: false,
      error: 'Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.'
    };
  }
  return { valid: true };
}

/**
 * Validate item ID format (nanoid, 12 alphanumeric characters)
 * @param {string} itemId - Item identifier to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateItemId(itemId) {
  if (!itemId || typeof itemId !== 'string' || !/^[A-Za-z0-9]{12}$/.test(itemId)) {
    return {
      valid: false,
      error: 'Invalid item ID format. Item ID must be exactly 12 alphanumeric characters.'
    };
  }
  return { valid: true };
}

/**
 * Validate numeric item ID (for assigned item IDs)
 * @param {string|number} itemId - Numeric item ID
 * @returns {{valid: boolean, value?: number, error?: string}} Validation result with parsed value
 */
export function validateNumericItemId(itemId) {
  const itemIdNum = parseInt(itemId, 10);
  if (isNaN(itemIdNum)) {
    return {
      valid: false,
      error: 'Invalid item ID format. Item ID must be a number.'
    };
  }
  return { valid: true, value: itemIdNum };
}

/**
 * Validate required authentication (userEmail from JWT)
 * @param {string} userEmail - User email from req.user
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateAuthentication(userEmail) {
  if (!userEmail) {
    return {
      valid: false,
      error: 'Authentication required'
    };
  }
  return { valid: true };
}

