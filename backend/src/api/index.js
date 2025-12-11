import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Public routes (no authentication required)
router.use('/health', healthRouter);
router.use('/auth', authRouter);

// Quotes route - public endpoint for quotes database
import quotesRouter from './quotes.js';
router.use('/quotes', quotesRouter);

// Events routes - some public (verify-pin), some protected (create, get with auth)
import eventsRouter from './events.js';
// POST /events requires auth (handled in events.js)
router.use('/events', eventsRouter);

// Ratings routes - nested under events
import ratingsRouter from './ratings.js';
router.use('/events/:eventId', ratingsRouter);

// Dashboard routes - nested under events
import dashboardRouter from './dashboard.js';
router.use('/events/:eventId/dashboard', dashboardRouter);

// Similar users routes - nested under events
import similarUsersRouter from './similarUsers.js';
router.use('/events/:eventId', similarUsersRouter);

// Items routes - nested under events
import itemsRouter from './items.js';
router.use('/events/:eventId/items', itemsRouter);

export default router;
