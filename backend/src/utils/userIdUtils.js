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

/**
 * Find a user's email by their userId in an event's users map.
 * @param {object} event - Event object with users map
 * @param {string} userId - The opaque userId to look up
 * @returns {string|null} The user's email, or null if not found
 */
export function resolveEmailFromUserId(event, userId) {
  if (!userId || !event?.users) return null;
  for (const [email, data] of Object.entries(event.users)) {
    if (data.userId === userId) return email;
  }
  return null;
}

/**
 * Resolve the requesting user's email from a JWT-decoded req.user object.
 * For OTP users, email is directly available. For PIN users, scans the event's users map.
 * @param {object} reqUser - req.user from JWT middleware (has email or userId)
 * @param {object} event - Event object with users map
 * @returns {string|null} The user's email, or null if unresolvable
 */
export function resolveRequestEmail(reqUser, event) {
  if (reqUser?.email) return reqUser.email;
  if (reqUser?.resolvedEmail) return reqUser.resolvedEmail;
  return resolveEmailFromUserId(event, reqUser?.userId);
}
