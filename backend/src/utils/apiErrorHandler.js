/**
 * Centralized API error handling utilities
 * Provides consistent error response formatting and classification
 */

import loggerService from '../logging/Logger.js';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Send a standardized error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message for client
 * @param {Error} [error] - Original error object (for dev details)
 * @returns {object} Express response
 */
export function errorResponse(res, statusCode, message, error = null) {
  const response = { error: message };
  if (isDevelopment && error) {
    response.details = error.message;
    if (error.stack) {
      response.stack = error.stack;
    }
  }
  return res.status(statusCode).json(response);
}

/**
 * Send a 400 Bad Request response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @returns {object} Express response
 */
export function badRequestError(res, message) {
  return res.status(400).json({ error: message });
}

/**
 * Send a 401 Unauthorized response
 * @param {object} res - Express response object
 * @param {string} [message='Authentication required'] - Error message
 * @returns {object} Express response
 */
export function unauthorizedError(res, message = 'Authentication required') {
  return res.status(401).json({ error: message });
}

/**
 * Send a 403 Forbidden response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @returns {object} Express response
 */
export function forbiddenError(res, message) {
  return res.status(403).json({ error: message });
}

/**
 * Send a 404 Not Found response
 * @param {object} res - Express response object
 * @param {string} [message='Resource not found'] - Error message
 * @returns {object} Express response
 */
export function notFoundError(res, message = 'Resource not found') {
  return res.status(404).json({ error: message });
}

/**
 * Send a 409 Conflict response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {object} [additionalData] - Additional data to include (e.g., currentState)
 * @returns {object} Express response
 */
export function conflictError(res, message, additionalData = {}) {
  return res.status(409).json({ error: message, ...additionalData });
}

/**
 * Send a 429 Too Many Requests response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @returns {object} Express response
 */
export function rateLimitError(res, message) {
  return res.status(429).json({ error: message });
}

/**
 * Send a 500 Internal Server Error response
 * @param {object} res - Express response object
 * @param {string} message - User-friendly error message
 * @param {Error} [error] - Original error object
 * @returns {object} Express response
 */
export function serverError(res, message, error = null) {
  return errorResponse(res, 500, message, error);
}

/**
 * Classify and handle API errors based on error message patterns
 * This provides a centralized way to handle common error patterns
 * 
 * @param {object} res - Express response object
 * @param {Error} error - The error that occurred
 * @param {string} context - Context description (e.g., 'create event', 'get items')
 * @returns {object} Express response
 */
export function handleApiError(res, error, context = 'process request') {
  const message = error.message || 'An error occurred';
  
  // Log the error
  loggerService.error(`${context} error: ${message}`, error).catch(() => {});

  // Rate limiting errors (429)
  if (message.includes('Too many attempts')) {
    return rateLimitError(res, message);
  }

  // Optimistic locking conflicts (409)
  if (message.includes('state has changed') || error.code === 'OPTIMISTIC_LOCK_CONFLICT') {
    return conflictError(res, message, {
      currentState: error.currentState,
      currentUpdatedAt: error.currentUpdatedAt
    });
  }

  // Duplicate/conflict errors (409)
  if (message.includes('already assigned') || message.includes('already exists')) {
    return conflictError(res, message);
  }

  // Not found errors (404)
  if (message.includes('not found') || message.includes('Event not found')) {
    return notFoundError(res, message.includes('Event') ? 'Event not found' : message);
  }

  // Authorization errors (403)
  if (message.includes('Unauthorized') || 
      message.includes('administrator') || 
      message.includes('owner') ||
      message.includes('Only event administrators') ||
      message.includes('Only the item owner') ||
      message.includes('not allowed when event is in')) {
    return forbiddenError(res, message);
  }

  // Validation errors (400)
  if (message.includes('required') || 
      message.includes('Invalid') ||
      message.includes('invalid') ||
      message.includes('must be') ||
      message.includes('format') ||
      message.includes('cannot be') ||
      message.includes('characters') ||
      message.includes('exceed') ||
      message.includes('between') ||
      message.includes('excluded') ||
      message.includes('not in started state') ||
      message.includes('not available') ||
      message.includes('can only be changed when')) {
    return badRequestError(res, message);
  }

  // Configuration errors (500 with specific message)
  if (message.includes('dataDirectory') || message.includes('configuration')) {
    return serverError(res, 'Server configuration error. Please contact support.', error);
  }

  // Default: server error (500)
  return serverError(res, `Failed to ${context}. Please try again.`, error);
}

