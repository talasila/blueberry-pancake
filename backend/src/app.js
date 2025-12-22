import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import statusMonitor from 'express-status-monitor';
import { logger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeXSRF, getCSRFToken, validateCSRF } from './middleware/xsrfProtection.js';
import apiRouter from './api/index.js';
import { registerTestHelperRoutes } from './api/test-helpers.js';
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

// Status monitor for real-time server health dashboard at /status
// Must be added before other middleware
app.use(statusMonitor({
  title: 'Blueberry Pancake Status',
  path: '/status',
  spans: [
    { interval: 1, retention: 60 },      // 1 second intervals, 60 data points (1 min)
    { interval: 5, retention: 60 },      // 5 second intervals, 60 data points (5 min)
    { interval: 15, retention: 60 },     // 15 second intervals, 60 data points (15 min)
    { interval: 60, retention: 60 },     // 1 minute intervals, 60 data points (1 hour)
  ],
  chartVisibility: {
    cpu: true,
    mem: true,
    load: true,
    heap: true,
    responseTime: true,
    rps: true,
    statusCodes: true,
  },
}));

// Security headers with helmet
// Note: /status page needs relaxed CSP for inline scripts/styles
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for /status dashboard
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"], // WebSocket for /status real-time updates
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

// Apply CSRF validation to state-changing routes (POST, PUT, PATCH, DELETE)
// 
// CSRF protection is needed for requests that use cookies for authentication,
// because browsers automatically send cookies with cross-site requests.
// 
// Requests with Bearer tokens in Authorization header are exempt because:
// - Cross-site requests cannot add custom Authorization headers (CORS blocks them)
// - The explicit Bearer token proves it's an intentional API call, not a blind CSRF attack
// - This is a common industry pattern for API authentication
//
// Exempt routes (cannot have CSRF tokens):
// - /api/auth/otp/* - Pre-authentication endpoints
// - /api/events/:eventId/verify-pin - Public PIN verification
// - /api/test/* - Test helper endpoints (non-production only)
if (xsrfInitialized) {
  app.use('/api', (req, res, next) => {
    // Only apply to state-changing methods
    const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!stateChangingMethods.includes(req.method)) {
      return next();
    }

    // Skip CSRF for requests with Bearer token in Authorization header
    // These requests are not vulnerable to CSRF because browsers cannot
    // add custom Authorization headers in cross-site requests
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return next();
    }

    // Exempt routes that cannot have CSRF tokens (pre-auth or public)
    const exemptPaths = [
      /^\/api\/auth\/otp\//,         // OTP request/verify (pre-auth)
      /^\/api\/auth\/logout$/,       // Logout (stateless, low risk)
      /^\/api\/auth\/refresh$/,      // Token refresh (may occur before CSRF token obtained)
      /^\/api\/events\/[^/]+\/verify-pin$/, // Public PIN verification
      /^\/api\/test\//,              // Test endpoints (non-production)
    ];

    const isExempt = exemptPaths.some(pattern => pattern.test(req.originalUrl));
    if (isExempt) {
      return next();
    }

    // Apply CSRF validation for cookie-based authentication
    return validateCSRF(req, res, next);
  });
}

// Test helper routes (non-production only)
registerTestHelperRoutes(app);

// API routes
app.use('/api', apiRouter);

// Error handling (must be last)
app.use(errorHandler);

export default app;
