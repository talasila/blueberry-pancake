import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Public routes (no authentication required)
router.use('/health', healthRouter);
router.use('/auth', authRouter);

// Events routes - some public (verify-pin), some protected (create, get with auth)
import eventsRouter from './events.js';
// POST /events requires auth (handled in events.js)
router.use('/events', eventsRouter);

// Ratings routes - nested under events
import ratingsRouter from './ratings.js';
router.use('/events/:eventId', ratingsRouter);

export default router;
