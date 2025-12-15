/**
 * Email Utility Functions
 * Centralized email validation and normalization utilities
 */

/**
 * Normalize email address (lowercase and trim)
 * @param {string} email - Email address
 * @returns {string} Normalized email address, or empty string if invalid input
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
}

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const normalized = normalizeEmail(email);
  if (normalized.length === 0) {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalized);
}

export default {
  normalizeEmail,
  isValidEmail
};

