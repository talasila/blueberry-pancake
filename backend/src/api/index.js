import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Public routes (no authentication required)
router.use('/health', healthRouter);
router.use('/auth', authRouter);

// Protected routes (authentication required)
// All routes below this point require authentication
// Future API routes will be added here and will automatically be protected
// router.use('/events', requireAuth, eventsRouter);

export default router;
