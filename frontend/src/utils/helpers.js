/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 */
export function isValidEmailFormat(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Clear success message after a delay
 * @param {function} setter - State setter function
 * @param {number} delay - Delay in milliseconds (default: 3000)
 */
export function clearSuccessMessage(setter, delay = 3000) {
  setTimeout(() => setter(''), delay);
}
