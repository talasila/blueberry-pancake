import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { logger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeXSRF, getCSRFToken, validateCSRF } from './middleware/xsrfProtection.js';
import apiRouter from './api/index.js';
import { registerTestHelperRoutes } from './api/test-helpers.js';
import configLoader from './config/configLoader.js';
import configValidator from './config/configValidator.js';
import dataRepository from './data/DynamoDBRepository.js';
import loggerService from './logging/Logger.js';

configValidator.validateOrThrow();
await loggerService.initialize();
await loggerService.info('Application starting...', {
  environment: configLoader.get('environment'),
  nodeVersion: process.version,
}).catch(() => {});
await dataRepository.initialize();
configLoader.enableHotReload();

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://challenges.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["https://challenges.cloudflare.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

app.use(cors({
  origin: configLoader.get('frontend.url') || true,
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

const xsrfInitialized = initializeXSRF();
// Always register csrf-token route (returns null when XSRF disabled, for frontend compatibility)
app.get('/api/csrf-token', getCSRFToken);

if (xsrfInitialized) {
  app.use('/api', (req, res, next) => {
    const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!stateChangingMethods.includes(req.method)) return next();
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) return next();
    const exemptPaths = [
      /^\/api\/auth\/otp\//,
      /^\/api\/auth\/logout$/,
      /^\/api\/auth\/refresh$/,
      /^\/api\/events\/[^/]+\/verify-pin$/,
      /^\/api\/test\//,
    ];
    if (exemptPaths.some(p => p.test(req.originalUrl))) return next();
    return validateCSRF(req, res, next);
  });
}

registerTestHelperRoutes(app);
app.use('/api', apiRouter);
app.use(errorHandler);

export default app;
