import loggerService from '../logging/Logger.js';

/**
 * Error handling middleware
 * Centralized error handling for Express application
 */
export function errorHandler(err, req, res, next) {
  // Log error
  loggerService.error(err.message, {
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
    statusCode: err.statusCode || err.status || 500,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Send error response
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}
