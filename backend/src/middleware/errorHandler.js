import loggerService from '../logging/Logger.js';
import { isDevelopment } from '../utils/environment.js';

/**
 * Error handling middleware
 * Centralized error handling for Express application
 */
export function errorHandler(err, req, res, next) {
  const dev = isDevelopment();
  loggerService.error(err.message, {
    stack: dev ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip || req.socket?.remoteAddress || 'unknown',
    statusCode: err.statusCode || err.status || 500,
  }).catch(() => {});

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    ...(dev && { stack: err.stack })
  });
}
