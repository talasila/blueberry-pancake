import loggerService from '../logging/Logger.js';

/**
 * Request logging middleware
 * Logs all incoming requests with method, path, and timestamp
 */
export function logger(req, res, next) {
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  
  // Log request
  loggerService.info(`${method} ${path}`, {
    ip,
    userAgent: req.get('user-agent'),
  });
  
  next();
}
