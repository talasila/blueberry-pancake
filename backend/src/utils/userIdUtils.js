import { customAlphabet } from 'nanoid';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ID_LENGTH = 10;
const PREFIX = 'u_';
const USER_ID_PATTERN = /^u_[a-zA-Z0-9]{10}$/;

const nanoid = customAlphabet(ALPHABET, ID_LENGTH);

/**
 * Generate a unique, opaque, event-scoped user identifier.
 * Format: u_ + 10 alphanumeric characters (e.g., u_aBcDeFgHiJ)
 * @returns {string} A new userId
 */
export function generateUserId() {
  return PREFIX + nanoid();
}

/**
 * Validate whether a string is a valid userId.
 * @param {string} id - The string to validate
 * @returns {boolean} True if the string matches the userId pattern
 */
export function isValidUserId(id) {
  return typeof id === 'string' && USER_ID_PATTERN.test(id);
}
