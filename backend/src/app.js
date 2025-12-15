import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { logger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeXSRF, getCSRFToken } from './middleware/xsrfProtection.js';
import apiRouter from './api/index.js';
import configLoader from './config/configLoader.js';
import configValidator from './config/configValidator.js';
import cacheService from './cache/CacheService.js';
import loggerService from './logging/Logger.js';

// Validate configuration on startup
configValidator.validateOrThrow();

// Initialize logger (must be done early)
await loggerService.initialize();

// Log startup
await loggerService.info('Application starting...', {
  environment: configLoader.get('environment'),
  nodeVersion: process.version,
});

// Initialize cache
cacheService.initialize();

// Load active events into cache at startup
await cacheService.loadActiveEvents();

// Start periodic flush for write-back caching (60s interval)
cacheService.startPeriodicFlush();

// Enable config hot-reload
configLoader.enableHotReload();

const app = express();

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API server
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
// Development: Use explicit frontend URL for cross-origin requests
// Production/Staging: Use same-origin via reverse proxy (origin: true reflects request origin)
app.use(cors({
  origin: configLoader.get('frontend.url') || true,
  credentials: true
}));

// Cookie parser (required for CSRF)
app.use(cookieParser());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(logger);

// Initialize XSRF protection
const xsrfInitialized = initializeXSRF();

// CSRF token endpoint (GET request to obtain token)
if (xsrfInitialized) {
  app.get('/api/csrf-token', getCSRFToken);
}

// Apply CSRF validation to state-changing routes
// Note: Individual routes can use validateCSRF middleware as needed

// API routes
app.use('/api', apiRouter);

// Error handling (must be last)
app.use(errorHandler);

export default app;
